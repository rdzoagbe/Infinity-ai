import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Menu, Mic2, Music2, Play, RefreshCw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { backendUrl, generateSoundOnBackend } from './api/infinityBackend.js';

const nav = [
  { id: 'home', label: 'Home', icon: Sparkles },
  { id: 'studio', label: 'Studio', icon: SlidersHorizontal },
  { id: 'sounds', label: 'Sounds', icon: Music2 },
];

const WORKFLOW_STEPS = [
  { n: 1, label: 'Upload Beat', desc: 'Drop your instrumental — MP3, WAV or FLAC.' },
  { n: 2, label: 'Add Vocals', desc: 'Upload a take or record straight from your mic.' },
  { n: 3, label: 'Clean Vocals', desc: 'Noise reduction, de-essing and compression in one click.' },
  { n: 4, label: 'Mix', desc: 'Balance vocal and beat levels with a simple slider.' },
  { n: 5, label: 'Master', desc: 'Pick your platform — Spotify, Apple, YouTube and more.' },
  { n: 6, label: 'Download', desc: 'Get your WAV and MP3, ready to release.' },
];

const PLATFORMS = [
  { label: 'Spotify', lufs: '−14 LUFS' },
  { label: 'Apple Music', lufs: '−16 LUFS' },
  { label: 'YouTube', lufs: '−14 LUFS' },
  { label: 'SoundCloud', lufs: '−10 LUFS' },
  { label: 'Tidal', lufs: '−14 LUFS' },
];

const SOUND_PROMPTS = [
  'dark spiritual desert choir',
  'cinematic African war drums',
  'ethereal vocal texture',
  'aggressive distorted bass',
  'alien atmospheric ambience',
];

const GENRES = ['Cinematic', 'Afrobeat', 'Trap', 'House', 'Gospel', 'Experimental'];
const EMOTIONS = ['Mystic', 'Dark', 'Spiritual', 'Energetic', 'Melancholic', 'Triumphant'];

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Bars({ tone = 'cyan', count = 40 }) {
  return (
    <div className="bars">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={tone} style={{ height: `${16 + Math.abs(Math.sin(i * 0.7)) * 74}%` }} />
      ))}
    </div>
  );
}

function slugify(v) { return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sound'; }
function hashText(v) { return v.split('').reduce((s, c) => s + c.charCodeAt(0), 0); }
function makeName(prompt, i = 0) {
  const words = prompt.trim().split(/\s+/).slice(0, 3);
  const base = words.length ? words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : 'Infinity Sound';
  return `${base} ${['Layer', 'Pulse', 'Pad', 'Texture', 'Hit', 'Loop'][i % 6]}`;
}
function writeStr(view, offset, str) { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }

function makeFallbackWav(seed, intensity = 70) {
  const sr = 44100, dur = 3.2, total = Math.floor(sr * dur), dataSize = total * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const freq = 110 + (seed % 260), mod = 0.15 + (intensity / 100) * 0.45;
  writeStr(v, 0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); writeStr(v, 8, 'WAVE'); writeStr(v, 12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  writeStr(v, 36, 'data'); v.setUint32(40, dataSize, true);
  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const env = Math.min(1, t * 6) * Math.min(1, (dur - t) * 3);
    const s = (Math.sin(2 * Math.PI * freq * t) * 0.42 + Math.sin(2 * Math.PI * freq * 1.5 * t + Math.sin(t * 2.1) * mod) * 0.28) * env * 0.55;
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function emitSoundPack(sounds, meta) {
  if (!sounds.length) return;
  window.dispatchEvent(new CustomEvent('infinity:project-sound', {
    detail: { id: `pack_${Date.now()}`, name: `${meta.prompt.slice(0, 40)} pack`, type: 'Sound pack', source: meta.source, ...meta, assets: sounds.map(s => ({ id: s.id || s.asset_id, name: s.name, download_url: s.download_url, preview_url: s.preview_url })), created_at: new Date().toISOString() },
  }));
}

async function browserPreview(sound, intensity) {
  if (sound.preview_url) { const a = new Audio(backendUrl(sound.preview_url)); a.volume = 0.88; await a.play(); return true; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  try {
    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    const seed = hashText(sound.prompt + sound.name), now = ctx.currentTime;
    const out = ctx.createGain(), delay = ctx.createDelay(), fb = ctx.createGain(), master = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now); out.gain.exponentialRampToValueAtTime(0.28, now + 0.04); out.gain.exponentialRampToValueAtTime(0.0001, now + 2.15);
    delay.delayTime.value = 0.18; fb.gain.value = 0.22; master.gain.value = 0.75;
    out.connect(master); out.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master); master.connect(ctx.destination);
    [0, 7, 12, 19].forEach((off, i) => {
      const osc = ctx.createOscillator(), filt = ctx.createBiquadFilter(), g = ctx.createGain();
      osc.type = ['sine', 'triangle', 'sawtooth', 'square'][i];
      osc.frequency.value = 95 + (seed % 180) + off * 7;
      filt.type = 'lowpass'; filt.frequency.value = 520 + intensity * 22; g.gain.value = i === 3 ? 0.045 : 0.12;
      osc.connect(filt); filt.connect(g); g.connect(out); osc.start(now + i * 0.025); osc.stop(now + 2.1);
    });
    setTimeout(() => ctx.close?.(), 2600);
    return true;
  } catch { return false; }
}

function fallbackSounds(prompt, intensity, variation = 0) {
  return Array.from({ length: 4 }).map((_, i) => ({
    id: `${slugify(prompt)}-${Date.now()}-${i}`, name: makeName(prompt, i + variation),
    prompt: variation ? `${prompt} variation ${variation + 1}` : prompt,
    type: i % 2 ? 'Loop' : 'Texture', local: true, intensity,
  }));
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function HomePage({ go }) {
  return (
    <div className="stack">
      <section className="hero">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="pill">Infinity · Beta</span>
          <h1>Record. Clean.<br /><span>Mix. Master.</span></h1>
          <p className="lead">
            Upload your beat, record or upload vocals, clean them, mix everything together,
            master for your platform and download — all in one place.
          </p>
          <div className="actions">
            <button className="primary"><Mic2 size={18} /> Open Studio</button>
            <button className="secondary" data-infinity-local-action="true" onClick={() => go('sounds')}>
              <Sparkles size={18} /> Generate Sounds
            </button>
          </div>
        </motion.div>

        <Card className="cinema">
          <div className="orb one" /><div className="orb two" /><div className="orb three" />
          <h3>Your workflow</h3>
          <Bars />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {WORKFLOW_STEPS.map(s => (
              <span key={s.n} style={{ border: '1px solid rgba(85,233,255,.22)', background: 'rgba(85,233,255,.08)', color: '#55e9ff', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 800 }}>
                {s.n}. {s.label}
              </span>
            ))}
          </div>
        </Card>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {WORKFLOW_STEPS.map(s => (
          <Card key={s.n}>
            <div style={{ color: '#55e9ff', fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Step {s.n}</div>
            <h3 style={{ margin: '0 0 6px' }}>{s.label}</h3>
            <p style={{ color: 'rgba(245,248,255,.58)', margin: 0, lineHeight: 1.6, fontSize: 14 }}>{s.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StudioPage() {
  return (
    <div className="stack">
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">Infinity Studio</p>
            <h2>Your complete vocal workflow</h2>
            <p className="muted wide">
              Six steps, one modal. Upload your beat, bring in your vocals, clean them,
              mix and master — then download a WAV and MP3 ready for any platform.
            </p>
          </div>
          <button className="primary" style={{ flexShrink: 0 }}><Mic2 size={16} /> Open Studio</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 8 }}>
          {WORKFLOW_STEPS.map(s => (
            <div key={s.n} style={{ border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.03)', borderRadius: 14, padding: 14 }}>
              <div style={{ color: '#55e9ff', fontWeight: 900, fontSize: 12, marginBottom: 5 }}>Step {s.n}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: 'rgba(245,248,255,.55)', fontSize: 13, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="eyebrow">Platform targets</p>
        <h2>Master for where you're releasing</h2>
        <p className="muted wide">Each platform has a different loudness target. Infinity hits the right LUFS automatically — no manual adjustment needed.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 16 }}>
          {PLATFORMS.map(p => (
            <div key={p.label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, marginBottom: 5 }}>{p.label}</div>
              <div style={{ color: '#55e9ff', fontSize: 12, fontWeight: 700 }}>{p.lufs}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SoundsPage() {
  const audioRef = useRef(null);
  const [prompt, setPrompt] = useState(SOUND_PROMPTS[0]);
  const [intensity, setIntensity] = useState(68);
  const [genre, setGenre] = useState('Cinematic');
  const [emotion, setEmotion] = useState('Mystic');
  const [sounds, setSounds] = useState(() => fallbackSounds(SOUND_PROMPTS[0], 68));
  const [activeId, setActiveId] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Type a prompt and generate WAV sounds.');
  const [variation, setVariation] = useState(0);

  const playUrl = async (url) => {
    if (!audioRef.current || !url) return false;
    audioRef.current.src = backendUrl(url); audioRef.current.load(); await audioRef.current.play(); return true;
  };

  const generate = async () => {
    const base = prompt.trim() || SOUND_PROMPTS[0];
    setBusy(true); setStatus('Generating...');
    try {
      const res = await generateSoundOnBackend(base, intensity, genre, emotion);
      const next = (res.result?.assets || []).map((a, i) => ({ id: a.asset_id, name: makeName(a.prompt || base, i), prompt: a.prompt || base, type: i % 2 ? 'Loop' : 'Texture', ...a }));
      if (!next.length) throw new Error('No assets returned.');
      setSounds(next); setActiveId(next[0].id);
      emitSoundPack(next, { source: 'railway-backend', prompt: base, genre, emotion, intensity });
      const ok = await playUrl(next[0].preview_url);
      setStatus(ok ? `Playing ${next[0].name}.` : 'Generated. Click Preview to listen.');
    } catch (err) {
      const next = fallbackSounds(base, intensity, variation);
      setSounds(next); setActiveId(next[0].id);
      emitSoundPack(next, { source: 'browser-fallback', prompt: base, genre, emotion, intensity });
      const ok = await browserPreview(next[0], intensity);
      setStatus(ok ? `Backend unavailable — playing browser preview.` : `Backend unavailable: ${err.message}`);
    } finally { setBusy(false); }
  };

  const preview = async (sound) => {
    setActiveId(sound.id);
    const ok = sound.preview_url ? await playUrl(sound.preview_url) : await browserPreview(sound, intensity);
    setStatus(ok ? `Previewing ${sound.name}.` : 'Audio blocked — check browser volume or click again.');
  };

  const download = (sound) => {
    setActiveId(sound.id);
    if (sound.download_url) { window.open(backendUrl(sound.download_url), '_blank', 'noopener,noreferrer'); }
    else {
      const blob = makeFallbackWav(hashText(`${sound.prompt}-${sound.name}`), intensity);
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `${slugify(sound.name)}.wav`; a.click(); URL.revokeObjectURL(url);
    }
    setStatus(`Download started — ${sound.name}.`);
  };

  return (
    <div className="stack">
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">Sound Generator</p>
            <h2>Generate WAV sounds from a prompt</h2>
            <p className="muted wide">Type any description — mood, genre, instrument, texture — and get four downloadable WAV sounds instantly.</p>
          </div>
          <button data-infinity-local-action="true" className="primary" onClick={generate} disabled={busy}>
            <Sparkles size={16} /> {busy ? 'Generating...' : 'Generate'}
          </button>
        </div>

        <div className="two" style={{ marginTop: 16 }}>
          <div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#f5f8ff', padding: 12, fontSize: 14, resize: 'vertical' }} />
            <div className="chips" style={{ marginTop: 10 }}>
              {SOUND_PROMPTS.map(p => (
                <button key={p} data-infinity-local-action="true" className="chip" onClick={() => setPrompt(p)}>{p}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <label className="auth-field">Genre
                <select value={genre} onChange={e => setGenre(e.target.value)}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="auth-field">Emotion
                <select value={emotion} onChange={e => setEmotion(e.target.value)}>
                  {EMOTIONS.map(e => <option key={e}>{e}</option>)}
                </select>
              </label>
            </div>
            <label className="range" style={{ marginTop: 12 }}>
              <span>Intensity <b>{intensity}%</b></span>
              <input type="range" min="0" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))} />
            </label>
            <div className="actions" style={{ marginTop: 12 }}>
              <button data-infinity-local-action="true" className="secondary" onClick={() => { setVariation(v => v + 1); generate(); }} disabled={busy}>
                <RefreshCw size={15} /> Regenerate
              </button>
            </div>
            <audio ref={audioRef} controls style={{ width: '100%', marginTop: 14 }} />
            <p style={{ color: 'rgba(245,248,255,.52)', fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>{status}</p>
          </div>

          <div className="stack small">
            {sounds.map((sound, i) => (
              <Card key={sound.id} className={activeId === sound.id ? 'active-sound' : ''}>
                <h3 style={{ margin: '0 0 4px' }}>{sound.name}</h3>
                <p style={{ color: 'rgba(245,248,255,.5)', fontSize: 13, margin: '0 0 10px' }}>
                  {sound.type} · {sound.download_url ? 'backend WAV' : 'browser audio'}
                </p>
                <Bars tone={i % 2 ? 'magenta' : 'cyan'} count={20} />
                <div className="actions" style={{ marginTop: 10 }}>
                  <button data-infinity-local-action="true" className="secondary" onClick={() => preview(sound)}><Play size={14} /> Preview</button>
                  <button data-infinity-local-action="true" className="secondary" onClick={() => download(sound)}><Download size={14} /> WAV</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Shell ─────────────────────────────────────────────────────────────────────

function Sidebar({ page, setPage, open, setOpen }) {
  return (
    <>
      <aside className={open ? 'side open' : 'side'}>
        <div className="brand">
          <div className="logo" />
          <div><b>Infinity</b><span>AI music studio</span></div>
          <button className="close" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <p>Record, clean, mix and master your music — all in one place.</p>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setPage(id); setOpen(false); }} className={page === id ? 'active' : ''}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <Card className="side-note">
          <p className="eyebrow">Ready to start?</p>
          <h3>Open the studio.</h3>
          <p className="muted">Upload your beat, record vocals, clean, mix and master in six steps.</p>
          <button className="primary" style={{ marginTop: 10, width: '100%' }}><Mic2 size={15} /> Open Studio</button>
        </Card>
      </aside>
      {open && <div className="shade" onClick={() => setOpen(false)} />}
    </>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [open, setOpen] = useState(false);

  const pages = {
    home: <HomePage go={setPage} />,
    studio: <StudioPage />,
    sounds: <SoundsPage />,
  };

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} open={open} setOpen={setOpen} />
      <main>
        <header className="top">
          <button className="menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
          <div>
            <p className="eyebrow">AI music studio</p>
            <h2>Infinity</h2>
          </div>
          <div className="top-actions">
            <button className="primary"><Mic2 size={15} /> Open Studio</button>
          </div>
        </header>
        <motion.div key={page} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          {pages[page] || pages.home}
        </motion.div>
      </main>
    </div>
  );
}
