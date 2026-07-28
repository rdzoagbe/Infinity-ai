"""Persistent metadata store.

All four collections (files, projects, jobs, sound assets) persist to
``storage/_store.json`` so a restart no longer 404s in-flight polls or forgets
generated assets. Job progress updates stay in memory (they change every few
hundred ms); jobs are persisted on create / complete / fail, and any job still
marked ``processing`` at startup is failed as interrupted.

This module is deliberately a thin repository layer: swapping it for a
Postgres-backed implementation (see supabase/migrations/) changes nothing in
the endpoint code, which only uses the helpers below.
"""

import json
import logging
import threading
from datetime import datetime
from uuid import uuid4

from .models import Job, JobStatus, JobType

logger = logging.getLogger("infinity.store")

JOBS: dict[str, Job] = {}
PROJECTS: dict[str, dict] = {}
FILES: dict[str, dict] = {}
SOUND_ASSETS: dict[str, dict] = {}

_lock = threading.Lock()
_store_path = None
_audit_path = None


def _get_store_path():
    global _store_path
    if _store_path is None:
        from .config import get_settings
        _store_path = get_settings().storage_path / "_store.json"
    return _store_path


def _get_audit_path():
    global _audit_path
    if _audit_path is None:
        from .config import get_settings
        _audit_path = get_settings().storage_path / "audit.log"
    return _audit_path


def load_store() -> None:
    try:
        path = _get_store_path()
        if not path.exists():
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        FILES.update(data.get("files", {}))
        PROJECTS.update(data.get("projects", {}))
        SOUND_ASSETS.update(data.get("sound_assets", {}))
        interrupted = 0
        for job_id, raw in data.get("jobs", {}).items():
            try:
                job = Job.model_validate(raw)
            except Exception:
                continue
            if job.status == JobStatus.processing:
                job.status = JobStatus.failed
                job.message = "Interrupted by a server restart — start this step again."
                interrupted += 1
            JOBS[job_id] = job
        if interrupted:
            logger.warning("Marked %d in-flight jobs as interrupted after restart", interrupted)
    except Exception as exc:
        logger.error("Failed to load store: %s", exc)


def save_store() -> None:
    try:
        with _lock:
            payload = {
                "files": dict(FILES),
                "projects": dict(PROJECTS),
                "sound_assets": dict(SOUND_ASSETS),
                "jobs": {job_id: job.model_dump(mode="json") for job_id, job in JOBS.items()},
            }
            tmp = _get_store_path().with_suffix(".json.tmp")
            tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
            tmp.replace(_get_store_path())
    except Exception as exc:
        logger.error("Failed to save store: %s", exc)


def audit(event: str, user_id: str, **details) -> None:
    """Append an audit event. Never logs file contents or filenames beyond ids."""
    try:
        entry = {"ts": datetime.utcnow().isoformat(), "event": event, "user_id": user_id, **details}
        with _lock:
            with _get_audit_path().open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, default=str) + "\n")
    except Exception:
        pass


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


def user_storage_bytes(user_id: str) -> int:
    return sum(f.get("size_bytes", 0) for f in FILES.values() if f.get("user_id") == user_id)


def create_job(job_type: JobType, user_id: str = "", message: str = "Queued", result: dict | None = None) -> Job:
    job = Job(
        job_id=make_id("job"),
        job_type=job_type,
        user_id=user_id,
        status=JobStatus.completed if result else JobStatus.processing,
        message=message,
        progress=100 if result else 0,
        result=result,
    )
    JOBS[job.job_id] = job
    save_store()
    return job


def update_job_progress(job_id: str, progress: int, message: str) -> None:
    job = JOBS.get(job_id)
    if job:
        job.progress = progress
        job.message = message
        job.status = JobStatus.processing
        job.updated_at = datetime.utcnow()


def fail_job(job_id: str, message: str) -> None:
    job = JOBS.get(job_id)
    if job:
        job.status = JobStatus.failed
        job.message = message
        job.updated_at = datetime.utcnow()
        save_store()


def complete_job(job: Job, result: dict, message: str = "Completed") -> Job:
    job.status = JobStatus.completed
    job.message = message
    job.progress = 100
    job.result = result
    job.updated_at = datetime.utcnow()
    JOBS[job.job_id] = job
    save_store()
    return job
