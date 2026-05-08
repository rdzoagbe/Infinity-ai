# Infinity v6 Testing Guide

Infinity v6 moves the app beyond placeholder-only backend logic.

## What v6 adds

- Backend capability reporting through `/health`
- Real file workspace structure per upload
- FFprobe/mutagen metadata extraction
- Real analysis JSON written to backend storage
- FFmpeg-based mastering render when FFmpeg is installed
- Download endpoints for original file, analysis JSON, mastered WAV, and mastered MP3
- Export package endpoint with downloadable asset routes

## Required local services

Terminal 1 — backend:

```powershell
cd C:\Users\TheKwekuRO\Downloads\Infinity-ai\backend
.\run-dev.ps1
```

Backend docs:

```text
http://localhost:8000/docs
```

Terminal 2 — frontend:

```powershell
cd C:\Users\TheKwekuRO\Downloads\Infinity-ai
npm run dev
```

Frontend:

```text
http://localhost:3000
```

## Recommended FFmpeg install

If mastering says `ffmpeg/ffprobe not found`, install FFmpeg:

```powershell
winget install -e --id Gyan.FFmpeg
```

Close and reopen PowerShell, then run:

```powershell
ffmpeg -version
ffprobe -version
```

## Test flow

1. Open the frontend.
2. Sign in.
3. Create or open a project.
4. Open Mix & Master / Upload audio.
5. Upload MP3, WAV, or FLAC.
6. Confirm backend connected.
7. Confirm backend file ID appears.
8. Confirm analysis returns duration, sample rate, estimated BPM, key, and genre.
9. Click Run Mix.
10. Click Run Master.
11. If FFmpeg is installed, mastered WAV/MP3 should be created.
12. Click Separate Stems.
13. Click Create Export Package.
14. Export the full-stack session JSON.

## Current limits

- BPM/key/genre are heuristic until Librosa/Essentia integration.
- Stem separation is still placeholder until Demucs integration.
- AI sound generation is still placeholder until model/API integration.
- Mastering is FFmpeg DSP-based, not neural mastering yet.
