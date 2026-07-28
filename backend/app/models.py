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
    analyze_ai = "analyze_ai"
    transform_style = "transform_style"


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
    user_id: str = ""
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
    warmth: float = 0.0  # 0.0 = clean digital, 1.0 = heavy tape/tube saturation
    low_eq: float = 0.0   # dB adjustment for bass (<200 Hz), range -12 to +12
    mid_eq: float = 0.0   # dB adjustment for mids (200 Hz–4 kHz)
    high_eq: float = 0.0  # dB adjustment for highs (>4 kHz)


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
    reverb_amount: float = 0.2  # 0.0 = dry, 1.0 = large hall


class EnhanceMixRequest(BaseModel):
    file_id: str
    presence_boost: bool = True
    reverb_amount: float = 0.2
    stereo_width: float = 1.3
    bus_compress: bool = True


class StylePreviewRequest(BaseModel):
    file_id: str
    mode: str = "Custom AI adaptive"
    strength: int = 72
    warmth: float = 0.3


class SoundGenerateRequest(BaseModel):
    prompt: str
    intensity: int = 68
    genre: str = "Cinematic"
    emotion: str = "Mystic"


class TransformStyleRequest(BaseModel):
    file_id: str
    mode: str = "Afrobeat"
    strength: int = 72
    duration: int = 30


class AiAnalyzeRequest(BaseModel):
    file_id: str
    genre: str = "Custom AI adaptive"


class AudioProblem(BaseModel):
    band: str
    severity: str  # "low" | "medium" | "high"
    description: str
    value: float | None = None


class ProcessingDecision(BaseModel):
    processor: str
    action: str
    reason: str
    value: str | None = None


class ProjectCreateRequest(BaseModel):
    title: str
    artist: str = "Unknown Artist"
    genre: str = "Unknown"
    status: str = "Draft"
    notes: str = ""
