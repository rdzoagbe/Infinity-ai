from pathlib import Path
import json
import logging
import shutil
import time
from datetime import datetime
import httpx
import aiofiles
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .analysis_status import analysis_capabilities
from .audio import clean_full_mix_with_ffmpeg, clean_vocals_with_ffmpeg, enhance_mix_with_ffmpeg, full_audio_analysis, generate_prompt_sound, has_demucs, has_ffmpeg, mix_vocal_beat_with_ffmpeg, read_basic_audio_metadata, render_master_with_ffmpeg, render_style_preview_with_ffmpeg, separate_stems_with_demucs, separate_stems_with_ffmpeg
from .auth import CurrentUser, current_user, owns, rate_limit, sign_path, verify_signed_path
from .config import get_settings
from .elite_engine import build_elite_engineering_report
from .models import AiAnalyzeRequest, AnalyzeRequest, CleanVocalsRequest, EnhanceMixRequest, JobType, MixVocalBeatRequest, ProcessRequest, ProjectCreateRequest, SoundGenerateRequest, StylePreviewRequest, TransformStyleRequest
from .store import FILES, JOBS, PROJECTS, SOUND_ASSETS, audit, complete_job, create_job, fail_job, load_store, make_id, save_store, update_job_progress, user_storage_bytes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("infinity.api")


def dl(file_id: str, asset_type: str) -> str:
    """Build a signed, expiring download path for a file asset."""
    return sign_path(f"/api/v1/files/{file_id}/download/{asset_type}")

STYLE_PROMPTS = {
    "Afrobeat": "Afrobeat music, warm low-mids, rhythmic guitar, talking drum, bass groove, African percussion",
    "Trap": "Trap music, 808 bass, crisp hi-hats, dark atmospheric pads, heavy bass, modern hip hop",
    "Drill": "UK Drill music, sliding 808, dark eerie melody, aggressive, heavy sub-bass",
    "House": "House music, four-on-the-floor kick, deep bassline, soulful chords, electronic dance",
    "Gospel": "Gospel music, Hammond organ chords, uplifting choir, warm bass, inspirational worship",
    "Cinematic": "Cinematic orchestral music, strings ensemble, epic brass, emotional dramatic score",
    "Soul": "Soul R&B music, warm Rhodes piano, smooth bass, groovy drums, soulful",
    "Custom AI adaptive": "Modern pop music, clean mix, punchy drums, warm bass, radio-ready",
    "Experimental": "Experimental electronic music, unique textures, creative sound design, avant-garde",
}

settings = get_settings()
app = FastAPI(title="Infinity AI Audio Backend", version="10.0.0", description="FastAPI backend for Infinity AI music production.")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def on_startup():
    load_store()
    cleanup_expired_files()


def cleanup_expired_files() -> None:
    """Delete file workspaces older than the retention window."""
    ttl_seconds = settings.infinity_file_ttl_days * 86400
    now = time.time()
    removed = 0
    for file_id, record in list(FILES.items()):
        workspace = Path(record.get("workspace", ""))
        try:
            age = now - workspace.stat().st_mtime if workspace.exists() else None
        except OSError:
            age = None
        if age is not None and age > ttl_seconds:
            shutil.rmtree(workspace, ignore_errors=True)
            FILES.pop(file_id, None)
            removed += 1
    if removed:
        save_store()
        logger.info("Expired-file cleanup removed %d workspaces", removed)


def file_workspace(file_id: str) -> Path:
    root = settings.storage_path / file_id
    for folder in ("original", "analysis", "renders", "stems", "exports"):
        (root / folder).mkdir(parents=True, exist_ok=True)
    return root


def sound_workspace() -> Path:
    root = settings.storage_path / "generated-sounds"
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_owned_file(file_id: str, user: CurrentUser) -> dict:
    file_data = FILES.get(file_id)
    if not owns(file_data, user):
        raise HTTPException(status_code=404, detail="File not found")
    return file_data


def get_owned_sound(asset_id: str, user: CurrentUser) -> dict:
    asset = SOUND_ASSETS.get(asset_id)
    if not owns(asset, user):
        raise HTTPException(status_code=404, detail="Sound asset not found")
    return asset


@app.get("/")
def root():
    return {"name": "Infinity AI Audio Backend", "version": "10.0.0", "status": "online", "ffmpeg_available": has_ffmpeg(), "demucs_available": has_demucs(), "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "version": "10.0.0", "environment": settings.infinity_env, "ffmpeg_available": has_ffmpeg(), "demucs_available": has_demucs()}


@app.get("/api/v1/analysis/capabilities")
def get_analysis_capabilities():
    return analysis_capabilities()


@app.post("/api/v1/projects")
def create_project(payload: ProjectCreateRequest, user: CurrentUser = Depends(current_user)):
    project_id = make_id("project")
    project = {"project_id": project_id, "user_id": user.user_id, "title": payload.title, "artist": payload.artist, "genre": payload.genre, "status": payload.status, "notes": payload.notes, "files": [], "created_at": datetime.utcnow().isoformat()}
    PROJECTS[project_id] = project
    save_store()
    audit("project.create", user.user_id, project_id=project_id)
    return project


@app.get("/api/v1/projects")
def list_projects(user: CurrentUser = Depends(current_user)):
    return {"projects": [p for p in PROJECTS.values() if owns(p, user)]}


@app.delete("/api/v1/projects/{project_id}")
def delete_project(project_id: str, user: CurrentUser = Depends(current_user)):
    project = PROJECTS.get(project_id)
    if not owns(project, user):
        raise HTTPException(status_code=404, detail="Project not found")
    PROJECTS.pop(project_id, None)
    save_store()
    audit("project.delete", user.user_id, project_id=project_id)
    return {"deleted": project_id}


ALLOWED_UPLOAD_SUFFIXES = {".mp3", ".wav", ".flac", ".zip", ".m4a", ".aac", ".ogg", ".webm"}

# Magic-byte signatures per container. m4a/aac/webm/zip share generic containers,
# so unknown-but-plausible bytes only fail for formats with unambiguous headers.
_MAGIC = {
    ".mp3": (b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"\xff\xfa"),
    ".wav": (b"RIFF",),
    ".flac": (b"fLaC",),
    ".ogg": (b"OggS",),
    ".zip": (b"PK\x03\x04", b"PK\x05\x06"),
}


def _magic_ok(suffix: str, head: bytes) -> bool:
    sigs = _MAGIC.get(suffix)
    if not sigs:
        return True
    return any(head.startswith(sig) for sig in sigs)


@app.post("/api/v1/audio/upload")
async def upload_audio(file: UploadFile = File(...), user: CurrentUser = Depends(rate_limit)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    quota_bytes = settings.infinity_max_user_storage_mb * 1024 * 1024
    used = user_storage_bytes(user.user_id)
    if used >= quota_bytes:
        raise HTTPException(status_code=413, detail="Storage quota exceeded — delete old files first")

    file_id = make_id("file")
    workspace = file_workspace(file_id)
    stored_path = workspace / "original" / f"original{suffix}"
    size = 0
    head = b""
    try:
        async with aiofiles.open(stored_path, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                if not head:
                    head = chunk[:16]
                    if not _magic_ok(suffix, head):
                        raise HTTPException(status_code=400, detail="File content does not match its extension")
                size += len(chunk)
                if size > settings.infinity_max_upload_mb * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="File exceeds upload limit")
                if used + size > quota_bytes:
                    raise HTTPException(status_code=413, detail="Storage quota exceeded — delete old files first")
                await out.write(chunk)
    except HTTPException:
        shutil.rmtree(workspace, ignore_errors=True)
        raise

    metadata = read_basic_audio_metadata(stored_path) if suffix != ".zip" else {"package": "stem_zip", "note": "ZIP packages are stored but never extracted server-side.", "ffmpeg_available": has_ffmpeg(), "demucs_available": has_demucs()}
    record = {"file_id": file_id, "user_id": user.user_id, "filename": file.filename, "content_type": file.content_type, "size_bytes": size, "stored_path": str(stored_path), "workspace": str(workspace), "metadata": metadata, "created_at": datetime.utcnow().isoformat(), "downloads": {"original": dl(file_id, "original")}}
    FILES[file_id] = record
    save_store()
    audit("file.upload", user.user_id, file_id=file_id, size_bytes=size)
    job = create_job(JobType.upload, user_id=user.user_id, message="Upload complete", result={"file": record})
    return {"file": record, "job": job}


@app.delete("/api/v1/files/{file_id}")
def delete_file(file_id: str, user: CurrentUser = Depends(current_user)):
    file_data = get_owned_file(file_id, user)
    shutil.rmtree(Path(file_data["workspace"]), ignore_errors=True)
    FILES.pop(file_id, None)
    save_store()
    audit("file.delete", user.user_id, file_id=file_id)
    return {"deleted": file_id}


@app.delete("/api/v1/account")
def delete_account_data(user: CurrentUser = Depends(current_user)):
    """Delete every record and stored file belonging to the requesting user."""
    removed_files = 0
    for fid, record in list(FILES.items()):
        if record.get("user_id") == user.user_id:
            shutil.rmtree(Path(record.get("workspace", "")), ignore_errors=True)
            FILES.pop(fid, None)
            removed_files += 1
    removed_projects = sum(1 for pid, p in list(PROJECTS.items()) if p.get("user_id") == user.user_id and PROJECTS.pop(pid, None))
    for aid, asset in list(SOUND_ASSETS.items()):
        if asset.get("user_id") == user.user_id:
            Path(asset.get("path", "/nonexistent")).unlink(missing_ok=True)
            SOUND_ASSETS.pop(aid, None)
    for jid, job in list(JOBS.items()):
        if job.user_id == user.user_id:
            JOBS.pop(jid, None)
    save_store()
    audit("account.delete_data", user.user_id, files=removed_files, projects=removed_projects)
    return {"deleted_files": removed_files, "deleted_projects": removed_projects}


@app.post("/api/v1/audio/analyze")
def analyze_audio(payload: AnalyzeRequest, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    stored_path = Path(file_data["stored_path"])
    job = create_job(JobType.analyze, user_id=user.user_id, message="Analysis started")
    metadata = read_basic_audio_metadata(stored_path) if stored_path.suffix.lower() != ".zip" else file_data.get("metadata", {})
    result = full_audio_analysis(file_data["filename"], payload.file_id, stored_path, metadata)
    result["elite_engineering_report"] = build_elite_engineering_report(result)
    analysis_path = Path(file_data["workspace"]) / "analysis" / "analysis.json"
    analysis_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return complete_job(job, result=result, message="Infinity elite analysis complete")


@app.post("/api/v1/audio/master")
def master_audio(payload: ProcessRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    job = create_job(JobType.master, user_id=user.user_id, message="Mastering queued")
    background_tasks.add_task(_run_master, job.job_id, file_data, payload)
    return {"job_id": job.job_id, "status": "processing", "message": "Mastering started"}


def _run_master(job_id: str, file_data: dict, payload: ProcessRequest):
    try:
        update_job_progress(job_id, 10, "Loading audio file…")
        workspace = Path(file_data["workspace"])

        # Load saved analysis for adaptive mastering (written by the analyze endpoint)
        analysis_path = workspace / "analysis" / "analysis.json"
        saved_analysis: dict = {}
        if analysis_path.exists():
            try:
                saved_analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        dynamics = saved_analysis.get("dynamics") or None
        spectral = saved_analysis.get("spectral_balance") or None

        renders = workspace / "renders"
        style_prev = renders / "style-preview.mp3"
        enhanced = renders / "enhanced.wav"
        cleaned = renders / "mix-cleaned.wav"
        input_path = style_prev if style_prev.exists() else enhanced if enhanced.exists() else cleaned if cleaned.exists() else Path(file_data["stored_path"])
        output_dir = renders
        update_job_progress(job_id, 25, f"Applying {payload.mode} genre EQ + adaptive corrections…")
        render = render_master_with_ffmpeg(input_path, output_dir, payload.mode, payload.strength, payload.platform, payload.air_boost, payload.warmth, payload.low_eq, payload.mid_eq, payload.high_eq, dynamics=dynamics, spectral=spectral, target_lufs_override=payload.target_lufs, tp_ceiling=payload.tp_ceiling)
        update_job_progress(job_id, 85, "Running post-render QC…")

        # Post-render QC: measure the finished master and compare with the
        # pre-master analysis so the UI can show before/after honestly.
        qc = None
        if render.get("status") == "completed":
            try:
                from .audio import analyze_dynamics_via_astats
                from .release_check import build_qc_comparison, build_release_check
                mastered_path = Path(render.get("wav", ""))
                after = dict(render.get("loudness_report") or {})
                after["dynamics"] = analyze_dynamics_via_astats(mastered_path) if mastered_path.exists() else {}
                after["sample_rate"] = saved_analysis.get("sample_rate")
                after["channels"] = saved_analysis.get("channels")
                after["spectral_balance"] = {}
                qc = {
                    "comparison": build_qc_comparison(saved_analysis, after, render.get("target_lufs")),
                    "release_check": build_release_check(after),
                    "after": after,
                }
            except Exception as qc_err:
                logger.warning("Post-render QC failed: %s", qc_err)

        update_job_progress(job_id, 92, "Encoding WAV + MP3…")
        result = {"file_id": payload.file_id, "mode": payload.mode, "strength": payload.strength, "target_lufs": render.get("target_lufs", "-14 / -1.5 dBTP"), "render": render, "qc": qc, "downloads": {}}
        if render.get("status") == "completed":
            result["downloads"] = {
                "original": dl(payload.file_id, "original"),
                "master_preview": dl(payload.file_id, "master-preview"),
                "master_wav": dl(payload.file_id, "master-wav"),
                "master_mp3": dl(payload.file_id, "master-mp3"),
            }
        msg = "Mastering complete" if render.get("status") == "completed" else f"Mastering failed: {render.get('reason', render.get('stderr', ''))}"
        complete_job(JOBS[job_id], result, msg)
    except Exception as e:
        fail_job(job_id, str(e))


@app.post("/api/v1/audio/style-preview")
def style_preview(payload: StylePreviewRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    job = create_job(JobType.master, user_id=user.user_id, message="Style preview queued")
    background_tasks.add_task(_run_style_preview, job.job_id, file_data, payload)
    return {"job_id": job.job_id, "status": "processing", "message": "Style preview started"}


def _run_style_preview(job_id: str, file_data: dict, payload: StylePreviewRequest):
    try:
        update_job_progress(job_id, 15, "Loading audio…")
        workspace = Path(file_data["workspace"])
        enhanced = workspace / "renders" / "enhanced.wav"
        cleaned = workspace / "renders" / "mix-cleaned.wav"
        input_path = enhanced if enhanced.exists() else cleaned if cleaned.exists() else Path(file_data["stored_path"])
        output_dir = workspace / "renders"
        update_job_progress(job_id, 40, f"Applying {payload.mode} EQ…")
        result_data = render_style_preview_with_ffmpeg(input_path, output_dir, payload.mode, payload.strength, payload.warmth)
        update_job_progress(job_id, 90, "Finalizing preview…")
        downloads = {}
        if result_data.get("status") == "completed":
            downloads["style_preview"] = dl(payload.file_id, "style-preview")
        result = {"file_id": payload.file_id, "mode": payload.mode, "preview": result_data, "downloads": downloads}
        msg = "Style preview ready" if result_data.get("status") == "completed" else f"Style preview failed: {result_data.get('reason', result_data.get('stderr', ''))}"
        complete_job(JOBS[job_id], result, msg)
    except Exception as e:
        fail_job(job_id, str(e))


@app.post("/api/v1/audio/separate-stems")
def separate_stems(payload: AnalyzeRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    job = create_job(JobType.separate_stems, user_id=user.user_id, message="Stem separation queued")
    background_tasks.add_task(_run_separate_stems, job.job_id, file_data)
    return {"job_id": job.job_id, "status": "processing", "message": "Stem separation started"}


def _run_separate_stems(job_id: str, file_data: dict):
    try:
        update_job_progress(job_id, 10, "Loading audio…")
        input_path = Path(file_data["stored_path"])
        stems_dir = Path(file_data["workspace"]) / "stems"
        update_job_progress(job_id, 30, "Separating stems…")
        if has_demucs():
            separation = separate_stems_with_demucs(input_path, stems_dir)
        else:
            separation = separate_stems_with_ffmpeg(input_path, stems_dir)
        update_job_progress(job_id, 85, "Preparing downloads…")
        downloads = {}
        if separation.get("status") == "completed":
            for stem_name in separation.get("stems", {}).keys():
                downloads[stem_name] = dl(file_data['file_id'], f"stem-{stem_name}")
        result = {"file_id": file_data["file_id"], "separation": separation, "downloads": downloads, "method": separation.get("method", "demucs"), "note": separation.get("note", "")}
        msg = "Stem separation complete" if separation.get("status") == "completed" else f"Stem separation failed: {separation.get('reason', separation.get('stderr', ''))}"
        complete_job(JOBS[job_id], result, msg)
    except Exception as e:
        fail_job(job_id, str(e))


@app.post("/api/v1/sound/generate")
def generate_sound(payload: SoundGenerateRequest, user: CurrentUser = Depends(rate_limit)):
    job = create_job(JobType.generate_sound, user_id=user.user_id, message="Generating sound")
    assets = []
    base_prompt = payload.prompt.strip() or "infinity generated sound"
    for index in range(4):
        asset_id = make_id("sound")
        asset = generate_prompt_sound(sound_workspace(), asset_id, f"{base_prompt} variation {index + 1}", payload.intensity, payload.genre, payload.emotion)
        asset["user_id"] = user.user_id
        signed = sign_path(f"/api/v1/sound/assets/{asset_id}/download")
        asset["download_url"] = signed
        asset["preview_url"] = signed
        SOUND_ASSETS[asset_id] = asset
        assets.append(asset)
    save_store()
    audit("sound.generate", user.user_id, count=len(assets))
    result = {"prompt": payload.prompt, "intensity": payload.intensity, "genre": payload.genre, "emotion": payload.emotion, "assets": assets, "note": "Generated real downloadable WAV assets with deterministic backend synthesis."}
    return complete_job(job, result, "Sound generation complete")


@app.get("/api/v1/sound/assets/{asset_id}/download")
def download_sound_asset(asset_id: str, request: Request, exp: str | None = None, sig: str | None = None):
    asset = SOUND_ASSETS.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Sound asset not found")
    if not verify_signed_path(f"/api/v1/sound/assets/{asset_id}/download", exp, sig):
        user = current_user(request)
        if not owns(asset, user):
            raise HTTPException(status_code=404, detail="Sound asset not found")
    path = Path(asset["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated sound file is missing")
    return FileResponse(path, media_type="audio/wav", filename=asset.get("filename") or f"{asset_id}.wav")


def _build_qc_report(file_data: dict, workspace: Path) -> dict:
    """Assemble the QC report from saved analysis + measurements of the master."""
    from .audio import analyze_dynamics_via_astats, measure_lufs
    from .release_check import build_release_check

    analysis_path = workspace / "analysis" / "analysis.json"
    saved_analysis: dict = {}
    if analysis_path.exists():
        try:
            saved_analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    mastered = workspace / "renders" / "mastered.wav"
    master_measurements: dict = {}
    master_check: dict | None = None
    if mastered.exists():
        master_measurements = dict(measure_lufs(mastered))
        master_measurements["dynamics"] = analyze_dynamics_via_astats(mastered)
        master_measurements["sample_rate"] = saved_analysis.get("sample_rate")
        master_measurements["channels"] = saved_analysis.get("channels")
        master_check = build_release_check(master_measurements)

    return {
        "report": "Infinity AI quality-control report",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source_file": file_data.get("filename"),
        "original_analysis": {
            k: saved_analysis.get(k)
            for k in ("integrated_lufs", "true_peak_dbtp", "lra", "duration_seconds", "sample_rate", "channels", "phase_correlation")
        },
        "original_release_check": saved_analysis.get("technical_release_check"),
        "master_measurements": {k: v for k, v in master_measurements.items() if k != "dynamics"} or None,
        "master_dynamics": master_measurements.get("dynamics") or None,
        "master_release_check": master_check,
        "method": "All values measured with ffmpeg loudnorm/astats on the actual files in this package.",
    }


@app.post("/api/v1/export/package")
def export_package(payload: AnalyzeRequest, user: CurrentUser = Depends(current_user)):
    file_data = get_owned_file(payload.file_id, user)
    workspace = Path(file_data["workspace"])
    original_path = Path(file_data["stored_path"])
    exports_dir = workspace / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(original_path, exports_dir / original_path.name)

    # QC report: written as JSON next to the manifest, downloadable.
    qc_report = _build_qc_report(file_data, workspace)
    (exports_dir / "qc-report.json").write_text(json.dumps(qc_report, indent=2), encoding="utf-8")

    manifest = {"file_id": payload.file_id, "filename": file_data.get("filename"), "available_assets": [], "created_at": datetime.utcnow().isoformat() + "Z"}
    downloads = {"original": dl(payload.file_id, "original"), "analysis": dl(payload.file_id, "analysis"), "qc_report": dl(payload.file_id, "qc-report")}
    for asset_type, rel in {"master_preview": "renders/mastered-preview.mp3", "master_wav": "renders/mastered.wav", "master_mp3": "renders/mastered.mp3"}.items():
        if (workspace / rel).exists():
            downloads[asset_type] = dl(payload.file_id, asset_type.replace('_', '-'))
    for stem in ("vocals", "drums", "bass", "other"):
        if (workspace / "stems" / f"{stem}.wav").exists():
            downloads[f"stem_{stem}"] = dl(payload.file_id, f"stem-{stem}")
    manifest["available_assets"] = list(downloads.keys())
    manifest_path = exports_dir / "manifest.json"
    manifest_path.write_text(json.dumps({**manifest, "downloads": downloads}, indent=2), encoding="utf-8")
    downloads["manifest"] = dl(payload.file_id, "manifest")
    job = create_job(JobType.export, user_id=user.user_id, message="Export package queued")
    result = {"file_id": payload.file_id, "formats": list(downloads.keys()), "downloads": downloads}
    return complete_job(job, result, "Infinity v10 export package ready")


@app.post("/api/v1/export/release-package")
def build_release_package(payload: AnalyzeRequest, user: CurrentUser = Depends(current_user)):
    file_data = get_owned_file(payload.file_id, user)
    workspace = Path(file_data["workspace"])
    renders = workspace / "renders"
    exports_dir = workspace / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    versions = []
    file_map = {
        "Master WAV (Lossless)": renders / "mastered.wav",
        "Master MP3 320k": renders / "mastered.mp3",
        "Master Preview (30s)": renders / "mastered-preview.mp3",
        "Style Preview": renders / "style-preview.mp3",
        "Mix Enhanced": renders / "enhanced.wav",
        "Mix Cleaned": renders / "mix-cleaned.wav",
    }
    for label, path in file_map.items():
        if path.exists():
            versions.append({"name": label, "filename": path.name, "size_bytes": path.stat().st_size})
    metadata = {
        "release_title": file_data.get("filename", "Unknown").rsplit(".", 1)[0],
        "artist": "Unknown Artist",
        "genre": "Unknown",
        "status": "Ready for distribution",
        "package_ready": bool(versions),
        "checklist_completed": len(versions),
        "checklist_total": 6,
        "versions": versions,
        "downloads": {
            "master_wav": dl(payload.file_id, "master-wav") if (renders / "mastered.wav").exists() else None,
            "master_mp3": dl(payload.file_id, "master-mp3") if (renders / "mastered.mp3").exists() else None,
            "master_preview": dl(payload.file_id, "master-preview") if (renders / "mastered-preview.mp3").exists() else None,
        },
        "created_at": datetime.utcnow().isoformat(),
        "file_id": payload.file_id,
    }
    metadata["downloads"] = {k: v for k, v in metadata["downloads"].items() if v}
    meta_path = exports_dir / "release-package.json"
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    job = create_job(JobType.export, user_id=user.user_id, message="Release package ready")
    result = {"file_id": payload.file_id, "metadata": metadata, "downloads": {"release_package_json": dl(payload.file_id, "release-package")}}
    return complete_job(job, result, "Release package ready")


@app.get("/api/v1/files/{file_id}")
def get_file_info(file_id: str, user: CurrentUser = Depends(current_user)):
    file_data = get_owned_file(file_id, user)
    return {"file_id": file_data["file_id"], "filename": file_data["filename"], "size_bytes": file_data.get("size_bytes"), "metadata": file_data.get("metadata", {})}


@app.get("/api/v1/files/{file_id}/download/{asset_type}")
def download_file(file_id: str, asset_type: str, request: Request, exp: str | None = None, sig: str | None = None):
    file_data = FILES.get(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    # Either a valid signed URL (issued to the owner) or an authenticated owner.
    if not verify_signed_path(f"/api/v1/files/{file_id}/download/{asset_type}", exp, sig):
        user = current_user(request)
        if not owns(file_data, user):
            raise HTTPException(status_code=404, detail="File not found")
    workspace = Path(file_data["workspace"])
    original_path = Path(file_data["stored_path"])
    paths = {
        "original": original_path,
        "analysis": workspace / "analysis" / "analysis.json",
        "master-wav": workspace / "renders" / "mastered.wav",
        "master-mp3": workspace / "renders" / "mastered.mp3",
        "master-preview": workspace / "renders" / "mastered-preview.mp3",
        "manifest": workspace / "exports" / "manifest.json",
        "cleaned-wav": workspace / "renders" / "vocals-cleaned.wav",
        "cleaned-mp3": workspace / "renders" / "vocals-cleaned.mp3",
        "mixed-wav": workspace / "renders" / "mixed.wav",
        "mixed-mp3": workspace / "renders" / "mixed.mp3",
        "mix-cleaned-wav": workspace / "renders" / "mix-cleaned.wav",
        "mix-cleaned-mp3": workspace / "renders" / "mix-cleaned.mp3",
        "enhanced-wav": workspace / "renders" / "enhanced.wav",
        "enhanced-mp3": workspace / "renders" / "enhanced.mp3",
        "style-preview": workspace / "renders" / "style-preview.mp3",
        "release-package": workspace / "exports" / "release-package.json",
        "qc-report": workspace / "exports" / "qc-report.json",
    }
    if asset_type.startswith("stem-"):
        stem_name = asset_type.replace("stem-", "", 1)
        if stem_name not in {"vocals", "drums", "bass", "other", "instrumental"}:
            raise HTTPException(status_code=400, detail="Unknown stem type")
        paths[asset_type] = workspace / "stems" / f"{stem_name}.wav"
    path = paths.get(asset_type)
    if not path:
        raise HTTPException(status_code=400, detail="Unknown asset type")
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Asset not found: {asset_type}")
    _media_types = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".flac": "audio/flac", ".webm": "audio/webm", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".json": "application/json"}
    media_type = _media_types.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type, filename=path.name)


@app.post("/api/v1/audio/clean-mix")
def clean_mix(payload: AnalyzeRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    job = create_job(JobType.clean_vocals, user_id=user.user_id, message="Mix cleaning queued")
    background_tasks.add_task(_run_clean_mix, job.job_id, file_data)
    return {"job_id": job.job_id, "status": "processing", "message": "Mix cleaning started"}


def _run_clean_mix(job_id: str, file_data: dict):
    try:
        update_job_progress(job_id, 10, "Loading audio file…")
        input_path = Path(file_data["stored_path"])
        output_dir = Path(file_data["workspace"]) / "renders"
        update_job_progress(job_id, 30, "Noise reduction + gate…")
        result_data = clean_full_mix_with_ffmpeg(input_path, output_dir)
        update_job_progress(job_id, 85, "Normalizing levels…")
        downloads = {}
        if result_data.get("status") == "completed":
            downloads["cleaned_wav"] = dl(file_data['file_id'], "mix-cleaned-wav")
            if result_data.get("mp3_exists"):
                downloads["cleaned_mp3"] = dl(file_data['file_id'], "mix-cleaned-mp3")
        result = {"file_id": file_data["file_id"], "clean": result_data, "downloads": downloads}
        msg = "Mix cleaning complete" if result_data.get("status") == "completed" else f"Mix cleaning failed: {result_data.get('reason', result_data.get('stderr', ''))}"
        complete_job(JOBS[job_id], result, msg)
    except Exception as e:
        fail_job(job_id, str(e))


@app.post("/api/v1/audio/enhance-mix")
def enhance_mix(payload: EnhanceMixRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    job = create_job(JobType.mix, user_id=user.user_id, message="Mix enhancement queued")
    background_tasks.add_task(_run_enhance_mix, job.job_id, file_data, payload)
    return {"job_id": job.job_id, "status": "processing", "message": "Mix enhancement started"}


def _run_enhance_mix(job_id: str, file_data: dict, payload: EnhanceMixRequest):
    try:
        update_job_progress(job_id, 10, "Loading audio…")
        cleaned_path = Path(file_data["workspace"]) / "renders" / "mix-cleaned.wav"
        input_path = cleaned_path if cleaned_path.exists() else Path(file_data["stored_path"])
        output_dir = Path(file_data["workspace"]) / "renders"
        update_job_progress(job_id, 30, "Applying presence + stereo…")
        result_data = enhance_mix_with_ffmpeg(input_path, output_dir, payload.presence_boost, payload.reverb_amount, payload.stereo_width, payload.bus_compress)
        update_job_progress(job_id, 80, "Bus compression + finalizing…")
        enhanced_file_id = None
        if result_data.get("status") == "completed":
            enhanced_wav_path = Path(result_data["wav"])
            enhanced_file_id = make_id("file")
            enhanced_workspace = file_workspace(enhanced_file_id)
            dest = enhanced_workspace / "original" / "enhanced.wav"
            shutil.copy2(enhanced_wav_path, dest)
            FILES[enhanced_file_id] = {
                "file_id": enhanced_file_id, "user_id": file_data.get("user_id", ""), "filename": "enhanced.wav",
                "content_type": "audio/wav", "size_bytes": dest.stat().st_size,
                "stored_path": str(dest), "workspace": str(enhanced_workspace),
                "metadata": read_basic_audio_metadata(dest),
                "parent_file_id": payload.file_id,
                "downloads": {"original": dl(enhanced_file_id, "original")},
            }
            save_store()
        downloads = {}
        if result_data.get("status") == "completed":
            downloads["enhanced_wav"] = dl(payload.file_id, "enhanced-wav")
            if result_data.get("mp3_exists"):
                downloads["enhanced_mp3"] = dl(payload.file_id, "enhanced-mp3")
            if enhanced_file_id:
                downloads["enhanced_original"] = dl(enhanced_file_id, "original")
        result = {"file_id": payload.file_id, "enhanced_file_id": enhanced_file_id, "enhance": result_data, "downloads": downloads}
        msg = "Mix enhancement complete" if result_data.get("status") == "completed" else f"Mix enhancement failed: {result_data.get('reason', result_data.get('stderr', ''))}"
        complete_job(JOBS[job_id], result, msg)
    except Exception as e:
        fail_job(job_id, str(e))


@app.post("/api/v1/vocal/clean")
def clean_vocals(payload: CleanVocalsRequest, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    input_path = Path(file_data["stored_path"])
    output_dir = Path(file_data["workspace"]) / "renders"
    job = create_job(JobType.clean_vocals, user_id=user.user_id, message="Vocal cleaning started")
    result_data = clean_vocals_with_ffmpeg(input_path, output_dir)
    downloads = {}
    if result_data.get("status") == "completed":
        downloads["cleaned_wav"] = dl(payload.file_id, "cleaned-wav")
        if result_data.get("mp3_exists"):
            downloads["cleaned_mp3"] = dl(payload.file_id, "cleaned-mp3")
    result = {"file_id": payload.file_id, "clean": result_data, "downloads": downloads}
    msg = "Vocal cleaning complete" if result_data.get("status") == "completed" else f"Vocal cleaning failed: {result_data.get('reason', result_data.get('stderr', ''))}"
    return complete_job(job, result, msg)


@app.post("/api/v1/audio/mix-vocal-beat")
def mix_vocal_beat(payload: MixVocalBeatRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    vocal_data = get_owned_file(payload.vocal_file_id, user)
    get_owned_file(payload.beat_file_id, user)
    job = create_job(JobType.mix_vocal_beat, user_id=user.user_id, message="Vocal+beat mix queued")
    background_tasks.add_task(_run_vocal_beat_mix, job.job_id, vocal_data, payload)
    return {"job_id": job.job_id, "status": "processing", "message": "Mixing vocals with beat"}


def _run_vocal_beat_mix(job_id: str, vocal_data: dict, payload: MixVocalBeatRequest):
    try:
        update_job_progress(job_id, 10, "Loading vocal + beat…")
        beat_data = FILES.get(payload.beat_file_id, {})
        vocal_path = Path(vocal_data["stored_path"])
        beat_path = Path(beat_data["stored_path"])
        cleaned_vocal = Path(vocal_data["workspace"]) / "renders" / "vocals-cleaned.wav"
        if cleaned_vocal.exists():
            vocal_path = cleaned_vocal
        output_dir = Path(vocal_data["workspace"]) / "renders"
        update_job_progress(job_id, 35, "Applying vocal presence + EQ…")
        mix_result = mix_vocal_beat_with_ffmpeg(vocal_path, beat_path, output_dir, params=payload.chain_params())
        update_job_progress(job_id, 80, "Bus compression + finalizing…")
        mixed_file_id = None
        if mix_result.get("status") == "completed":
            mixed_wav_path = Path(mix_result["wav"])
            mixed_file_id = make_id("file")
            mixed_workspace = file_workspace(mixed_file_id)
            dest = mixed_workspace / "original" / "mixed.wav"
            shutil.copy2(mixed_wav_path, dest)
            FILES[mixed_file_id] = {
                "file_id": mixed_file_id, "user_id": vocal_data.get("user_id", ""), "filename": "mixed.wav",
                "content_type": "audio/wav", "size_bytes": dest.stat().st_size,
                "stored_path": str(dest), "workspace": str(mixed_workspace),
                "metadata": read_basic_audio_metadata(dest),
                "parent_vocal_id": payload.vocal_file_id,
                "parent_beat_id": payload.beat_file_id,
                "downloads": {"original": dl(mixed_file_id, "original")},
            }
            save_store()
        downloads = {}
        if mix_result.get("status") == "completed":
            downloads["mixed_wav"] = dl(payload.vocal_file_id, "mixed-wav")
            if mix_result.get("mp3_exists"):
                downloads["mixed_mp3"] = dl(payload.vocal_file_id, "mixed-mp3")
            if mixed_file_id:
                downloads["mixed_original"] = dl(mixed_file_id, "original")
        result = {"vocal_file_id": payload.vocal_file_id, "beat_file_id": payload.beat_file_id, "mixed_file_id": mixed_file_id, "mix": mix_result, "downloads": downloads}
        msg = "Mix complete" if mix_result.get("status") == "completed" else f"Mix failed: {mix_result.get('reason', mix_result.get('stderr', ''))}"
        complete_job(JOBS[job_id], result, msg)
    except Exception as e:
        fail_job(job_id, str(e))


@app.post("/api/v1/audio/transform-style")
def transform_style_endpoint(payload: TransformStyleRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    file_data = get_owned_file(payload.file_id, user)
    if not settings.replicate_api_token:
        raise HTTPException(status_code=503, detail="Replicate API token not configured")
    job = create_job(JobType.transform_style, user_id=user.user_id, message="Style transform queued")
    background_tasks.add_task(_run_transform_style, job.job_id, file_data, payload)
    return {"job_id": job.job_id, "status": "processing", "message": "Style transform started"}


def _run_transform_style(job_id: str, file_data: dict, payload: TransformStyleRequest):
    try:
        import replicate as replicate_sdk
        import subprocess
        import tempfile

        update_job_progress(job_id, 5, "Separating vocals…")
        workspace = Path(file_data["workspace"])
        renders = workspace / "renders"
        stems_dir = workspace / "stems"
        enhanced = renders / "enhanced.wav"
        cleaned = renders / "mix-cleaned.wav"
        source = enhanced if enhanced.exists() else cleaned if cleaned.exists() else Path(file_data["stored_path"])

        vocal_path = None
        separation = separate_stems_with_ffmpeg(source, stems_dir)
        if separation.get("status") == "completed":
            vocals = separation.get("stems", {}).get("vocals") or separation.get("vocals")
            if isinstance(vocals, dict):
                candidate = Path(vocals.get("path", ""))
                if candidate.exists():
                    vocal_path = candidate
        instrumental = None
        if separation.get("status") == "completed":
            instrumental_data = separation.get("stems", {}).get("instrumental") or separation.get("instrumental")
            if isinstance(instrumental_data, dict):
                candidate = Path(instrumental_data.get("path", ""))
                if candidate.exists():
                    instrumental = candidate
        melody_source = instrumental or source

        update_job_progress(job_id, 12, "Preparing instrumental for AI transform…")
        import os
        tmp_mp3 = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp_mp3.close()
        subprocess.run(["ffmpeg", "-y", "-i", str(melody_source), "-t", str(payload.duration), "-ar", "44100", "-ab", "192k", tmp_mp3.name], capture_output=True)

        prompt = STYLE_PROMPTS.get(payload.mode, payload.mode)
        if payload.strength < 40:
            prompt += ", subtle, gentle transformation"
        elif payload.strength > 75:
            prompt += ", strong transformation, full genre character"

        update_job_progress(job_id, 18, f"Sending to Replicate — {payload.mode} transform…")
        client = replicate_sdk.Client(api_token=settings.replicate_api_token)
        update_job_progress(job_id, 22, "AI is generating your transformed track — this takes ~1 min…")
        try:
            with open(tmp_mp3.name, "rb") as audio_file:
                output = client.run(
                    "meta/musicgen:b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38",
                    input={
                        "model_version": "melody-large",
                        "prompt": prompt,
                        "input_audio": audio_file,
                        "duration": payload.duration,
                        "output_format": "wav",
                        "normalization_strategy": "loudness",
                    },
                )
        finally:
            os.unlink(tmp_mp3.name)
        output_url = output[0] if isinstance(output, (list, tuple)) else output
        output_url = str(output_url)
        if not output_url:
            fail_job(job_id, "No output from Replicate — generation may have failed silently")
            return

        update_job_progress(job_id, 82, "Downloading transformed track…")
        raw_wav = renders / f"style-transform-raw-{payload.mode.lower().replace(' ', '-')}.wav"
        with httpx.Client(timeout=120) as dl:
            raw_wav.write_bytes(dl.get(output_url).content)

        update_job_progress(job_id, 88, "Mixing vocals back and encoding…")
        final_wav = renders / f"style-transform-{payload.mode.lower().replace(' ', '-')}.wav"
        if vocal_path and vocal_path.exists():
            mix_result = mix_vocal_beat_with_ffmpeg(vocal_path, raw_wav, renders, vocal_gain=1.0, beat_gain=0.9, vocal_presence_boost=True, beat_stereo_width=1.3, bus_compress=True, reverb_amount=0.1)
            mixed_wav = renders / "mixed.wav"
            if mix_result.get("status") == "completed" and mixed_wav.exists():
                shutil.copy2(mixed_wav, final_wav)
            else:
                shutil.copy2(raw_wav, final_wav)
        else:
            shutil.copy2(raw_wav, final_wav)

        final_mp3 = renders / f"style-transform-{payload.mode.lower().replace(' ', '-')}.mp3"
        subprocess.run(["ffmpeg", "-y", "-i", str(final_wav), "-codec:a", "libmp3lame", "-b:a", "320k", "-ar", "44100", str(final_mp3)], capture_output=True)
        if not final_mp3.exists():
            shutil.copy2(final_wav, final_mp3)
        shutil.copy2(final_mp3, renders / "style-preview.mp3")

        downloads = {"style_preview": dl(payload.file_id, "style-preview"), "transform": dl(payload.file_id, "style-preview")}
        complete_job(JOBS[job_id], {"file_id": payload.file_id, "mode": payload.mode, "downloads": downloads}, f"{payload.mode} transform complete — vocals preserved")
    except Exception as e:
        fail_job(job_id, str(e))


GENRE_BENCHMARKS = {
    "trap":     {"lufs": (-9, -7),  "lra": (4, 7),   "tp": -0.5, "ref": "Travis Scott – ASTROWORLD, Drake – Certified Lover Boy"},
    "drill":    {"lufs": (-9, -7),  "lra": (3, 6),   "tp": -0.5, "ref": "Pop Smoke – Shoot for the Stars, Central Cee – 23"},
    "afrobeat": {"lufs": (-11, -9), "lra": (6, 10),  "tp": -1.0, "ref": "Burna Boy – Twice as Tall, Wizkid – Made in Lagos"},
    "house":    {"lufs": (-9, -7),  "lra": (4, 7),   "tp": -0.5, "ref": "Fred Again – Actual Life 3, Four Tet – There Is Love in You"},
    "gospel":   {"lufs": (-13, -11),"lra": (8, 13),  "tp": -1.0, "ref": "Kirk Franklin – Long Live Love, Maverick City – Jubilee"},
    "cinematic":{"lufs": (-16, -12),"lra": (12, 20), "tp": -1.0, "ref": "Hans Zimmer – Interstellar OST, Ludwig Göransson – Black Panther"},
    "soul":     {"lufs": (-13, -10),"lra": (7, 12),  "tp": -1.0, "ref": "Daniel Caesar – Case Study 01, SZA – SOS"},
    "experimental":{"lufs":(-12,-9),"lra": (6, 12),  "tp": -1.0, "ref": "FKA Twigs – Magdalene, Arca – KiCk i"},
    "custom":   {"lufs": (-12, -9), "lra": (6, 11),  "tp": -1.0, "ref": "Top 40 Pop/R&B"},
}

@app.post("/api/v1/audio/analyze-ai")
def analyze_ai_endpoint(payload: AiAnalyzeRequest, background_tasks: BackgroundTasks, user: CurrentUser = Depends(rate_limit)):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="Anthropic API key not configured")
    file_data = get_owned_file(payload.file_id, user)
    job = create_job(JobType.analyze_ai, user_id=user.user_id, message="AI analysis queued")
    background_tasks.add_task(_run_analyze_ai, job.job_id, file_data, payload)
    return {"job_id": job.job_id, "status": "processing", "message": "AI analysis started"}

def _run_analyze_ai(job_id: str, file_data: dict, payload: AiAnalyzeRequest):
    try:
        import anthropic as anthropic_sdk

        update_job_progress(job_id, 5, "Measuring audio…")
        workspace = Path(file_data["workspace"])
        renders   = workspace / "renders"

        # Use best available version of the track for measurement
        style_prev = renders / "style-preview.mp3"
        enhanced   = renders / "enhanced.wav"
        cleaned    = renders / "mix-cleaned.wav"
        measure_path = (style_prev if style_prev.exists()
                        else enhanced if enhanced.exists()
                        else cleaned  if cleaned.exists()
                        else Path(file_data["stored_path"]))

        from .audio import measure_lufs
        lufs = measure_lufs(measure_path)

        meta = file_data.get("metadata", {})
        duration_s = meta.get("duration_seconds") or meta.get("duration") or 0
        sample_rate = meta.get("sample_rate") or 44100
        bitrate     = meta.get("bitrate") or 0
        channels    = meta.get("channels") or 2
        filename    = file_data.get("filename", "track.mp3")

        genre_key = (payload.genre or "custom").lower().strip()
        genre_key = "afrobeat" if "afro" in genre_key else genre_key
        if genre_key not in GENRE_BENCHMARKS:
            genre_key = "custom"
        bench = GENRE_BENCHMARKS[genre_key]

        integrated_lufs = lufs.get("integrated_lufs")
        true_peak       = lufs.get("true_peak_dbtp")
        lra             = lufs.get("lra")
        duration_min    = f"{int(duration_s // 60)}:{int(duration_s % 60):02d}" if duration_s else "unknown"
        bitrate_kbps    = round(bitrate / 1000) if bitrate else None

        measurements_text = f"""
TRACK: {filename}
GENRE: {payload.genre}
DURATION: {duration_min}
CHANNELS: {"Stereo" if channels >= 2 else "Mono"}
SAMPLE RATE: {sample_rate} Hz
BITRATE: {f"{bitrate_kbps} kbps" if bitrate_kbps else "unknown"}
INTEGRATED LOUDNESS: {f"{integrated_lufs} LUFS" if integrated_lufs is not None else "could not measure"}
TRUE PEAK: {f"{true_peak} dBTP" if true_peak is not None else "could not measure"}
LOUDNESS RANGE (LRA): {f"{lra} LU" if lra is not None else "could not measure"}

REFERENCE TARGETS for {payload.genre}:
  Loudness: {bench["lufs"][0]} to {bench["lufs"][1]} LUFS
  LRA (dynamics): {bench["lra"][0]} to {bench["lra"][1]} LU
  True peak: {bench["tp"]} dBTP
  Commercial reference releases: {bench["ref"]}
""".strip()

        update_job_progress(job_id, 20, "Running AI analysis — this takes ~20 seconds…")

        client = anthropic_sdk.Anthropic(api_key=settings.anthropic_api_key)
        system_prompt = (
            "You are a Grammy-winning producer, mix engineer, mastering engineer, and A&R executive. "
            "Analyze songs about to be released commercially. Evaluate songwriting, arrangement, performance, "
            "vocals, instrumentation, frequency balance, dynamics, stereo image, low end, transients, loudness, "
            "clarity, emotional impact, and commercial competitiveness. Identify the root cause of every issue "
            "rather than treating symptoms. Recommend the minimum processing required to achieve a professional "
            "result, explaining the purpose of every change and why it is necessary. Compare to top releases in "
            "the genre, prioritize improvements from highest to lowest impact, identify anything that is "
            "over-processed, and finish with a step-by-step action plan. Be specific with dB values, frequencies, "
            "compressor settings, and plugin/process names. Keep each section tight — no fluff."
        )
        user_message = (
            f"Analyze this track for commercial release:\n\n{measurements_text}\n\n"
            "Produce a full professional analysis with these sections:\n"
            "1. TECHNICAL OVERVIEW — measurements vs genre benchmarks, verdict\n"
            "2. CRITICAL ISSUES — root cause of each problem, ranked highest to lowest impact\n"
            "3. PROCESSING RECOMMENDATIONS — minimum changes needed, purpose of each\n"
            "4. COMMERCIAL COMPETITIVENESS — comparison to reference tracks, score /10\n"
            "5. ACTION PLAN — ordered step-by-step list to reach release-ready quality\n\n"
            "Be direct and specific. Use dB values and frequencies where relevant."
        )

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        analysis_text = message.content[0].text

        update_job_progress(job_id, 90, "Formatting report…")
        complete_job(JOBS[job_id], {
            "file_id": payload.file_id,
            "genre": payload.genre,
            "measurements": {
                "integrated_lufs": integrated_lufs,
                "true_peak_dbtp": true_peak,
                "lra": lra,
                "duration": duration_min,
                "sample_rate": sample_rate,
                "channels": channels,
                "bitrate_kbps": bitrate_kbps,
            },
            "benchmarks": bench,
            "analysis": analysis_text,
        }, "AI analysis complete")
    except Exception as e:
        fail_job(job_id, str(e))


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str, user: CurrentUser = Depends(current_user)):
    job = JOBS.get(job_id)
    if not job or (job.user_id and job.user_id != user.user_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return job
