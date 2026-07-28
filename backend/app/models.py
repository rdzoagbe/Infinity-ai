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
    strength: int = Field(default=72, ge=0, le=100)
    platform: str = "spotify"
    air_boost: bool = False
    warmth: float = Field(default=0.0, ge=0.0, le=1.0)   # 0 = clean digital, 1 = heavy saturation
    low_eq: float = Field(default=0.0, ge=-12.0, le=12.0)   # dB, bass (<200 Hz)
    mid_eq: float = Field(default=0.0, ge=-12.0, le=12.0)   # dB, mids (200 Hz–4 kHz)
    high_eq: float = Field(default=0.0, ge=-12.0, le=12.0)  # dB, highs (>4 kHz)
    target_lufs: float | None = Field(default=None, ge=-24.0, le=-6.0)  # overrides platform/genre blend
    tp_ceiling: float | None = Field(default=None, ge=-3.0, le=-0.1)    # dBTP limiter ceiling


class CleanVocalsRequest(BaseModel):
    file_id: str


class MixVocalBeatRequest(BaseModel):
    """Full parametric control surface for the vocal+beat mix.

    Every value is clamped again server-side in chains.normalize_vocal_beat_params —
    these bounds reject clearly invalid payloads early.
    """
    vocal_file_id: str
    beat_file_id: str
    vocal_gain: float = Field(default=1.0, ge=0.0, le=2.0)
    beat_gain: float = Field(default=0.85, ge=0.0, le=2.0)
    vocal_mute: bool = False
    beat_mute: bool = False
    presence: float = Field(default=2.0, ge=-6.0, le=6.0)     # dB bell at 3.2 kHz
    air: float = Field(default=1.8, ge=0.0, le=6.0)           # dB shelf at 12 kHz
    clarity: float = Field(default=0.0, ge=-6.0, le=6.0)      # dB bell at 1.8 kHz
    warmth: float = Field(default=0.25, ge=0.0, le=1.0)       # Infinity Harmonics amount
    deess: float = Field(default=0.5, ge=0.0, le=1.0)         # Infinity De-Esser amount
    compression: float = Field(default=0.5, ge=0.0, le=1.0)   # Infinity Opto amount
    reverb_amount: float = Field(default=0.2, ge=0.0, le=1.0)  # Infinity Space send
    delay_amount: float = Field(default=0.0, ge=0.0, le=1.0)   # Infinity Echo send
    beat_stereo_width: float = Field(default=1.5, ge=1.0, le=3.0)
    bus_compress: bool = True
    # Legacy field kept for old clients; superseded by presence/air.
    vocal_presence_boost: bool = True

    def chain_params(self) -> dict:
        return {
            "vocal_gain": self.vocal_gain,
            "beat_gain": self.beat_gain,
            "vocal_mute": self.vocal_mute,
            "beat_mute": self.beat_mute,
            "presence": self.presence,
            "air": self.air,
            "clarity": self.clarity,
            "warmth": self.warmth,
            "deess": self.deess,
            "compression": self.compression,
            "reverb": self.reverb_amount,
            "delay": self.delay_amount,
            "beat_stereo_width": self.beat_stereo_width,
            "bus_compress": self.bus_compress,
        }


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
