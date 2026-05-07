import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AudioLines, BrainCircuit, Cloud, CloudUpload, Download, FileAudio, FolderArchive,
  Gauge, Headphones, Layers3, Library, Menu, Mic2, Music2, Play, RefreshCw,
  Settings2, SlidersHorizontal, Sparkles, WandSparkles, AudioAudioAudioWaveform, X, Zap
} from 'lucide-react';

const nav = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'mix', label: 'AI Mix & Master', icon: SlidersHorizontal },
  { id: 'daw', label: 'AI DAW', icon: Layers3 },
  { id: 'generator', label: 'AI Sound Generator', icon: WandSparkles },
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
const aiPipeline = [
  'BPM detection', 'Musical key detection', 'Genre detection', 'Vocal tone analysis',
  'Auto-align vocals', 'Remove noise', 'Clean vocals', 'Subtle pitch tuning',
  'Balance frequencies', 'Intelligent compression', 'Stereo widen', 'Harmonic enhancement',
  'Professional mastering', 'Streaming loudness normalization'
];
const soundPrompts = ['dark spiritual desert choir', 'cinematic African war drums', 'ethereal vocal texture', 'aggressive distorted bass', 'alien atmospheric ambience'];
const exportFormats = ['MP3', 'WAV', 'FLAC', 'STEMS', 'Project session export', 'Cloud version snapshot'];
const architecture = [
  ['Frontend', 'React / Next.js, TailwindCSS, Framer Motion'],
  ['Backend', 'Python FastAPI for jobs, auth, projects and processing queues'],
  ['Audio processing', 'PyTorch, Librosa, Demucs, Essentia and FFmpeg'],
  ['Cloud', 'Firebase or Supabase with scalable audio storage'],
  ['GPU inference', 'Cloud GPU workers for separation, generation and neural mastering'],
  ['Learning loop', 'Global success patterns plus local user preference memory'],
];

function Bars({ tone = 'cyan', count = 42 }) {
  return <div className="bars">{Array.from({ length: count }).map((_, i) => (
    <span key={i} className={tone} style={{ height: `${16 + Math.abs(Math.sin(i * 0.7)) * 74}%` }} />
  ))}</div>;
}

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Section({ eyebrow, title, text, action, children }) {
  return (
    <Card>
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted wide">{text}</p>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Feature({ icon: Icon, title, text }) {
  return <div className="feature"><Icon /><h3>{title}</h3><p>{text}</p></div>;
}

function Overview({ go }) {
  return (
    <div className="stack">
      <section className="hero">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="pill">Infinity Â· evolving AI audio engineer</span>
          <h1>The future of <span>music creation</span> powered by adaptive intelligence.</h1>
          <p className="lead">Infinity is a premium, cinematic, minimalistic and futuristic AI music ecosystem for mixing, mastering, sound design, stem generation and AI audio creation.</p>
          <div className="actions">
            <button className="primary" onClick={() => go('mix')}><CloudUpload size={18}/> Start Mix & Master</button>
            <button className="secondary" onClick={() => go('generator')}><Sparkles size={18}/> Generate Sounds</button>
          </div>
          <div className="mini-grid">
            <Card>Upload vocals, instrumentals, full songs or stems</Card>
            <Card>AI learns from corrections and successful outputs</Card>
            <Card>Export HQ audio, stems and project sessions</Card>
          </div>
        </motion.div>
        <Card className="cinema">
          <div className="orb one"/><div className="orb two"/><div className="orb three"/>
          <h3>Adaptive mastering state</h3>
          <Bars />
          <div className="signal-grid"><span>104 BPM</span><span>F# minor</span><span>Afro-soul</span><span>-9.4 LUFS</span></div>
        </Card>
      </section>

      <div className="stats">
        <Card><b>5</b><span>Upload paths</span></Card>
        <Card><b>9</b><span>Mastering modes</span></Card>
        <Card><b>14</b><span>AI analysis stages</span></Card>
        <Card><b>âˆž</b><span>Learning templates</span></Card>
      </div>

      <Section eyebrow="Core concept" title="One adaptive ecosystem for the full music cycle" text="Infinity replaces fragmented tools with one evolving AI assistant: upload, record, edit, generate, mix, master, export and learn.">
        <div className="three">
          <Feature icon={SlidersHorizontal} title="AI Mix & Master" text="Studio-quality mix and master with visual AudioAudioAudioWaveform, EQ, gain reduction, stereo image and spectrum." />
          <Feature icon={Layers3} title="AI DAW" text="Timeline, drag blocks, cut/crop/fade, effects rack, piano roll, automation, loops and MIDI support." />
          <Feature icon={WandSparkles} title="AI Sound Generator" text="Prompt-to-WAV loops, one-shots, textures, cinematic FX, ambient layers and synth presets." />
        </div>
      </Section>
    </div>
  );
}

function MixPage() {
  const [mode, setMode] = useState('Custom AI adaptive');
  const [strength, setStrength] = useState(72);
  const [compare, setCompare] = useState('After');

  return (
    <div className="stack">
      <Section eyebrow="Section 1" title="AI Mix & Master" text="Drag and drop MP3, WAV, FLAC or STEM ZIP. Infinity detects BPM, key, genre and vocal tone, then aligns, cleans, balances, compresses, widens and masters." action={<button className="primary"><CloudUpload size={16}/> Upload audio</button>}>
        <div className="upload-grid">{uploadTypes.map(([title, Icon, text]) => <div className="upload" key={title}><Icon/><h3>{title}</h3><p>{text}</p></div>)}</div>
      </Section>

      <div className="two">
        <Section eyebrow="AI pipeline" title="Automatic repair and enhancement" text="A simulated visual path for the future FastAPI + PyTorch + Librosa + Demucs pipeline.">
          <div className="pipeline">{aiPipeline.map(item => <span key={item}><Zap size={14}/>{item}</span>)}</div>
        </Section>
        <Section eyebrow="Adaptive mastering" title="Genre modes + manual override" text="Select a mastering mode, compare before/after and control AI strength.">
          <div className="chips">{masteringModes.map(item => <button key={item} onClick={() => setMode(item)} className={mode === item ? 'chip active' : 'chip'}>{item}</button>)}</div>
          <div className="toggle"><button onClick={() => setCompare('Before')} className={compare === 'Before' ? 'active' : ''}>Before</button><button onClick={() => setCompare('After')} className={compare === 'After' ? 'active' : ''}>After</button></div>
          <label className="range"><span>AI strength <b>{strength}%</b></span><input type="range" min="0" max="100" value={strength} onChange={(e) => setStrength(e.target.value)} /></label>
        </Section>
      </div>

      <div className="two">
        <Card><h3>AudioWaveform + EQ movement</h3><Bars tone={compare === 'After' ? 'cyan' : 'magenta'} /></Card>
        <Card><h3>Gain reduction + stereo image</h3><Bars tone="violet" count={28}/><div className="scope">{mode}</div></Card>
      </div>
    </div>
  );
}

function DawPage() {
  return (
    <div className="stack">
      <Section eyebrow="Section 2" title="AI DAW / Sound Creator" text="A futuristic lightweight DAW with timeline editing, draggable blocks, cut/crop/fade, piano roll, effects rack, automation lanes, loops, MIDI and live preview." action={<button className="secondary"><Play size={16}/> Live preview</button>}>
        <div className="daw">
          <div className="timeline">
            <div className="ruler">{Array.from({ length: 16 }).map((_, i) => <span key={i}>{i + 1}</span>)}</div>
            {['Lead Vocal', 'Synth Texture', 'Percussion Loop', 'Atmosphere FX'].map((track, i) => (
              <div className="track" key={track}>
                <strong>{track}</strong>
                <div>{Array.from({ length: 4 + i }).map((_, j) => <span className={j % 2 ? 'clip magenta' : 'clip'} key={j}>{j === 1 ? 'AI' : ''}</span>)}</div>
              </div>
            ))}
          </div>
          <div className="tools">
            <Feature icon={Music2} title="AI chord suggestions" text="Generate harmonic movement that fits the emotion." />
            <Feature icon={AudioWaveform} title="AI melody continuation" text="Continue motifs and toplines intelligently." />
            <Feature icon={Gauge} title="AI rhythm generation" text="Build groove-aware patterns and beats." />
            <Feature icon={Settings2} title="Effects rack" text="Design vocal chains, synth patches and cinematic atmospheres." />
          </div>
        </div>
      </Section>
    </div>
  );
}

function GeneratorPage() {
  const [prompt, setPrompt] = useState(soundPrompts[0]);
  const [intensity, setIntensity] = useState(68);

  return (
    <div className="stack">
      <Section eyebrow="Section 3" title="AI Sound Generator" text="Type prompts to generate downloadable WAV loops, one-shots, textures, ambient layers, cinematic FX and synth presets." action={<button className="primary"><WandSparkles size={16}/> Generate</button>}>
        <div className="two">
          <Card>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} />
            <div className="chips">{soundPrompts.map(item => <button className="chip" onClick={() => setPrompt(item)} key={item}>{item}</button>)}</div>
            <label className="range"><span>Intensity <b>{intensity}%</b></span><input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(e.target.value)} /></label>
            <button className="secondary"><RefreshCw size={16}/> Regenerate variations</button>
          </Card>
          <div className="stack small">{['Infinity Choir Layer', 'War Drums Pulse', 'Desert Atmos Pad', 'Hybrid Bass Hit'].map((name, index) => (
            <Card key={name}><h3>{name}</h3><p className="muted">{index % 2 ? 'Loop' : 'Texture'} Â· instant preview Â· WAV export</p><Bars tone={index % 2 ? 'magenta' : 'cyan'} count={20}/><div className="actions"><button className="secondary"><Play size={15}/> Preview</button><button className="secondary"><Download size={15}/> Download WAV</button></div></Card>
          ))}</div>
        </div>
      </Section>
    </div>
  );
}

function ExportsPage() {
  return (
    <div className="stack">
      <Section eyebrow="Export system" title="HQ rendering, cloud saving and version history" text="Export MP3, WAV, FLAC, stems and project sessions. Save cloud versions and compare previous AI renders.">
        <div className="three">{exportFormats.map(format => <Feature key={format} icon={Download} title={format} text="Ready for production rendering and cloud delivery." />)}</div>
      </Section>
      <Section eyebrow="Monetization" title="Free tier, subscriptions, AI credits and sound marketplace" text="Infinity can monetize through premium mastering, generation credits, subscriptions and a creator sound marketplace.">
        <div className="three"><Feature icon={Library} title="Free tier" text="Basic mix previews, limited generation and MP3 export."/><Feature icon={Sparkles} title="Premium mastering" text="HQ WAV/FLAC, unlimited mastering and version history."/><Feature icon={Gauge} title="AI credits" text="Sound generation, GPU renders and marketplace assets." /></div>
      </Section>
    </div>
  );
}

function EnginePage() {
  return (
    <div className="stack">
      <Section eyebrow="AI system architecture" title="Modern AI audio technology roadmap" text="The next backend phase uses FastAPI, PyTorch, Librosa, Demucs, Essentia, FFmpeg, cloud storage and GPU inference.">
        <div className="three">{architecture.map(([title, text]) => <Feature key={title} icon={BrainCircuit} title={title} text={text} />)}</div>
      </Section>
      <Section eyebrow="Learning loop" title="Global and personal adaptive intelligence" text="Infinity learns from user behavior, successful mixes, mastering preferences, genre styles, frequency balancing, loudness optimization and corrections.">
        <div className="learning">{['User behavior', 'Successful mixes', 'Genre styles', 'Frequency corrections', 'Loudness preference', 'Local memory', 'Global templates', 'Reinforcement logic'].map(item => <span key={item}>{item}</span>)}</div>
      </Section>
    </div>
  );
}

function Sidebar({ page, setPage, open, setOpen }) {
  return (
    <>
      <aside className={open ? 'side open' : 'side'}>
        <div className="brand"><div className="logo"/><div><b>Infinity</b><span>AI audio ecosystem</span></div><button className="close" onClick={() => setOpen(false)}><X size={18}/></button></div>
        <p>Premium cinematic music creation powered by evolving artificial intelligence.</p>
        <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setOpen(false); }} className={page === id ? 'active' : ''}><Icon size={18}/>{label}</button>)}</nav>
        <Card className="side-note"><p className="eyebrow">Adaptive Intelligence</p><h3>Infinity improves every session.</h3><p className="muted">It learns from preference memory, successful outputs, mix corrections and style choices.</p></Card>
      </aside>
      {open && <div className="shade" onClick={() => setOpen(false)} />}
    </>
  );
}

export default function App() {
  const [page, setPage] = useState('overview');
  const [open, setOpen] = useState(false);
  const component = useMemo(() => ({
    overview: <Overview go={setPage}/>,
    mix: <MixPage/>,
    daw: <DawPage/>,
    generator: <GeneratorPage/>,
    exports: <ExportsPage/>,
    engine: <EnginePage/>,
  }[page]), [page]);

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} open={open} setOpen={setOpen}/>
      <main>
        <header className="top">
          <button className="menu" onClick={() => setOpen(true)}><Menu size={18}/></button>
          <div><p className="eyebrow">Futuristic AI-powered music production</p><h2>Infinity</h2></div>
          <div className="top-actions"><span><BrainCircuit size={16}/> Engine online</span><button className="secondary">Free tier</button><button className="primary">Premium mastering</button></div>
        </header>
        <motion.div key={page} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{component}</motion.div>
      </main>
    </div>
  );
}

