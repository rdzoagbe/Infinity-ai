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
## Infinity v5 Frontend to Backend

The audio workflow now connects the frontend upload overlay to the local FastAPI backend.

Run backend:

```powershell
cd backend
.\run-dev.ps1
```

Run frontend locally:

```powershell
npm run dev
```

Default backend URL:

```text
http://localhost:8000
```

Override it with:

```text
VITE_INFINITY_API_URL=http://localhost:8000
```

Frontend flow:

1. Open Infinity studio
2. Click Start Mix & Master or Upload audio
3. Upload MP3/WAV/FLAC/ZIP
4. Browser waveform/player appears
5. File is uploaded to FastAPI
6. Backend analyze endpoint runs
7. Mix/master/stem/export placeholder jobs can be triggered from the frontend