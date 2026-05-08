from pathlib import Path
import json
import shutil
import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .audio import full_audio_analysis, has_ffmpeg, read_basic_audio_metadata, render_master_with_ffmpeg
from .config import get_settings
from .models import AnalyzeRequest, JobType, ProcessRequest, ProjectCreateRequest, SoundGenerateRequest
from .store import FILES, JOBS, PROJECTS, complete_job, create_job, make_id

settings = get_settings()

app = FastAPI(title="Infinity AI Audio Backend", version="6.0.0", description="FastAPI backend for Infinity AI music production.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def file_workspace(file_id: str) -> Path:
    root = settings.storage_path / file_id
    for folder in ("original", "analysis", "renders", "stems", "exports"):
        (root / folder).mkdir(parents=True, exist_ok=True)
    return root


def get_file_or_404(file_id: str) -> dict:
    file_data = FILES.get(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")
    return file_data


@app.get("/")
def root():
    return {"name": "Infinity AI Audio Backend", "version": "6.0.0", "status": "online", "ffmpeg_available": has_ffmpeg(), "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.infinity_env, "ffmpeg_available": has_ffmpeg()}


@app.post("/api/v1/projects")
def create_project(payload: ProjectCreateRequest):
    project_id = make_id("project")
    project = {"project_id": project_id, "title": payload.title, "artist": payload.artist, "genre": payload.genre, "status": payload.status, "notes": payload.notes, "files": []}
    PROJECTS[project_id] = project
    return project


@app.get("/api/v1/projects")
def list_projects():
    return {"projects": list(PROJECTS.values())}


@app.post("/api/v1/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    suffix = Path(file.filename).suffix.lower()
    allowed = {".mp3", ".wav", ".flac", ".zip", ".m4a", ".aac", ".ogg"}
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

    metadata = read_basic_audio_metadata(stored_path) if suffix != ".zip" else {"package": "stem_zip", "ffmpeg_available": has_ffmpeg()}
    record = {"file_id": file_id, "filename": file.filename, "content_type": file.content_type, "size_bytes": size, "stored_path": str(stored_path), "workspace": str(workspace), "metadata": metadata}
    FILES[file_id] = record
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
    return complete_job(job, result=result, message="Infinity v6 analysis complete")


@app.post("/api/v1/audio/mix")
def mix_audio(payload: ProcessRequest):
    get_file_or_404(payload.file_id)
    job = create_job(JobType.mix, message="Mix job started")
    result = {"file_id": payload.file_id, "mode": payload.mode, "strength": payload.strength, "steps": ["vocal cleanup placeholder", "frequency balance placeholder", "compression placeholder", "stereo image placeholder"], "note": "Infinity v6 keeps mix as structured placeholder. Real multitrack processing comes after stem separation."}
    return complete_job(job, result, "Structured mix job complete")


@app.post("/api/v1/audio/master")
def master_audio(payload: ProcessRequest):
    file_data = get_file_or_404(payload.file_id)
    input_path = Path(file_data["stored_path"])
    output_dir = Path(file_data["workspace"]) / "renders"
    job = create_job(JobType.master, message="Mastering job started")
    render = render_master_with_ffmpeg(input_path, output_dir, payload.mode, payload.strength)
    result = {"file_id": payload.file_id, "mode": payload.mode, "strength": payload.strength, "target_lufs": "-14 integrated / -1.5 dBTP", "render": render, "downloads": {}}
    if render.get("status") == "completed":
        result["downloads"] = {"master_wav": f"/api/v1/files/{payload.file_id}/download/master-wav", "master_mp3": f"/api/v1/files/{payload.file_id}/download/master-mp3"}
    return complete_job(job, result, "Infinity v6 mastering complete" if render.get("status") == "completed" else "Mastering skipped or failed")


@app.post("/api/v1/audio/separate-stems")
def separate_stems(payload: AnalyzeRequest):
    get_file_or_404(payload.file_id)
    job = create_job(JobType.separate_stems, message="Stem separation queued")
    result = {"file_id": payload.file_id, "stems": ["vocals", "drums", "bass", "other"], "note": "Placeholder stems. Demucs integration is v7."}
    return complete_job(job, result, "Placeholder stems created")


@app.post("/api/v1/sound/generate")
def generate_sound(payload: SoundGenerateRequest):
    job = create_job(JobType.generate_sound, message="Sound generation queued")
    result = {"prompt": payload.prompt, "intensity": payload.intensity, "genre": payload.genre, "emotion": payload.emotion, "assets": [], "note": "Placeholder generation. Real audio generation model/API comes later."}
    return complete_job(job, result, "Placeholder sound generation complete")


@app.post("/api/v1/export/package")
def export_package(payload: AnalyzeRequest):
    file_data = get_file_or_404(payload.file_id)
    workspace = Path(file_data["workspace"])
    original_path = Path(file_data["stored_path"])
    exports_dir = workspace / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(original_path, exports_dir / original_path.name)
    job = create_job(JobType.export, message="Export package queued")
    result = {"file_id": payload.file_id, "formats": ["original", "analysis", "master-wav-if-rendered", "master-mp3-if-rendered"], "downloads": {"original": f"/api/v1/files/{payload.file_id}/download/original", "analysis": f"/api/v1/files/{payload.file_id}/download/analysis", "master_wav": f"/api/v1/files/{payload.file_id}/download/master-wav", "master_mp3": f"/api/v1/files/{payload.file_id}/download/master-mp3"}}
    return complete_job(job, result, "Infinity v6 export package ready")


@app.get("/api/v1/files/{file_id}/download/{asset_type}")
def download_file(file_id: str, asset_type: str):
    file_data = get_file_or_404(file_id)
    workspace = Path(file_data["workspace"])
    original_path = Path(file_data["stored_path"])
    paths = {"original": original_path, "analysis": workspace / "analysis" / "analysis.json", "master-wav": workspace / "renders" / "mastered.wav", "master-mp3": workspace / "renders" / "mastered.mp3"}
    path = paths.get(asset_type)
    if not path:
        raise HTTPException(status_code=400, detail="Unknown asset type")
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Asset not found: {asset_type}")
    return FileResponse(path, filename=path.name)


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job