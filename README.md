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

## Elite engineering foundation

The `elite-audio-analysis-foundation` branch introduces the first backend foundation for a more professional mix/master workflow.

It adds `backend/app/elite_engine.py`, which defines:

- Genre-specific mastering targets
- Mix-plan generation
- Master-plan generation
- Quality-control flags
- Frequency balance reporting
- Plugin-to-DSP translation notes
- Structured deliverables for engineering reports

This is the first step toward turning Infinity from a prompt-driven prototype into a structured audio engineering system.

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
## Infinity v6 Real Audio

v6 upgrades the backend:

- Real FFprobe/mutagen metadata analysis
- Per-file storage workspace
- FFmpeg mastering chain when FFmpeg is installed
- Download endpoints for original, analysis JSON, mastered WAV, mastered MP3

Install FFmpeg:

```powershell
winget install -e --id Gyan.FFmpeg
```
