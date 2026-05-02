# AudioMagic.ai Frontend MVP v3

A premium dark-mode Vite + React + TypeScript MVP for a guided music-production workflow:

**Lyrics → Producer → Engineer → Export**

## v3 Highlights

- Clickable dashboard stat cards that filter projects by workflow state.
- New **Lyrics to Song** dashboard section where lyrics can be pasted directly.
- Genre and beat-pattern selection from the Producer Beat Library before creating a song.
- Automatic routing from Dashboard to Producer Mode after creating a lyrics-based project.
- Producer Mode now reads the lyrics, renders the selected beat as a browser-generated WAV, creates an arrangement brief, and includes **Send to Engineer**.
- Engineer Mode includes a producer handoff summary, visual Sonic Stage, draggable stems, stereo pan/depth gain adjustment, A/B comparison, and real JSZip export.
- GitHub Actions workflow included for build validation.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, lucide-react, JSZip, Web Audio API.

## Notes

The AI co-writer, beat generation, AI mastering, and engineering features are frontend MVP simulations. The beat engine generates browser-rendered WAV files using the Web Audio API. Real AI generation, cloud storage, authentication, and payment features should be added through backend services in a later phase.
