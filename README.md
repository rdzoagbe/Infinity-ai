# AudioMagic.ai Frontend MVP

A premium dark-mode Vite + React + TypeScript MVP for an all-in-one music production platform serving three personas in one persistent workspace.

## Features

- Studio Dashboard with project stats, cards, and Start New Project flow.
- Unified Workspace with persistent Artist, Producer, and Engineer modes.
- Artist Mode: smart lyrics notepad, simulated AI co-writer, MediaRecorder vocal recording, and voice cloning consent UI.
- Producer Mode: vocal preview, simulated beat generation, drag/drop stem upload, playable stems.
- Engineer Mode: Framer Motion spatial mixing stage, Web Audio API pan/gain wiring, master playback, Raw / AI Master A/B compare, reactive waveform, and simulated ZIP export.

## Run

```bash
npm install
npm run dev
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, lucide-react, Web Audio API.

## Notes

The AI co-writer, AI beat generation, AI mastering, and ZIP export are frontend simulations. They are intentionally isolated so backend AI/audio services can replace them later.
