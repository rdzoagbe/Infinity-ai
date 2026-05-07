# Infinity v4 Backend Scaffold

This is the first FastAPI backend scaffold for Infinity.

## What it provides now

- Health check endpoint
- Audio upload endpoint
- Browser-safe CORS setup
- Local storage folder for uploaded audio
- File metadata extraction
- Job creation and job status endpoint
- Analysis placeholder endpoint
- Mix placeholder endpoint
- Master placeholder endpoint
- Stem separation placeholder endpoint
- Sound generation placeholder endpoint
- Export package placeholder endpoint

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open:

```text
http://localhost:8000/docs
```

## Important

This backend is a scaffold. It does not yet perform real Librosa, Demucs, FFmpeg, or PyTorch processing.
Those modules should be added in v5/v6.