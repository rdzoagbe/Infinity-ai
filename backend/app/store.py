from datetime import datetime
from uuid import uuid4
from .models import Job, JobStatus, JobType

JOBS: dict[str, Job] = {}
PROJECTS: dict[str, dict] = {}
FILES: dict[str, dict] = {}


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