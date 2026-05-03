# AudioMagic.ai MVP v5

AudioMagic.ai is a browser-based studio workflow prototype built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, Web Audio API, and JSZip.

## v5 focus

v5 extends the platform from a guided studio cycle into a fuller studio operating layer:

- v4 complete studio lifecycle retained: Idea → Lyrics → Demo Vocal → Beat → Arrangement → Recording → Mix → Master → Release
- v5 Recording Booth controls: count-in, metronome toggle, section-based vocal takes
- Take manager with best-take selection, ratings, and notes
- Approval gates for Artist, Producer, Engineer, and Final Master
- Version history for demo, beat, mix, master, and release snapshots
- Release/export package builder for WAV master, MP3 preview, stems ZIP, instrumental, acapella, lyrics PDF, and release notes
- Existing Producer Beat Library and Engineer Sonic Stage retained

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
