import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AudioLines,
  BrainCircuit,
  CloudUpload,
  Download,
  FileAudio,
  FolderArchive,
  Gauge,
  Headphones,
  Layers3,
  Library,
  Menu,
  Mic2,
  Music2,
  Play,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { backendUrl, generateSoundOnBackend } from './api/infinityBackend.js';

const nav = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'mix', label: 'AI Mix & Master', icon: SlidersHorizontal },
  { id: 'daw', label: 'AI DAW', icon: Layers3 },
  { id: 'generator', label: 'AI Sound Generator', icon: Sparkles },
  { id: 'exports', label: 'Export System', icon: Download },
  { id: 'engine', label: 'AI Architecture', icon: BrainCircuit },
];

const masteringModes = ['Trap', 'Afrobeat', 'Drill', 'House', 'Gospel', 'Cinematic', 'Soul', 'Experimental', 'Custom AI adaptive'];
const uploadTypes = [
  ['Instrumental only', Music2, 'Detect BPM, key, groove, genre and master the instrumental.'],
  ['Vocal only', Mic2, 'Clean noise, tune subtly, de-ess, compress and prepare a vocal chain.'],
  ['Instrumental + vocal', Headphones, 'Auto-align vocals, balance frequencies and build a release-ready mix.'],
  ['Full song', FileAudio, 'Neural mastering and before/after comparison for finished bounces.'],
  ['Multiple stems / ZIP', FolderArchive, 'Stem-aware mixing for drums, bass, vocals, music and FX.'],
  ['Record in-app', AudioLines, 'Capture vocals, ideas and reference takes directly in Infinity.'],
];
const aiPipeline = ['BPM detection', 'Musical key detection', 'Genre detection', 'Vocal tone analysis', 'Auto-align vocals', 'Remove noise', 'Clean vocals', 'Subtle pitch tuning', 'Balance frequencies', 'Intelligent compression', 'Stereo widen', 'Harmonic enhancement', 'Professional mastering', 'Streaming loudness normalization'];
const soundPrompts = ['dark spiritual desert choir', 'cinematic African war drums', 'ethereal vocal texture', 'aggressive distorted bass', 'alien atmospheric ambience'];
const exportFormats = ['MP3', 'WAV', 'FLAC', 'STEMS', 'Project session export', 'Cloud version snapshot'];
const architecture = [
  ['Frontend', 'React / Vite, Tailwind-style CSS, Framer Motion'],
  ['Backend', 'Python FastAPI for jobs, projects and audio processing'],
  ['Audio processing', 'FFmpeg mastering, browser preview, backend WAV generation, Demucs-ready stems'],
  ['Cloud', 'Supabase auth/projects and Railway backend deployment'],
  ['GPU inference', 'Future cloud GPU workers for source separation and neural generation'],
  ['Learning loop', 'Global success patterns plus local user preference memory'],
];

function Bars({ tone = 'cyan', count = 42 }) {
  return <div className="bars">{Array.from({ length: count }).map((_, i) => <span key={i} className={tone} style={{ height: `${16 + Math.abs(Math.sin(i * 0.7)) * 74}%` }} />)}</div>;
}
function Card({ children, className = '' }) { return <div className={`card ${className}`}>{children}</div>; }
function Section({ eyebrow, title, text, action, children }) {
  return <Card><div className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="muted wide">{text}</p></div>{action}</div>{children}</Card>;
}
function Feature({ icon: Icon, title, text }) { return <div className="feature"><Icon /><h3>{title}</h3><p>{text}</p></div>; }
function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'infinity-sound'; }
function hashText(value) { return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0); }
function makeSoundName(prompt, index = 0) {
  const words = prompt.trim().split(/\s+/).filter(Boolean).slice(0, 3);
  const base = words.length ? words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') : 'Infinity Sound';
  const suffixes = ['Layer', 'Pulse', 'Atmos Pad', 'Texture', 'Hit', 'Loop'];
  return `${base} ${suffixes[index % suffixes.length]}`;
}
function writeString(view, offset, value) { for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i)); }

function createSyntheticWavBlob(seedText, intensity = 70, durationSeconds = 3.2) {
  const sampleRate = 44100;
  const channels = 1;
  const seed = hashText(seedText);
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const baseFrequency = 110 + (seed % 260);
  const modulation = 0.15 + (Number(intensity) / 100) * 0.45;

  writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, 16, true);
  writeString(view, 36, 'data'); view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 6) * Math.min(1, (durationSeconds - t) * 3);
    const tone = Math.sin(2 * Math.PI * baseFrequency * t);
    const harmonic = Math.sin(2 * Math.PI * (baseFrequency * 1.5) * t + Math.sin(t * 2.1) * modulation);
    const texture = Math.sin(2 * Math.PI * (baseFrequency / 2) * t) * 0.28;
    const sample = (tone * 0.42 + harmonic * 0.28 + texture) * envelope * 0.55;
    view.setInt16(offset, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function downloadBlob(fileName, payload, type = 'application/json') {
  const blob = payload instanceof Blob ? payload : new Blob([typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function previewGeneratedSound(sound, intensity) {
  if (sound.preview_url) {
    const audio = new Audio(backendUrl(sound.preview_url));
    audio.volume = 0.88;
    await audio.play();
    return true;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return false;
  try {
    const context = new AudioContext();
    if (context.state === 'suspended') await context.resume();
    const seed = hashText(sound.prompt + sound.name);
    const now = context.currentTime;
    const output = context.createGain();
    const delay = context.createDelay();
    const feedback = context.createGain();
    const master = context.createGain();
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
    output.gain.exponentialRampToValueAtTime(0.0001, now + 2.15);
    delay.delayTime.value = 0.18; feedback.gain.value = 0.22; master.gain.value = 0.75;
    output.connect(master); output.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(master); master.connect(context.destination);
    [0, 7, 12, 19].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : index === 2 ? 'sawtooth' : 'square';
      oscillator.frequency.value = 95 + (seed % 180) + offset * 7;
      filter.type = 'lowpass'; filter.frequency.value = 520 + Number(intensity) * 22; gain.gain.value = index === 3 ? 0.045 : 0.12;
      oscillator.connect(filter); filter.connect(gain); gain.connect(output); oscillator.start(now + index * 0.025); oscillator.stop(now + 2.1);
    });
    window.setTimeout(() => context.close?.(), 2600);
    return true;
  } catch { return false; }
}

function fallbackSounds(prompt, intensity, variation = 0) {
  const basePrompt = prompt.trim() || soundPrompts[0];
  return Array.from({ length: 4 }).map((_, index) => ({
    id: `${slugify(basePrompt)}-${Date.now()}-${variation}-${index}`,
    name: variation ? `${makeSoundName(basePrompt, index + variation)} v${variation + 1}` : makeSoundName(basePrompt, index),
    prompt: variation ? `${basePrompt} variation ${variation + 1}` : basePrompt,
    type: index % 2 ? 'Loop' : 'Texture',
    local: true,
    intensity,
  }));
}

function Overview({ go }) {
  return <div className="stack">
    <section className="hero">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <span className="pill">Infinity · evolving AI audio engineer</span>
        <h1>The future of <span>music creation</span> powered by adaptive intelligence.</h1>
        <p className="lead">Infinity is a working beta for private projects, upload analysis, backend mastering, sound generation and structured artist feedback.</p>
        <div className="actions"><button className="primary" onClick={() => go('mix')}><CloudUpload size={18}/> Start Mix & Master</button><button className="secondary" onClick={() => go('generator')}><Sparkles size={18}/> Generate Sounds</button></div>
        <div className="mini-grid"><Card>Upload vocals, instrumentals, full songs or stems</Card><Card>Generate previewable/downloadable WAV textures</Card><Card>Export backend sessions and beta feedback</Card></div>
      </motion.div>
      <Card className="cinema"><div className="orb one"/><div className="orb two"/><div className="orb three"/><h3>Adaptive mastering state</h3><Bars /><div className="signal-grid"><span>104 BPM</span><span>F# minor</span><span>Afro-soul</span><span>-9.4 LUFS</span></div></Card>
    </section>
    <div className="stats"><Card><b>5</b><span>Upload paths</span></Card><Card><b>9</b><span>Mastering modes</span></Card><Card><b>14</b><span>AI analysis stages</span></Card><Card><b>∞</b><span>Learning templates</span></Card></div>
    <Section eyebrow="Core concept" title="One adaptive ecosystem for the full music cycle" text="Infinity replaces fragmented tools with one evolving AI assistant: upload, record, edit, generate, mix, master, export and learn."><div className="three"><Feature icon={SlidersHorizontal} title="AI Mix & Master" text="Backend-connected audio upload, analysis, mix job, FFmpeg mastering and export package."/><Feature icon={Layers3} title="AI DAW" text="Interactive lightweight DAW preview with timeline, live preview tone, session export and workflow staging."/><Feature icon={Sparkles} title="AI Sound Generator" text="Prompt-to-WAV generation with backend assets, preview playback and downloadable WAV files."/></div></Section>
  </div>;
}

function MixPage() {
  const [mode, setMode] = useState('Custom AI adaptive');
  const [strength, setStrength] = useState(72);
  const [compare, setCompare] = useState('After');
  return <div className="stack">
    <Section eyebrow="Section 1" title="AI Mix & Master" text="Drag and drop MP3, WAV, FLAC or STEM ZIP. Infinity detects BPM, key, genre and vocal tone, then aligns, cleans, balances, compresses, widens and masters." action={<button className="primary"><CloudUpload size={16}/> Upload audio</button>}><div className="upload-grid">{uploadTypes.map(([title, Icon, text]) => <div className="upload" key={title}><Icon/><h3>{title}</h3><p>{text}</p></div>)}</div></Section>
    <div className="two"><Section eyebrow="AI pipeline" title="Automatic repair and enhancement" text="This path is connected to the FastAPI audio modal for upload, analysis, mix, master, stems and export."><div className="pipeline">{aiPipeline.map(item => <span key={item}><Zap size={14}/>{item}</span>)}</div></Section><Section eyebrow="Adaptive mastering" title="Genre modes + manual override" text="Select a mastering mode, compare before/after and control AI strength."><div className="chips">{masteringModes.map(item => <button key={item} onClick={() => setMode(item)} className={mode === item ? 'chip active' : 'chip'}>{item}</button>)}</div><div className="toggle"><button onClick={() => setCompare('Before')} className={compare === 'Before' ? 'active' : ''}>Before</button><button onClick={() => setCompare('After')} className={compare === 'After' ? 'active' : ''}>After</button></div><label className="range"><span>AI strength <b>{strength}%</b></span><input type="range" min="0" max="100" value={strength} onChange={(e) => setStrength(e.target.value)} /></label></Section></div>
    <div className="two"><Card><h3>Waveform + EQ movement</h3><Bars tone={compare === 'After' ? 'cyan' : 'magenta'} /></Card><Card><h3>Gain reduction + stereo image</h3><Bars tone="violet" count={28}/><div className="scope">{mode}</div></Card></div>
  </div>;
}

function DawPage() {
  const [status, setStatus] = useState('Ready. Click Live preview to audition the session bed.');
  const playPreview = async () => {
    const ok = await previewGeneratedSound({ name: 'Infinity DAW Session Bed', prompt: 'cinematic studio timeline groove' }, 62);
    setStatus(ok ? 'Playing DAW session preview.' : 'Browser blocked audio. Click Live preview again or check tab volume.');
  };
  const exportSession = () => downloadBlob('infinity-daw-session.json', { product: 'Infinity', session: 'AI DAW', tracks: ['Lead Vocal', 'Synth Texture', 'Percussion Loop', 'Atmosphere FX'], exportedAt: new Date().toISOString(), status: 'working-beta-session-export' });
  return <div className="stack"><Section eyebrow="Section 2" title="AI DAW / Sound Creator" text="A futuristic lightweight DAW with timeline editing, draggable blocks, cut/crop/fade, piano roll, effects rack, automation lanes, loops, MIDI and live preview." action={<button data-infinity-local-action="true" className="secondary" onClick={playPreview}><Play size={16}/> Live preview</button>}><div className="daw"><div className="timeline"><div className="ruler">{Array.from({ length: 16 }).map((_, i) => <span key={i}>{i + 1}</span>)}</div>{['Lead Vocal', 'Synth Texture', 'Percussion Loop', 'Atmosphere FX'].map((track, i) => <div className="track" key={track}><strong>{track}</strong><div>{Array.from({ length: 4 + i }).map((_, j) => <button data-infinity-local-action="true" className={j % 2 ? 'clip magenta' : 'clip'} key={j} onClick={playPreview}>{j === 1 ? 'AI' : 'Play'}</button>)}</div></div>)}</div><div className="tools"><Feature icon={Music2} title="AI chord suggestions" text="Generate harmonic movement that fits the emotion."/><Feature icon={AudioLines} title="AI melody continuation" text="Continue motifs and toplines intelligently."/><Feature icon={Gauge} title="AI rhythm generation" text="Build groove-aware patterns and beats."/><Feature icon={Settings2} title="Effects rack" text="Design vocal chains, synth patches and cinematic atmospheres."/><button data-infinity-local-action="true" className="secondary" onClick={exportSession}><Download size={15}/> Export DAW session</button><p className="muted">{status}</p></div></div></Section></div>;
}

function GeneratorPage() {
  const audioRef = useRef(null);
  const [prompt, setPrompt] = useState(soundPrompts[0]);
  const [intensity, setIntensity] = useState(68);
  const [genre, setGenre] = useState('Cinematic');
  const [emotion, setEmotion] = useState('Mystic');
  const [status, setStatus] = useState('Ready. Click Generate to create backend WAV sounds.');
  const [variation, setVariation] = useState(0);
  const [activeSoundId, setActiveSoundId] = useState('');
  const [busy, setBusy] = useState(false);
  const [sounds, setSounds] = useState(() => fallbackSounds(soundPrompts[0], 68));

  const setBackendSounds = (assets) => assets.map((asset, index) => ({ id: asset.asset_id, name: makeSoundName(asset.prompt || prompt, index), prompt: asset.prompt || prompt, type: index % 2 ? 'Loop' : 'Texture', ...asset }));

  const playUrl = async (url) => {
    if (!audioRef.current || !url) return false;
    audioRef.current.src = backendUrl(url);
    audioRef.current.load();
    await audioRef.current.play();
    return true;
  };

  const generate = async () => {
    const basePrompt = prompt.trim() || soundPrompts[0];
    setBusy(true);
    setStatus('Generating backend WAV assets...');
    try {
      const response = await generateSoundOnBackend(basePrompt, Number(intensity), genre, emotion);
      const next = setBackendSounds(response.result?.assets || []);
      if (!next.length) throw new Error('Backend returned no assets.');
      setSounds(next); setActiveSoundId(next[0].id);
      const ok = await playUrl(next[0].preview_url);
      setStatus(ok ? `Generated and previewing ${next[0].name}.` : 'Generated backend WAV files. Click Preview if autoplay was blocked.');
    } catch (error) {
      const next = fallbackSounds(basePrompt, intensity, variation);
      setSounds(next); setActiveSoundId(next[0].id);
      const ok = await previewGeneratedSound(next[0], intensity);
      setStatus(ok ? `Backend unavailable. Playing browser fallback for ${next[0].name}.` : `Backend unavailable: ${error.message}. Browser sound was also blocked.`);
    } finally { setBusy(false); }
  };

  const regenerate = async () => {
    setVariation((current) => current + 1);
    await generate();
  };

  const preview = async (sound) => {
    setActiveSoundId(sound.id);
    try {
      const ok = sound.preview_url ? await playUrl(sound.preview_url) : await previewGeneratedSound(sound, intensity);
      setStatus(ok ? `Previewing ${sound.name}.` : 'Browser audio is blocked. Click again, check volume, or allow audio for this site.');
    } catch { setStatus('Preview failed. Try again or download the WAV.'); }
  };

  const download = (sound) => {
    setActiveSoundId(sound.id);
    if (sound.download_url) window.open(backendUrl(sound.download_url), '_blank', 'noopener,noreferrer');
    else downloadBlob(`${slugify(sound.name)}.wav`, createSyntheticWavBlob(`${sound.prompt}-${sound.name}`, intensity), 'audio/wav');
    setStatus(`Download started for ${sound.name}.`);
  };

  return <div className="stack"><Section eyebrow="Section 3" title="AI Sound Generator" text="Type prompts to generate downloadable WAV loops, one-shots, textures, ambient layers, cinematic FX and synth presets." action={<button data-infinity-local-action="true" className="primary" onClick={generate} disabled={busy}><Sparkles size={16}/> {busy ? 'Generating...' : 'Generate & Preview'}</button>}><div className="two"><Card><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} /><div className="chips">{soundPrompts.map(item => <button data-infinity-local-action="true" className="chip" onClick={() => { setPrompt(item); setStatus(`Prompt selected: ${item}`); }} key={item}>{item}</button>)}</div><div className="two compact-controls"><label className="auth-field">Genre<select value={genre} onChange={(e) => setGenre(e.target.value)}><option>Cinematic</option><option>Afrobeat</option><option>Trap</option><option>House</option><option>Gospel</option><option>Experimental</option></select></label><label className="auth-field">Emotion<select value={emotion} onChange={(e) => setEmotion(e.target.value)}><option>Mystic</option><option>Dark</option><option>Spiritual</option><option>Energetic</option><option>Melancholic</option><option>Triumphant</option></select></label></div><label className="range"><span>Intensity <b>{intensity}%</b></span><input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(e.target.value)} /></label><button data-infinity-local-action="true" className="secondary" onClick={regenerate} disabled={busy}><RefreshCw size={16}/> Regenerate & Preview</button><audio ref={audioRef} controls style={{ width: '100%', marginTop: 14 }} /><p className="muted" style={{ marginTop: 14, lineHeight: 1.6 }}>{status}</p></Card><div className="stack small">{sounds.map((sound, index) => <Card key={sound.id} className={activeSoundId === sound.id ? 'active-sound' : ''}><h3>{sound.name}</h3><p className="muted">{sound.type} · {sound.download_url ? 'backend WAV' : 'browser fallback'} · instant preview</p><Bars tone={index % 2 ? 'magenta' : 'cyan'} count={20}/><div className="actions"><button data-infinity-local-action="true" className="secondary" onClick={() => preview(sound)}><Play size={15}/> Preview</button><button data-infinity-local-action="true" className="secondary" onClick={() => download(sound)}><Download size={15}/> Download WAV</button></div></Card>)}</div></div></Section></div>;
}

function ExportsPage() {
  const exportManifest = (format) => downloadBlob(`infinity-${slugify(format)}-export.json`, { product: 'Infinity', format, status: 'export-request-created', nextStep: 'Use the Mix & Master modal for real uploaded audio exports.', createdAt: new Date().toISOString() });
  return <div className="stack"><Section eyebrow="Export system" title="HQ rendering, cloud saving and version history" text="Export MP3, WAV, FLAC, stems and project sessions. Uploaded-audio exports run through the backend Mix & Master workflow."><div className="three">{exportFormats.map(format => <button data-infinity-local-action="true" key={format} className="feature feature-button" onClick={() => exportManifest(format)}><Download /><h3>{format}</h3><p>Create an export request manifest and continue in Mix & Master for rendered audio.</p></button>)}</div></Section><Section eyebrow="Monetization" title="Free tier, subscriptions, AI credits and sound marketplace" text="Infinity can monetize through premium mastering, generation credits, subscriptions and a creator sound marketplace."><div className="three"><Feature icon={Library} title="Free tier" text="Basic mix previews, limited generation and MP3 export."/><Feature icon={Sparkles} title="Premium mastering" text="HQ WAV/FLAC, unlimited mastering and version history."/><Feature icon={Gauge} title="AI credits" text="Sound generation, GPU renders and marketplace assets." /></div></Section></div>;
}

function EnginePage() {
  return <div className="stack"><Section eyebrow="AI system architecture" title="Modern AI audio technology roadmap" text="The current beta uses Supabase, Railway FastAPI, FFmpeg mastering, browser preview and backend WAV generation."><div className="three">{architecture.map(([title, text]) => <Feature key={title} icon={BrainCircuit} title={title} text={text} />)}</div></Section><Section eyebrow="Learning loop" title="Global and personal adaptive intelligence" text="Infinity learns from user behavior, successful mixes, mastering preferences, genre styles, frequency balancing, loudness optimization and corrections."><div className="learning">{['User behavior', 'Successful mixes', 'Genre styles', 'Frequency corrections', 'Loudness preference', 'Local memory', 'Global templates', 'Reinforcement logic'].map(item => <span key={item}>{item}</span>)}</div></Section></div>;
}

function Sidebar({ page, setPage, open, setOpen }) {
  return <><aside className={open ? 'side open' : 'side'}><div className="brand"><div className="logo"/><div><b>Infinity</b><span>AI audio ecosystem</span></div><button className="close" onClick={() => setOpen(false)}><X size={18}/></button></div><p>Premium cinematic music creation powered by evolving artificial intelligence.</p><nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setOpen(false); }} className={page === id ? 'active' : ''}><Icon size={18}/>{label}</button>)}</nav><Card className="side-note"><p className="eyebrow">Adaptive Intelligence</p><h3>Infinity improves every session.</h3><p className="muted">It learns from preference memory, successful outputs, mix corrections and style choices.</p></Card></aside>{open && <div className="shade" onClick={() => setOpen(false)} />}</>;
}

export default function App() {
  const [page, setPage] = useState('overview');
  const [open, setOpen] = useState(false);
  const component = useMemo(() => ({ overview: <Overview go={setPage}/>, mix: <MixPage/>, daw: <DawPage/>, generator: <GeneratorPage/>, exports: <ExportsPage/>, engine: <EnginePage/> }[page]), [page]);
  return <div className="app"><Sidebar page={page} setPage={setPage} open={open} setOpen={setOpen}/><main><header className="top"><button className="menu" onClick={() => setOpen(true)}><Menu size={18}/></button><div><p className="eyebrow">Futuristic AI-powered music production</p><h2>Infinity</h2></div><div className="top-actions"><span><BrainCircuit size={16}/> Engine online</span><button className="secondary">Free tier</button><button className="primary">Premium mastering</button></div></header><motion.div key={page} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{component}</motion.div></main></div>;
}
