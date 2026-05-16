from pathlib import Path
import json
import shutil
import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .audio import clean_full_mix_with_ffmpeg, clean_vocals_with_ffmpeg, enhance_mix_with_ffmpeg, full_audio_analysis, generate_prompt_sound, has_demucs, has_ffmpeg, mix_vocal_beat_with_ffmpeg, read_basic_audio_metadata, render_master_with_ffmpeg, separate_stems_with_demucs
from .config import get_settings
from .models import AnalyzeRequest, CleanVocalsRequest, EnhanceMixRequest, JobType, MixVocalBeatRequest, ProcessRequest, ProjectCreateRequest, SoundGenerateRequest
from .store import FILES, JOBS, PROJECTS, SOUND_ASSETS, complete_job, create_job, load_store, make_id, save_store

settings = get_settings()
app = FastAPI(title="Infinity AI Audio Backend", version="10.0.0", description="FastAPI backend for Infinity AI music production.")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def on_startup():
    load_store()

def file_workspace(file_id: str) -> Path:
    root = settings.storage_path / file_id
    for folder in ("original", "analysis", "renders", "stems", "exports"):
        (root / folder).mkdir(parents=True, exist_ok=True)
    return root

def sound_workspace() -> Path:
    root = settings.storage_path / "generated-sounds"
    root.mkdir(parents=True, exist_ok=True)
    return root

def get_file_or_404(file_id: str) -> dict:
    file_data = FILES.get(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    return file_data

def get_sound_or_404(asset_id: str) -> dict:
    asset = SOUND_ASSETS.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Sound asset not found")
    return asset

@app.get("/")
def root():
    return {"name": "Infinity AI Audio Backend", "version": "10.0.0", "status": "online", "ffmpeg_available": has_ffmpeg(), "demucs_available": has_demucs(), "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "10.0.0", "environment": settings.infinity_env, "ffmpeg_available": has_ffmpeg(), "demucs_available": has_demucs()}

@app.post("/api/v1/projects")
def create_project(payload: ProjectCreateRequest):
    project_id = make_id("project")
    project = {"project_id": project_id, "title": payload.title, "artist": payload.artist, "genre": payload.genre, "status": payload.status, "notes": payload.notes, "files": []}
    PROJECTS[project_id] = project
    save_store()
    return project

@app.get("/api/v1/projects")
def list_projects():
    return {"projects": list(PROJECTS.values())}

@app.post("/api/v1/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    suffix = Path(file.filename).suffix.lower()
    allowed = {".mp3", ".wav", ".flac", ".zip", ".m4a", ".aac", ".ogg", ".webm"}
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")
    file_id = make_id("file")
    workspace = file_workspace(file_id)
    stored_path = workspace / "original" / f"original{suffix}"
    size = 0
    async with aiofiles.open(stored_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.infinity_max_upload_mb * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File exceeds upload limit")
            await out.write(chunk)
    metadata = read_basic_audio_metadata(stored_path) if suffix != ".zip" else {"package": "stem_zip", "ffmpeg_available": has_ffmpeg(), "demucs_available": has_demucs()}
    record = {"file_id": file_id, "filename": file.filename, "content_type": file.content_type, "size_bytes": size, "stored_path": str(stored_path), "workspace": str(workspace), "metadata": metadata, "downloads": {"original": f"/api/v1/files/{file_id}/download/original"}}
    FILES[file_id] = record
    save_store()
    job = create_job(JobType.upload, message="Upload complete", result={"file": record})
    return {"file": record, "job": job}

@app.post("/api/v1/audio/analyze")
def analyze_audio(payload: AnalyzeRequest):
    file_data = get_file_or_404(payload.file_id)
    stored_path = Path(file_data["stored_path"])
    job = create_job(JobType.analyze, message="Analysis started")
    metadata = read_basic_audio_metadata(stored_path) if stored_path.suffix.lower() != ".zip" else file_data.get("metadata", {})
    result = full_audio_analysis(file_data["filename"], payload.file_id, stored_path, metadata)
    analysis_path = Path(file_data["workspace"]) / "analysis" / "analysis.json"
    analysis_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return complete_job(job, result=result, message="Infinity v10 analysis complete")

@app.post("/api/v1/audio/mix")
def mix_audio(payload: ProcessRequest):
    get_file_or_404(payload.file_id)
    job = create_job(JobType.mix, message="Mix assistant started")
    result = {"file_id": payload.file_id, "mode": payload.mode, "strength": payload.strength, "steps": ["noise/cleanup recommendation", "frequency-balance plan", "compression plan", "stereo image plan", "master-ready routing"], "status": "mix-plan-ready", "note": "v10 mix assistant created a structured mix plan. Full multitrack DSP comes after stem separation."}
    return complete_job(job, result, "Infinity v10 mix plan ready")

@app.post("/api/v1/audio/master")
def master_audio(payload: ProcessRequest):
    file_data = get_file_or_404(payload.file_id)
    input_path = Path(file_data["stored_path"])
    output_dir = Path(file_data["workspace"]) / "renders"
    job = create_job(JobType.master, message="v10 mastering started")
    render = render_master_with_ffmpeg(input_path, output_dir, payload.mode, payload.strength, payload.platform, payload.air_boost)
    result = {"file_id": payload.file_id, "mode": payload.mode, "strength": payload.strength, "target_lufs": render.get("target_lufs", "-14 / -1.5 dBTP"), "render": render, "downloads": {}}
    if render.get("status") == "completed":
        result["downloads"] = {
            "original": f"/api/v1/files/{payload.file_id}/download/original",
            "master_preview": f"/api/v1/files/{payload.file_id}/download/master-preview",
            "master_wav": f"/api/v1/files/{payload.file_id}/download/master-wav",
            "master_mp3": f"/api/v1/files/{payload.file_id}/download/master-mp3",
        }
    return complete_job(job, result, "Infinity v10 mastering complete" if render.get("status") == "completed" else "Mastering skipped or failed")

@app.post("/api/v1/audio/separate-stems")
def separate_stems(payload: AnalyzeRequest):
    file_data = get_file_or_404(payload.file_id)
    input_path = Path(file_data["stored_path"])
    stems_dir = Path(file_data["workspace"]) / "stems"
    job = create_job(JobType.separate_stems, message="Stem separation started")
    separation = separate_stems_with_demucs(input_path, stems_dir)
    downloads = {}
    if separation.get("status") == "completed":
        for stem_name in separation.get("stems", {}).keys():
            downloads[stem_name] = f"/api/v1/files/{payload.file_id}/download/stem-{stem_name}"
    result = {"file_id": payload.file_id, "separation": separation, "downloads": downloads, "note": "Real stems require Demucs installed in backend environment."}
    return complete_job(job, result, "Stem separation complete" if separation.get("status") == "completed" else "Stem separation skipped or failed")

@app.post("/api/v1/sound/generate")
def generate_sound(payload: SoundGenerateRequest):
    job = create_job(JobType.generate_sound, message="Generating sound")
    assets = []
    base_prompt = payload.prompt.strip() or "infinity generated sound"
    for index in range(4):
        asset_id = make_id("sound")
        asset = generate_prompt_sound(sound_workspace(), asset_id, f"{base_prompt} variation {index + 1}", payload.intensity, payload.genre, payload.emotion)
        SOUND_ASSETS[asset_id] = asset
        assets.append(asset)
    result = {"prompt": payload.prompt, "intensity": payload.intensity, "genre": payload.genre, "emotion": payload.emotion, "assets": assets, "note": "Generated real downloadable WAV assets with deterministic backend synthesis."}
    return complete_job(job, result, "Sound generation complete")

@app.get("/api/v1/sound/assets/{asset_id}/download")
def download_sound_asset(asset_id: str):
    asset = get_sound_or_404(asset_id)
    path = Path(asset["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated sound file is missing")
    return FileResponse(path, media_type="audio/wav", filename=asset.get("filename") or f"{asset_id}.wav")

@app.post("/api/v1/export/package")
def export_package(payload: AnalyzeRequest):
    file_data = get_file_or_404(payload.file_id)
    workspace = Path(file_data["workspace"])
    original_path = Path(file_data["stored_path"])
    exports_dir = workspace / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(original_path, exports_dir / original_path.name)
    manifest = {"file_id": payload.file_id, "filename": file_data.get("filename"), "available_assets": [], "created_at": "runtime"}
    downloads = {"original": f"/api/v1/files/{payload.file_id}/download/original", "analysis": f"/api/v1/files/{payload.file_id}/download/analysis"}
    for asset_type, rel in {"master_preview": "renders/mastered-preview.mp3", "master_wav": "renders/mastered.wav", "master_mp3": "renders/mastered.mp3"}.items():
        if (workspace / rel).exists():
            downloads[asset_type] = f"/api/v1/files/{payload.file_id}/download/{asset_type.replace('_', '-')}"
    for stem in ("vocals", "drums", "bass", "other"):
        if (workspace / "stems" / f"{stem}.wav").exists():
            downloads[f"stem_{stem}"] = f"/api/v1/files/{payload.file_id}/download/stem-{stem}"
    manifest["available_assets"] = list(downloads.keys())
    manifest_path = exports_dir / "manifest.json"
    manifest_path.write_text(json.dumps({**manifest, "downloads": downloads}, indent=2), encoding="utf-8")
    downloads["manifest"] = f"/api/v1/files/{payload.file_id}/download/manifest"
    job = create_job(JobType.export, message="Export package queued")
    result = {"file_id": payload.file_id, "formats": list(downloads.keys()), "downloads": downloads}
    return complete_job(job, result, "Infinity v10 export package ready")

@app.get("/api/v1/files/{file_id}/download/{asset_type}")
def download_file(file_id: str, asset_type: str):
    file_data = get_file_or_404(file_id)
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
    }
    if asset_type.startswith("stem-"):
        stem_name = asset_type.replace("stem-", "", 1)
        if stem_name not in {"vocals", "drums", "bass", "other"}:
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
def clean_mix(payload: AnalyzeRequest):
    file_data = get_file_or_404(payload.file_id)
    input_path = Path(file_data["stored_path"])
    output_dir = Path(file_data["workspace"]) / "renders"
    job = create_job(JobType.clean_vocals, message="Mix cleaning started")
    result_data = clean_full_mix_with_ffmpeg(input_path, output_dir)
    downloads = {}
    if result_data.get("status") == "completed":
        downloads["cleaned_wav"] = f"/api/v1/files/{payload.file_id}/download/mix-cleaned-wav"
        if result_data.get("mp3_exists"):
            downloads["cleaned_mp3"] = f"/api/v1/files/{payload.file_id}/download/mix-cleaned-mp3"
    result = {"file_id": payload.file_id, "clean": result_data, "downloads": downloads}
    msg = "Mix cleaning complete" if result_data.get("status") == "completed" else f"Mix cleaning failed: {result_data.get('reason', result_data.get('stderr', ''))}"
    return complete_job(job, result, msg)


@app.post("/api/v1/audio/enhance-mix")
def enhance_mix(payload: EnhanceMixRequest):
    file_data = get_file_or_404(payload.file_id)
    cleaned_path = Path(file_data["workspace"]) / "renders" / "mix-cleaned.wav"
    input_path = cleaned_path if cleaned_path.exists() else Path(file_data["stored_path"])
    output_dir = Path(file_data["workspace"]) / "renders"
    job = create_job(JobType.mix, message="Mix enhancement started")
    result_data = enhance_mix_with_ffmpeg(input_path, output_dir, payload.presence_boost, payload.reverb_amount, payload.stereo_width, payload.bus_compress)

    enhanced_file_id = None
    if result_data.get("status") == "completed":
        enhanced_wav_path = Path(result_data["wav"])
        enhanced_file_id = make_id("file")
        enhanced_workspace = file_workspace(enhanced_file_id)
        dest = enhanced_workspace / "original" / "enhanced.wav"
        shutil.copy2(enhanced_wav_path, dest)
        FILES[enhanced_file_id] = {
            "file_id": enhanced_file_id, "filename": "enhanced.wav",
            "content_type": "audio/wav", "size_bytes": dest.stat().st_size,
            "stored_path": str(dest), "workspace": str(enhanced_workspace),
            "metadata": read_basic_audio_metadata(dest),
            "parent_file_id": payload.file_id,
            "downloads": {"original": f"/api/v1/files/{enhanced_file_id}/download/original"},
        }
        save_store()

    downloads = {}
    if result_data.get("status") == "completed":
        downloads["enhanced_wav"] = f"/api/v1/files/{payload.file_id}/download/enhanced-wav"
        if result_data.get("mp3_exists"):
            downloads["enhanced_mp3"] = f"/api/v1/files/{payload.file_id}/download/enhanced-mp3"
        if enhanced_file_id:
            downloads["enhanced_original"] = f"/api/v1/files/{enhanced_file_id}/download/original"

    result = {
        "file_id": payload.file_id, "enhanced_file_id": enhanced_file_id,
        "enhance": result_data, "downloads": downloads,
    }
    msg = "Mix enhancement complete" if result_data.get("status") == "completed" else f"Mix enhancement failed: {result_data.get('reason', result_data.get('stderr', ''))}"
    return complete_job(job, result, msg)


@app.post("/api/v1/vocal/clean")
def clean_vocals(payload: CleanVocalsRequest):
    file_data = get_file_or_404(payload.file_id)
    input_path = Path(file_data["stored_path"])
    output_dir = Path(file_data["workspace"]) / "renders"
    job = create_job(JobType.clean_vocals, message="Vocal cleaning started")
    result_data = clean_vocals_with_ffmpeg(input_path, output_dir)
    downloads = {}
    if result_data.get("status") == "completed":
        downloads["cleaned_wav"] = f"/api/v1/files/{payload.file_id}/download/cleaned-wav"
        if result_data.get("mp3_exists"):
            downloads["cleaned_mp3"] = f"/api/v1/files/{payload.file_id}/download/cleaned-mp3"
    result = {"file_id": payload.file_id, "clean": result_data, "downloads": downloads}
    msg = "Vocal cleaning complete" if result_data.get("status") == "completed" else f"Vocal cleaning failed: {result_data.get('reason', result_data.get('stderr', ''))}"
    return complete_job(job, result, msg)


@app.post("/api/v1/audio/mix-vocal-beat")
def mix_vocal_beat(payload: MixVocalBeatRequest):
    vocal_data = get_file_or_404(payload.vocal_file_id)
    beat_data = get_file_or_404(payload.beat_file_id)

    vocal_path = Path(vocal_data["stored_path"])
    beat_path = Path(beat_data["stored_path"])

    cleaned_vocal = Path(vocal_data["workspace"]) / "renders" / "vocals-cleaned.wav"
    if cleaned_vocal.exists():
        vocal_path = cleaned_vocal

    output_dir = Path(vocal_data["workspace"]) / "renders"
    job = create_job(JobType.mix_vocal_beat, message="Mixing vocals with beat")
    mix_result = mix_vocal_beat_with_ffmpeg(
        vocal_path, beat_path, output_dir,
        payload.vocal_gain, payload.beat_gain,
        payload.vocal_presence_boost, payload.beat_stereo_width, payload.bus_compress,
        payload.reverb_amount,
    )

    mixed_file_id = None
    if mix_result.get("status") == "completed":
        mixed_wav_path = Path(mix_result["wav"])
        mixed_file_id = make_id("file")
        mixed_workspace = file_workspace(mixed_file_id)
        dest = mixed_workspace / "original" / "mixed.wav"
        shutil.copy2(mixed_wav_path, dest)
        mixed_metadata = read_basic_audio_metadata(dest)
        FILES[mixed_file_id] = {
            "file_id": mixed_file_id,
            "filename": "mixed.wav",
            "content_type": "audio/wav",
            "size_bytes": dest.stat().st_size,
            "stored_path": str(dest),
            "workspace": str(mixed_workspace),
            "metadata": mixed_metadata,
            "parent_vocal_id": payload.vocal_file_id,
            "parent_beat_id": payload.beat_file_id,
            "downloads": {"original": f"/api/v1/files/{mixed_file_id}/download/original"},
        }
        save_store()

    downloads = {}
    if mix_result.get("status") == "completed":
        downloads["mixed_wav"] = f"/api/v1/files/{payload.vocal_file_id}/download/mixed-wav"
        if mix_result.get("mp3_exists"):
            downloads["mixed_mp3"] = f"/api/v1/files/{payload.vocal_file_id}/download/mixed-mp3"
        if mixed_file_id:
            downloads["mixed_original"] = f"/api/v1/files/{mixed_file_id}/download/original"

    result = {
        "vocal_file_id": payload.vocal_file_id,
        "beat_file_id": payload.beat_file_id,
        "mixed_file_id": mixed_file_id,
        "vocal_gain": payload.vocal_gain,
        "beat_gain": payload.beat_gain,
        "used_cleaned_vocal": cleaned_vocal.exists(),
        "mix": mix_result,
        "downloads": downloads,
    }
    msg = "Mix complete" if mix_result.get("status") == "completed" else f"Mix failed: {mix_result.get('reason', mix_result.get('stderr', ''))}"
    return complete_job(job, result, msg)


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
