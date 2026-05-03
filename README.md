# AudioMagic.ai Frontend MVP v4

A premium dark-mode Vite + React + TypeScript MVP for an all-in-one music production platform that guides a complete studio session cycle.

## v4 Studio Cycle

AudioMagic.ai v4 is organized around a complete song lifecycle:

`Idea → Lyrics → Demo Vocal → Beat → Arrangement → Recording → Mix → Master → Release Package`

## Features

- Studio Dashboard with clickable project stats and quick project filtering.
- Lyrics to Song creator: paste lyrics, select genre, select beat pattern, and route directly to Producer Mode.
- Unified Workspace with persistent Artist, Producer, and Engineer modes.
- v4 Complete Studio Cycle panel:
  - Lifecycle progress tracker.
  - Artist / Producer / Engineer role lanes.
  - BPM, key, mood, reference track, and mastering preset metadata.
  - Arrangement builder with sections, bar counts, energy, and notes.
  - Session history timeline.
  - Stem manager and mix console controls.
  - Release package checklist.
- Artist Mode: smart lyrics notepad, simulated AI co-writer, MediaRecorder vocal recording, and voice cloning consent UI.
- Producer Mode: beat library, browser-generated WAV beats, arrangement brief, stem upload, and handoff to Engineer Mode.
- Engineer Mode: visual Sonic Stage, pan/gain/depth adjustment, A/B master compare, waveform feedback, and real JSZip export.
- GitHub Actions workflow for production build validation.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, lucide-react, JSZip, Web Audio API.

## Notes

The AI co-writer, producer intelligence, mastering logic, and beat generation are frontend simulations. They are designed as UI/API integration points for a backend AI/audio pipeline later.
