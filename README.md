# 🎧 AudioMagic.ai

**Unified AI Music Production Platform**  
Record · Generate · Mix · Export — all in the browser.

---

## 🚀 Quick Start

```bash
# 1 — Install dependencies
npm install

# 2 — Start dev server (opens at http://localhost:3000)
npm run dev

# 3 — Build for production
npm run build
```

---

## 🗂 Project Structure

```
audiomagic/
├── index.html                  ← HTML entry point
├── vite.config.js              ← Vite config
├── package.json                ← Dependencies
└── src/
    ├── main.jsx                ← React root mount
    └── AudioMagic_complete.jsx ← Full platform (single file)
```

---

## ✨ Features

### 🎙 Artist Tab
- **Smart Notepad** — Write lyrics with an AI Co-Writer that suggests rhymes, hooks, and next lines
- **The Booth** — Real microphone recording via `MediaRecorder API`, live timer + animated waveform
- **Ghostwriter Mode** — Voice clone consent script, 30s capture simulation, AI acapella generation

### 🎛 Producer Tab — Beat Library
8 Genres × 3 patterns each, **synthesized live** with Web Audio API:

| Genre | BPM | Swing | Style |
|-------|-----|-------|-------|
| 🎤 Hip-Hop | 92 | 0.10 | Classic boom bap |
| 🎵 R&B | 86 | 0.15 | Smooth soulful groove |
| 🔥 Trap | 140 | 0 | Hard-hitting 808s |
| 🌍 Afrobeat | 108 | 0.05 | Polyrhythmic Lagos feel |
| 🎷 Jazz | 132 | 0.33 | Heavy swing ride |
| ☁️ Lo-Fi | 78 | 0.25 | Dusty chill tape |
| 🖤 Drill | 144 | 0 | Dark sliding 808 |
| 🌴 Dancehall | 96 | 0.05 | Island riddim |

Every hit (kick, snare, hi-hat, open hat, bass) is generated in real time with:
- `OscillatorNode` + `GainNode` for tonal hits
- `createBuffer` noise for snares/hats with `BiquadFilterNode`
- `StereoPannerNode` for spatial positioning

### 🔊 Engineer Tab
- **Sonic Stage** — 2D spatial mixer with Framer Motion draggable tokens
- **Web Audio Routing** — X-axis → `StereoPannerNode`, Y-axis → `GainNode`
- **A/B Compare** — Raw vs AI Master (gain chain switching)
- **Master Playback** — All stems + beat in sync

### 📦 Real ZIP Export (via JSZip)
Clicking **DOWNLOAD ZIP** produces a real `.zip` file containing:
- `beat_<genre>_<bpm>bpm.wav` — Beat rendered to WAV via `OfflineAudioContext` (4 bars, 44.1kHz stereo)
- `lyrics.txt` — Your lyrics text
- `vocal_recording.webm` — Your mic recording (if captured)
- `stems/<name>.audio` — Any uploaded stems
- `project.json` — Project metadata

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| UI Framework | React 18 + Vite |
| Animations | Framer Motion |
| Icons | lucide-react |
| Audio Engine | Web Audio API (native browser) |
| Beat Render | `OfflineAudioContext` → WAV |
| ZIP Export | JSZip 3 |
| Fonts | Orbitron + Rajdhani (Google Fonts) |

---

## 📋 Requirements

- Node.js 18+
- Modern browser (Chrome, Edge, Firefox, Safari 15+)
- Microphone permission (for vocal recording)

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#101116` |
| Surface | `rgba(26,28,35,0.95)` + glassmorphism |
| Neon Cyan | `#00E5FF` |
| Neon Magenta | `#FF00FF` |
| Success Green | `#00FF88` |
| Gold | `#FFD700` |
| Display Font | Orbitron |
| Body Font | Rajdhani |

---

Built with ❤️ by AudioMagic.ai
