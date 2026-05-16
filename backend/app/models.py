from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class JobType(str, Enum):
    upload = "upload"
    analyze = "analyze"
    mix = "mix"
    master = "master"
    separate_stems = "separate_stems"
    generate_sound = "generate_sound"
    export = "export"
    clean_vocals = "clean_vocals"
    mix_vocal_beat = "mix_vocal_beat"


class AudioFileMetadata(BaseModel):
    file_id: str
    filename: str
    content_type: str | None = None
    size_bytes: int
    stored_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Job(BaseModel):
    job_id: str
    job_type: JobType
    status: JobStatus = JobStatus.queued
    message: str = "Queued"
    progress: int = 0
    result: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AnalyzeRequest(BaseModel):
    file_id: str


class ProcessRequest(BaseModel):
    file_id: str
    mode: str = "Custom AI adaptive"
    strength: int = 72
    platform: str = "spotify"
    air_boost: bool = False


class CleanVocalsRequest(BaseModel):
    file_id: str


class MixVocalBeatRequest(BaseModel):
    vocal_file_id: str
    beat_file_id: str
    vocal_gain: float = 1.0
    beat_gain: float = 0.85
    vocal_presence_boost: bool = True
    beat_stereo_width: float = 1.5
    bus_compress: bool = True


class SoundGenerateRequest(BaseModel):
    prompt: str
    intensity: int = 68
    genre: str = "Cinematic"
    emotion: str = "Mystic"


class ProjectCreateRequest(BaseModel):
    title: str
    artist: str = "Unknown Artist"
    genre: str = "Unknown"
    status: str = "Draft"
    notes: str = ""
