# AudioMagic.ai MVP v8

AudioMagic.ai is a browser-based AI music-studio workflow prototype built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, Web Audio API, and JSZip.

## v8 focus: Creator Tools & Stem Intelligence

v8 adds DAW-inspired creator tools while keeping the guided AudioMagic flow: lyrics → copilot → producer → engineer → release.

New v8 capabilities:

- AI MixSplit-style upload panel that creates editable separated stem lanes: vocals, drums, bass, melody, and other
- Step Sequencer grid for kick, snare, hat, and bass pattern editing
- Vocal Chain preset panel for Afrobeat lead, R&B smooth stack, drill vocal cut, and clean spoken voice
- Sound Pack browser with starter kits for Afrobeat, R&B, Trap, and Lo-Fi
- Stem waveform widgets with mute, solo, volume, pan, fade-in, and fade-out controls
- Workspace-level Creator Tools panel mounted directly under the AI Song Copilot
- Extended stem metadata for future real DSP integration: split role, source tool, mute/solo, fades, and trims

## Retained from v7

- AI Song Copilot with mood, key, BPM, density, structure, and next-action guidance
- Song readiness score and missing-step checklist
- Music-player-style session command center
- Room-based navigation: Creative Room, Recording Booth, Producer Lab, Mix Room, Release Room
- Clearer workspace hierarchy and guided next steps

## Retained from v5/v6

- Complete studio lifecycle: Idea → Lyrics → Demo Vocal → Beat → Arrangement → Recording → Mix → Master → Release
- Recording Booth controls: count-in, metronome toggle, section-based vocal takes
- Take manager with best-take selection, ratings, and notes
- Approval gates for Artist, Producer, Engineer, and Final Master
- Version history for demo, beat, mix, master, and release snapshots
- Release/export package builder for WAV master, MP3 preview, stems ZIP, instrumental, acapella, lyrics PDF, and release notes
- Producer Beat Library and Engineer Sonic Stage

## Run locally

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Production preview

```powershell
npm run build
npm run preview
```

Open the preview URL shown by Vite, usually:

```text
http://localhost:4173
```

## Notes

This remains a frontend MVP. AI MixSplit, vocal correction, sound packs, waveform editing, and audio-part widgets are implemented as product-ready UI/UX prototypes with project metadata updates. A production platform would connect these flows to authentication, database persistence, cloud audio storage, real stem-separation models, DSP/audio rendering services, sample-pack hosting, licensing, and billing.
