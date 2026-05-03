# AudioMagic.ai MVP v6

AudioMagic.ai is a browser-based studio workflow prototype built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, Web Audio API, and JSZip.

## v6 focus: better UX layout

v6 keeps the v5 studio operations layer and reorganizes the website into a clearer product experience:

- New Studio OS style dashboard with a persistent left navigation rail
- Cleaner hero section with stronger value proposition
- Primary quick-start flow: paste lyrics, choose genre/beat, send to Producer
- Clear “Continue Session” card for the latest project
- Studio pipeline: Write → Produce → Record → Engineer → Release
- Project command center with cleaner rows, progress, stems, takes, and next action
- Needs Attention sidebar for active sessions
- Less visual clutter and better hierarchy across the landing dashboard

## Retained from v5

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

This is still a frontend MVP. Audio generation, vocal recording, project state, and exports are browser-side prototypes. A production platform would add authentication, database persistence, cloud audio storage, real AI/music APIs, server-side audio rendering, and billing.
