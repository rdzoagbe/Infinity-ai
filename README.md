# Infinity AI Music Platform

Infinity is a futuristic AI-powered music production ecosystem prototype.

## Included now
- Premium cinematic responsive frontend
- AI Mix & Master page
- AI DAW / Sound Creator page
- AI Sound Generator page
- Export system page
- AI architecture roadmap page

## Next backend phase
- Python FastAPI
- Librosa BPM/key detection
- Demucs source separation
- Essentia feature extraction
- FFmpeg rendering
- PyTorch inference workers
- Firebase/Supabase storage

## Infinity v4 Backend

The repository now includes a FastAPI backend scaffold in `backend/`.

Run locally:

```powershell
cd backend
.\run-dev.ps1
```

Then open:

```text
http://localhost:8000/docs
```

Frontend API helper:

```text
src/api/infinityBackend.js
```

Set this environment variable when connecting frontend to backend:

```text
VITE_INFINITY_API_URL=http://localhost:8000
```