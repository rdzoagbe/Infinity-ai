import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AudioLines,
  BrainCircuit,
  CloudUpload,
  Download,
  FileAudio,
  FolderArchive,
  Gauge,
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
  WandSparkles,
  Waveform,
  X,
  Zap,
} from 'lucide-react';

const nav = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'mix', label: 'AI Mix & Master', icon: SlidersHorizontal },
  { id: 'daw', label: 'AI DAW', icon: Layers3 },
  { id: 'generator', label: 'Sound Generator', icon: WandSparkles },
  { id: 'exports', label: 'Exports', icon: Download },
  { id: 'engine', label: 'AI Engine', icon: BrainCircuit },
];

const uploadTypes = [
  ['Instrumental only', Music2, 'Analyze BPM, key, genre, groove and master the beat.'],
  ['Vocal only', Mic2, 'Clean, tune subtly, de-noise and prepare a vocal chain.'],
  ['Instrumental + vocal', HeadphonesIcon, 'Auto-align, balance and master a complete performance.'],
  ['Full song', FileAudio, 'Neural mastering with before/after comparison.'],
  ['Multiple stems', FolderArchive, 'Stem-aware mix balancing and intelligent processing.'],
  ['Record in-app', AudioLines, 'Capture vocals or ideas directly inside Infinity.'],
];

const masteringModes = ['Trap', 'Afrobeat', 'Drill', 'House', 'Gospel', 'Cinematic', 'Soul', 'Experimental', 'Custom AI'];
const pipeline = ['BPM detection', 'Key detection', 'Genre detection', 'Vocal tone analysis', 'Auto vocal alignment', 'Noise removal', 'Subtle pitch tuning', 'Frequency balancing', 'Smart compression', 'Stereo widening', 'Harmonic enhancement', 'Streaming loudness'];
const prompts = ['dark spiritual desert choir', 'cinematic African war drums', 'ethereal vocal texture', 'aggressive distorted bass', 'alien atmospheric ambience'];
const exports = ['MP3', 'WAV', 'FLAC', 'STEMS', 'Project session', 'Cloud version snapshot'];
const stack = ['React / Next.js frontend', 'Python FastAPI backend', 'PyTorch inference', 'Librosa analysis', 'Demucs source separation', 'Essentia feature extraction', 'FFmpeg rendering', 'Firebase or Supabase storage', 'GPU inference support'];

function HeadphonesIcon(props) { return <AudioLines {...props} />; }

function Bars({ tone = 'cyan', count = 36 }) {
  return <div className="bars">{Array.from({ length: count }).map((_, i) => <span key={i} className={tone} style={{ height: `${18 + Math.abs(Math.sin(i * 0.72)) * 74}%` }} />)}</div>;
}

function Card({ children, className = '' }) { return <div className={`card ${className}`}>{children}</div>; }
function Pill({ children }) { return <span className="pill">{children}</span>; }
function Section({ eyebrow, title, text, children, action }) {
  return <Card><div className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="muted wide">{text}</p></div>{action}</div>{children}</Card>;
}

function Overview({ go }) {
  return <div className="stack">
    <section className="hero">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <Pill>Infinity · Evolving AI audio engineer</Pill>
        <h1>The future of <span>music creation</span> powered by adaptive intelligence.</h1>
        <p className="lead">Upload, record, edit, generate, mix, master and export inside one cinematic AI music ecosystem built for creators of every skill level.</p>
        <div className="actions"><button onClick={() => go('mix')} className="primary"><CloudUpload size={18}/> Start AI Mix</button><button onClick={() => go('generator')} className="secondary"><Sparkles size={18}/> Generate Sound</button></div>
        <div className="mini-grid"><Card>AI learns from successful mixes</Card><Card>Adaptive mastering templates</Card><Card>HQ audio + stem exports</Card></div>
      </motion.div>
      <Card className="cinema"><div className="orb one"/><div className="orb two"/><div className="orb three"/><h3>Neural mastering state</h3><Bars/><div className="signal-grid"><span>LUFS -9.4</span><span>F# minor</span><span>104 BPM</span><span>Afro-soul</span></div></Card>
    </section>
    <div className="stats"><Card><b>9</b><span>Mastering modes</span></Card><Card><b>12</b><span>AI analysis steps</span></Card><Card><b>6</b><span>Export formats</span></Card><Card><b>∞</b><span>Adaptive learning loop</span></Card></div>
    <Section eyebrow="Core concept" title="One intelligent audio ecosystem" text="Infinity replaces multiple production tools with a single assistant that detects, recommends, edits, generates, mixes, masters and improves over time.">
      <div className="three"><Feature icon={SlidersHorizontal} title="AI Mix & Master" text="Upload vocals, beats, full songs or stems and get streaming-ready sound."/><Feature icon={Layers3} title="AI DAW" text="Timeline, clips, piano roll, effects rack, loops, automation and AI arrangement."/><Feature icon={WandSparkles} title="Sound Generator" text="Prompt-based WAV loops, one-shots, atmospheres, textures and synth presets."/></div>
    </Section>
  </div>;
}

function Feature({ icon: Icon, title, text }) { return <div className="feature"><Icon/><h3>{title}</h3><p>{text}</p></div>; }

function MixMaster() {
  const [mode, setMode] = useState('Custom AI');
  const [strength, setStrength] = useState(72);
  const [compare, setCompare] = useState('After');
  return <div className="stack">
    <Section eyebrow="Section 1" title="AI Mix & Master" text="Drag and drop MP3, WAV, FLAC or STEM ZIP files. Infinity detects the material, cleans it, aligns it, balances it and masters it professionally." action={<button className="primary"><CloudUpload size={16}/> Upload audio</button>}>
      <div className="upload-grid">{uploadTypes.map(([title, Icon, text]) => <div className="upload" key={title}><Icon/><h3>{title}</h3><p>{text}</p></div>)}</div>
    </Section>
    <div className="two">
      <Section eyebrow="AI pipeline" title="Automatic analysis and repair" text="The AI prepares the session using studio-grade analysis, source separation logic and adaptive processing.">
        <div className="pipeline">{pipeline.map(x => <span key={x}><Zap size={14}/>{x}</span>)}</div>
      </Section>
      <Section eyebrow="Mastering modes" title="Adaptive sound direction" text="Choose a genre style, compare before and after, then blend AI intensity with manual override.">
        <div className="chips">{masteringModes.map(x => <button key={x} onClick={() => setMode(x)} className={mode === x ? 'chip active' : 'chip'}>{x}</button>)}</div>
        <div className="toggle"><button onClick={() => setCompare('Before')} className={compare === 'Before' ? 'active' : ''}>Before</button><button onClick={() => setCompare('After')} className={compare === 'After' ? 'active' : ''}>After</button></div>
        <label className="range"><span>AI strength <b>{strength}%</b></span><input type="range" min="0" max="100" value={strength} onChange={e => setStrength(e.target.value)}/></label>
      </Section>
    </div>
    <div className="two"><Card><h3>Waveform / EQ movement</h3><Bars tone={compare === 'After' ? 'cyan' : 'magenta'}/></Card><Card><h3>Frequency spectrum & stereo image</h3><Bars tone="violet" count={28}/><div className="scope">{mode}</div></Card></div>
  </div>;
}

function Daw() {
  return <div className="stack"><Section eyebrow="Section 2" title="AI DAW / Sound Creator" text="A futuristic lightweight DAW with timeline editing, drag audio blocks, cut/crop/fade, effects rack, piano roll, automation lanes, loop system, MIDI support and live preview." action={<button className="secondary"><Play size={16}/> Preview</button>}>
    <div className="daw"><div className="timeline"><div className="ruler">{Array.from({ length: 16 }).map((_, i) => <span key={i}>{i+1}</span>)}</div>{['Lead Vocal','Synth Texture','Percussion Loop','FX Atmosphere'].map((track, i) => <div className="track" key={track}><strong>{track}</strong><div>{Array.from({ length: 4+i }).map((_, j) => <span className={j%2?'clip magenta':'clip'} key={j}>{j===1?'AI':''}</span>)}</div></div>)}</div><div className="tools"><Feature icon={Music2} title="AI chord suggestions" text="Generate harmonic movement that matches the emotion."/><Feature icon={Waveform} title="AI melody continuation" text="Extend melodies and motifs intelligently."/><Feature icon={Gauge} title="AI rhythm generation" text="Create groove-aware rhythms and beat patterns."/><Feature icon={Settings2} title="Effects rack" text="Shape sound with cinematic chains and automation."/></div></div>
  </Section></div>;
}

function Generator() {
  const [prompt, setPrompt] = useState(prompts[0]);
  const [intensity, setIntensity] = useState(68);
  return <div className="stack"><Section eyebrow="Section 3" title="AI Sound Generator" text="Generate downloadable WAV sounds, loops, one-shots, textures, ambient layers, cinematic FX and synth presets from natural language." action={<button className="primary"><WandSparkles size={16}/> Generate</button>}>
    <div className="two"><Card><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5}/><div className="chips">{prompts.map(x => <button className="chip" onClick={()=>setPrompt(x)} key={x}>{x}</button>)}</div><label className="range"><span>Intensity <b>{intensity}%</b></span><input type="range" min="0" max="100" value={intensity} onChange={e=>setIntensity(e.target.value)}/></label><button className="secondary"><RefreshCw size={16}/> Regenerate variations</button></Card><div className="stack small">{['Infinity Choir Layer','War Drums Pulse','Desert Atmos Pad','Hybrid Bass Hit'].map((x,i)=><Card key={x}><h3>{x}</h3><p className="muted">{i%2?'Loop':'Texture'} · WAV preview · Prompt influenced</p><Bars tone={i%2?'magenta':'cyan'} count={20}/><div className="actions"><button className="secondary"><Play size={15}/> Preview</button><button className="secondary"><Download size={15}/> Download WAV</button></div></Card>)}</div></div>
  </Section></div>;
}

function Exports() { return <div className="stack"><Section eyebrow="Export system" title="HQ rendering, cloud saving and version history" text="Export MP3, WAV, FLAC, stems and complete project sessions. Save cloud versions and compare previous renders."><div className="three">{exports.map(x => <Feature key={x} icon={Download} title={x} text="Ready for high-quality rendering and cloud delivery."/>)}</div></Section><Section eyebrow="Monetization" title="Built for free tier, subscriptions, AI credits and marketplace expansion" text="Infinity can grow into a premium platform with mastering credits, AI sound packs, marketplace revenue and advanced Pro workflows."><div className="three"><Feature icon={Library} title="Free tier" text="Basic previews, limited generation and MP3 output."/><Feature icon={Sparkles} title="Premium mastering" text="HQ exports, unlimited mastering and version history."/><Feature icon={Gauge} title="AI credits" text="Credits for sound generation, GPU renders and marketplace assets."/></div></Section></div>; }

function Engine() { return <div className="stack"><Section eyebrow="AI architecture" title="Modern AI audio technology roadmap" text="The backend path uses FastAPI, PyTorch, Librosa, Demucs, Essentia, FFmpeg, cloud storage and GPU inference support."><div className="three">{stack.map(x => <Feature key={x} icon={BrainCircuit} title={x} text="Planned production module for the Infinity ecosystem."/>)}</div></Section><Section eyebrow="Learning system" title="Global and personal adaptive intelligence" text="Infinity learns from behavior, successful mixes, mastering preferences, genre styles, frequency balancing, loudness optimization and user corrections."><div className="learning"><span>User behavior</span><span>Successful outputs</span><span>Genre style memory</span><span>Frequency correction</span><span>Loudness preference</span><span>Reinforcement logic</span></div></Section></div>; }

export default function App() {
  const [page, setPage] = useState('overview');
  const [open, setOpen] = useState(false);
  const component = useMemo(() => ({ overview: <Overview go={setPage}/>, mix: <MixMaster/>, daw: <Daw/>, generator: <Generator/>, exports: <Exports/>, engine: <Engine/> }[page]), [page]);
  return <div className="app"><aside className={open ? 'side open' : 'side'}><div className="brand"><div className="logo"/><div><b>Infinity</b><span>AI audio ecosystem</span></div><button className="close" onClick={()=>setOpen(false)}><X size={18}/></button></div><p>Premium cinematic music creation powered by evolving artificial intelligence.</p><nav>{nav.map(({id,label,icon:Icon}) => <button key={id} onClick={()=>{setPage(id);setOpen(false)}} className={page===id?'active':''}><Icon size={18}/>{label}</button>)}</nav></aside>{open && <div className="shade" onClick={()=>setOpen(false)}/>}<main><header className="top"><button className="menu" onClick={()=>setOpen(true)}><Menu size={18}/></button><div><p className="eyebrow">Futuristic AI-powered music production</p><h2>Infinity</h2></div><div className="top-actions"><span><BrainCircuit size={16}/> Engine online</span><button className="secondary">Free tier</button><button className="primary">Premium mastering</button></div></header><motion.div key={page} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}>{component}</motion.div></main></div>;
}
