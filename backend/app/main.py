from pathlib import Path
from uuid import uuid4
import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .audio import placeholder_analysis, read_basic_audio_metadata
from .config import get_settings
from .models import AnalyzeRequest, JobType, ProcessRequest, ProjectCreateRequest, SoundGenerateRequest
from .store import FILES, JOBS, PROJECTS, complete_job, create_job, make_id

settings = get_settings()

app = FastAPI(
    title="Infinity AI Audio Backend",
    version="4.0.0",
    description="FastAPI backend scaffold for Infinity AI music production.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Infinity AI Audio Backend",
        "version": "4.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.infinity_env}


@app.post("/api/v1/projects")
def create_project(payload: ProjectCreateRequest):
    project_id = make_id("project")
    project = {
        "project_id": project_id,
        "title": payload.title,
        "artist": payload.artist,
        "genre": payload.genre,
        "status": payload.status,
        "notes": payload.notes,
        "files": [],
    }
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
    safe_name = f"{file_id}{suffix}"
    stored_path = settings.storage_path / safe_name

    size = 0
    async with aiofiles.open(stored_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            max_bytes = settings.infinity_max_upload_mb * 1024 * 1024
            if size > max_bytes:
                raise HTTPException(status_code=413, detail="File exceeds upload limit")
            await out.write(chunk)

    metadata = read_basic_audio_metadata(stored_path) if suffix != ".zip" else {"package": "stem_zip"}
    FILES[file_id] = {
        "file_id": file_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": size,
        "stored_path": str(stored_path),
        "metadata": metadata,
    }

    job = create_job(
        JobType.upload,
        message="Upload complete",
        result={"file": FILES[file_id]},
    )

    return {"file": FILES[file_id], "job": job}


@app.post("/api/v1/audio/analyze")
def analyze_audio(payload: AnalyzeRequest):
    file_data = FILES.get(payload.file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")

    job = create_job(JobType.analyze, message="Analysis started")
    result = placeholder_analysis(file_data["filename"], payload.file_id, file_data.get("metadata", {}))
    job = complete_job(job, result=result, message="Placeholder analysis complete")
    return job


@app.post("/api/v1/audio/mix")
def mix_audio(payload: ProcessRequest):
    if payload.file_id not in FILES:
        raise HTTPException(status_code=404, detail="File not found")

    job = create_job(JobType.mix, message="Mix job started")
    result = {
        "file_id": payload.file_id,
        "mode": payload.mode,
        "strength": payload.strength,
        "steps": ["vocal cleanup", "frequency balance", "compression", "stereo image"],
        "note": "Placeholder mix job. Real DSP/AI processing comes in v5/v6.",
    }
    return complete_job(job, result, "Placeholder mix complete")


@app.post("/api/v1/audio/master")
def master_audio(payload: ProcessRequest):
    if payload.file_id not in FILES:
        raise HTTPException(status_code=404, detail="File not found")

    job = create_job(JobType.master, message="Mastering job started")
    result = {
        "file_id": payload.file_id,
        "mode": payload.mode,
        "strength": payload.strength,
        "target_lufs": "-9.5",
        "exports": ["wav", "mp3", "flac"],
        "note": "Placeholder mastering job. FFmpeg/pyloudnorm chain comes next.",
    }
    return complete_job(job, result, "Placeholder mastering complete")


@app.post("/api/v1/audio/separate-stems")
def separate_stems(payload: AnalyzeRequest):
    if payload.file_id not in FILES:
        raise HTTPException(status_code=404, detail="File not found")

    job = create_job(JobType.separate_stems, message="Stem separation queued")
    result = {
        "file_id": payload.file_id,
        "stems": ["vocals", "drums", "bass", "other"],
        "note": "Placeholder stems. Demucs integration comes later.",
    }
    return complete_job(job, result, "Placeholder stems created")


@app.post("/api/v1/sound/generate")
def generate_sound(payload: SoundGenerateRequest):
    job = create_job(JobType.generate_sound, message="Sound generation queued")
    result = {
        "prompt": payload.prompt,
        "intensity": payload.intensity,
        "genre": payload.genre,
        "emotion": payload.emotion,
        "assets": [],
        "note": "Placeholder generation. Real audio generation model/API comes later.",
    }
    return complete_job(job, result, "Placeholder sound generation complete")


@app.post("/api/v1/export/package")
def export_package(payload: AnalyzeRequest):
    if payload.file_id not in FILES:
        raise HTTPException(status_code=404, detail="File not found")

    job = create_job(JobType.export, message="Export package queued")
    result = {
        "file_id": payload.file_id,
        "formats": ["mp3", "wav", "flac", "stems", "project-session"],
        "note": "Placeholder export package. FFmpeg rendering comes next.",
    }
    return complete_job(job, result, "Placeholder export package ready")


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job