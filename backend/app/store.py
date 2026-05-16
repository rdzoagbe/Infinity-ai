import json
import threading
from datetime import datetime
from uuid import uuid4
from .models import Job, JobStatus, JobType

JOBS: dict[str, Job] = {}
PROJECTS: dict[str, dict] = {}
FILES: dict[str, dict] = {}
SOUND_ASSETS: dict[str, dict] = {}

_lock = threading.Lock()
_store_path = None


def _get_store_path():
    global _store_path
    if _store_path is None:
        from .config import get_settings
        _store_path = get_settings().storage_path / "_store.json"
    return _store_path


def load_store() -> None:
    try:
        path = _get_store_path()
        if not path.exists():
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        FILES.update(data.get("files", {}))
        PROJECTS.update(data.get("projects", {}))
    except Exception:
        pass


def save_store() -> None:
    try:
        with _lock:
            _get_store_path().write_text(
                json.dumps({"files": dict(FILES), "projects": dict(PROJECTS)}, indent=2, default=str),
                encoding="utf-8",
            )
    except Exception:
        pass


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


def create_job(job_type: JobType, message: str = "Queued", result: dict | None = None) -> Job:
    job = Job(
        job_id=make_id("job"),
        job_type=job_type,
        status=JobStatus.completed if result else JobStatus.queued,
        message=message,
        progress=100 if result else 0,
        result=result,
    )
    JOBS[job.job_id] = job
    return job


def complete_job(job: Job, result: dict, message: str = "Completed") -> Job:
    job.status = JobStatus.completed
    job.message = message
    job.progress = 100
    job.result = result
    job.updated_at = datetime.utcnow()
    JOBS[job.job_id] = job
    return job
