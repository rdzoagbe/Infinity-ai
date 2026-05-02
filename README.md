# AudioMagic.ai Frontend MVP

A premium dark-mode Vite + React + TypeScript MVP for an all-in-one music production platform serving three personas in one persistent workspace:

- **Artist Mode**: lyrics notepad, simulated AI co-writer, MediaRecorder vocal capture, voice cloning consent UX.
- **Producer Mode**: recorded vocal preview, AI beat prompt simulation, generated browser-rendered beat, drag/drop stem uploads using `URL.createObjectURL()`.
- **Engineer Mode**: Framer Motion spatial stem tokens, Web Audio API `StereoPannerNode` and `GainNode`, master playback, time-synced Raw / AI Master A/B compare, reactive waveform, simulated ZIP export.

## Run

```bash
npm install
npm run dev
```

## Files

```text
src/App.tsx
src/components/Dashboard.tsx
src/components/Workspace.tsx
src/components/ArtistTab.tsx
src/components/ProducerTab.tsx
src/components/EngineerTab.tsx
src/types.ts
src/utils.ts
src/index.css
```

## Notes

This MVP is frontend-only. The AI co-writer, AI beat generation, AI mastering, and ZIP export are intentionally simulated but isolated behind component-level functions so real services can replace them.
