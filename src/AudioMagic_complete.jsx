import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Disc3,
  Download,
  FileAudio,
  FolderKanban,
  Globe,
  Headphones,
  Home,
  Library,
  ListChecks,
  Lock,
  LogIn,
  Menu,
  MessageSquare,
  Mic,
  Music2,
  PanelLeft,
  Play,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Upload,
  User,
  Wand2,
  Waves,
} from 'lucide-react';

const theme = {
  bg: '#101116',
  panel: '#1A1C23',
  panel2: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F4F7FB',
  muted: 'rgba(244,247,251,0.58)',
  cyan: '#00E5FF',
  magenta: '#FF00FF',
  success: '#00D084',
  warning: '#FFC857',
};

const glass = {
  background: 'rgba(26,28,35,0.88)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${theme.border}`,
  borderRadius: 24,
};

const shadow = {
  cyan: '0 0 18px rgba(0,229,255,0.18)',
  magenta: '0 0 18px rgba(255,0,255,0.16)',
};

const appShell = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'studio', label: 'Studio', icon: Disc3 },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'collab', label: 'Collaboration', icon: MessageSquare },
  { id: 'test', label: 'Test Mode', icon: Sparkles },
  { id: 'release', label: 'Release', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const studioSections = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'create', label: 'Create', icon: Mic },
  { id: 'produce', label: 'Produce', icon: Music2 },
  { id: 'mix', label: 'Mix', icon: SlidersHorizontal },
  { id: 'master', label: 'Master', icon: Waves },
  { id: 'deliver', label: 'Deliver', icon: Download },
];

const languages = [
  { code: 'EN', label: 'English' },
  { code: 'FR', label: 'Français' },
  { code: 'ES', label: 'Español' },
];

const sampleProjects = [
  { id: 'demo', name: 'Neon Heartbeat — Demo Session', status: 'Ready for musician test', bpm: 98, key: 'A Minor', updated: 'Just now' },
  { id: 'p1', name: 'Midnight Neon', status: 'Producing', bpm: 98, key: 'A Minor', updated: '5 min ago' },
  { id: 'p2', name: 'Golden Echo', status: 'Mixing', bpm: 124, key: 'F# Minor', updated: '1 hour ago' },
  { id: 'p3', name: 'City Mirage', status: 'Writing', bpm: 88, key: 'D Minor', updated: 'Yesterday' },
];

const soundLibrary = [
  { id: 1, name: 'Afro Perc Loop', bpm: 104, key: 'A Minor', mood: 'Dance' },
  { id: 2, name: 'Velvet R&B Chords', bpm: 88, key: 'F Minor', mood: 'Warm' },
  { id: 3, name: 'Trap 808 Slide', bpm: 142, key: 'D Minor', mood: 'Dark' },
  { id: 4, name: 'Ambient Vocal Chop', bpm: 100, key: 'C Minor', mood: 'Dreamy' },
];

const initialStems = [
  { id: 's1', name: 'Lead Vocal', pan: 0, volume: 84, color: theme.cyan },
  { id: 's2', name: 'Beat', pan: -12, volume: 76, color: theme.magenta },
  { id: 's3', name: 'Bass', pan: 6, volume: 70, color: theme.warning },
  { id: 's4', name: 'Pads', pan: 18, volume: 64, color: '#8D7CFF' },
];

const masterPresets = [
  { id: 'stream', name: 'Streaming', lufs: '-10 LUFS', note: 'Balanced for Spotify / Apple Music' },
  { id: 'club', name: 'Club Loud', lufs: '-8 LUFS', note: 'More impact and perceived loudness' },
  { id: 'warm', name: 'Warm Analog', lufs: '-12 LUFS', note: 'Rounder tone and softer highs' },
  { id: 'vocal', name: 'Vocal Forward', lufs: '-10 LUFS', note: 'Prioritizes lead vocal presence' },
];

const activity = [
  'Lyrics updated in Create',
  'Beat library selection added',
  'Mix pass v2 created',
  'Master preset ready for review',
];

const listItem = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 18,
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid ${theme.border}`,
};

function Pill({ children, color = theme.cyan }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 999,
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color,
        background: `${color}14`,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}

function Card({ title, subtitle, action, children }) {
  return (
    <div style={{ ...glass, padding: 20 }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div>
            {title && <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>}
            {subtitle && <div style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Progress({ value, color = theme.cyan }) {
  return (
    <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, boxShadow: `0 0 20px ${color}66` }} />
    </div>
  );
}

function Wave() {
  const bars = [18, 28, 16, 36, 24, 12, 32, 22, 14, 26, 34, 16];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: [12, h, 18, h * 0.6, 12] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
          style={{ width: 7, borderRadius: 999, background: i % 2 ? theme.cyan : theme.magenta }}
        />
      ))}
    </div>
  );
}

function Button({ children, variant = 'primary', onClick, style = {}, icon: Icon }) {
  const styles = {
    primary: {
      background: theme.cyan,
      color: '#03151A',
      border: 'none',
      boxShadow: shadow.cyan,
    },
    secondary: {
      background: 'rgba(255,255,255,0.04)',
      color: theme.text,
      border: `1px solid ${theme.border}`,
    },
    ghost: {
      background: 'transparent',
      color: theme.muted,
      border: `1px solid ${theme.border}`,
    },
    magenta: {
      background: theme.magenta,
      color: '#180018',
      border: 'none',
      boxShadow: shadow.magenta,
    },
  };

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 16,
        padding: '12px 16px',
        fontWeight: 700,
        cursor: 'pointer',
        ...styles[variant],
        ...style,
      }}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function Landing({ onStart, onLogin, language, setLanguage }) {
  const width = useViewport();
  const isTablet = width < 1100;
  const isMobile = width < 768;
  const heroCols = isTablet ? '1fr' : 'minmax(0, 1fr) minmax(420px, 0.95fr)';
  const featureCols = isMobile ? '1fr' : width < 980 ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))';
  const previewCols = width < 640 ? '1fr' : '220px 1fr';
  const previewInnerCols = width < 640 ? '1fr' : '1fr 0.95fr';
  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(circle at top right, rgba(255,0,255,0.12), transparent 30%), radial-gradient(circle at top left, rgba(0,229,255,0.16), transparent 28%), ${theme.bg}`, color: theme.text, padding: isMobile ? 16 : 24, overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1220, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 22 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #00E5FF, #FF00FF)', boxShadow: shadow.cyan }} />
            AudioMagic.ai
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ ...glass, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} color={theme.cyan} />
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.text, outline: 'none' }}>
                {languages.map((lang) => <option key={lang.code} value={lang.code} style={{ color: '#000' }}>{lang.label}</option>)}
              </select>
            </div>
            <Button variant="secondary" onClick={onLogin} icon={LogIn}>Login</Button>
            <Button onClick={onStart} icon={ArrowRight}>Start free</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: heroCols, gap: isTablet ? 24 : 32, alignItems: 'center' }}>
          <div style={{ padding: isMobile ? '8px 0 4px' : '20px 8px', maxWidth: 680 }}>
            <Pill>Artist · Producer · Engineer</Pill>
            <h1 style={{ fontSize: isMobile ? 'clamp(38px, 12vw, 54px)' : 'clamp(44px, 7vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.035em', margin: '22px 0 16px', textWrap: 'balance' }}>
              A clearer studio workflow from <span style={{ color: theme.cyan }}>idea</span> to <span style={{ color: theme.magenta }}>release</span>.
            </h1>
            <p style={{ color: theme.muted, fontSize: isMobile ? 16 : 18, lineHeight: 1.7, maxWidth: 740 }}>
              AudioMagic v14 redesign introduces a modern SaaS shell with better navigation, cleaner project flow, and dedicated workspaces for Create, Produce, Mix, Master, and Deliver.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              <Button onClick={onStart} icon={Sparkles}>Open demo workspace</Button>
              <Button variant="secondary" onClick={onLogin} icon={Lock}>Private login</Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: featureCols, gap: 14, marginTop: 26 }}>
              {[
                ['Guided workflow', 'Overview → Create → Produce → Mix → Master → Deliver'],
                ['Better navigation', 'Global sidebar + project tabs + right utility rail'],
                ['Studio confidence', 'Less clutter, clearer next actions, stronger handoffs'],
              ].map(([t, s]) => (
                <div key={t} style={{ ...glass, padding: 18 }}>
                  <div style={{ fontWeight: 700 }}>{t}</div>
                  <div style={{ fontSize: 13, color: theme.muted, marginTop: 8, lineHeight: 1.6 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
          <Card title="v14 Interface Preview" subtitle="Redesigned shell and navigation">
            <div style={{ display: 'grid', gridTemplateColumns: previewCols, gap: 16 }}>
              <div style={{ ...glass, padding: 16, borderRadius: 20 }}>
                {appShell.slice(0, 6).map((item, idx) => (
                  <div key={item.id} style={{ ...listItem, marginBottom: 10, border: idx === 2 ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}`, background: idx === 2 ? `${theme.cyan}12` : 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><item.icon size={16} color={idx === 2 ? theme.cyan : theme.muted} /> <span>{item.label}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ ...glass, padding: 18, borderRadius: 20 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {studioSections.map((tab, idx) => (
                    <div key={tab.id} style={{ padding: '10px 14px', borderRadius: 14, background: idx === 0 ? `${theme.magenta}12` : 'rgba(255,255,255,0.03)', border: idx === 0 ? `1px solid ${theme.magenta}55` : `1px solid ${theme.border}`, color: idx === 0 ? theme.magenta : theme.muted }}>{tab.label}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: previewInnerCols, gap: 16, alignItems: 'stretch' }}>
                  <div style={{ ...glass, padding: 18, borderRadius: 18 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Project Overview</div>
                    <Progress value={72} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 14 }}>
                      {[['Lyrics','Ready for generation'], ['Beat','Selected in library'], ['Mix','Pending engineer pass']].map(([label, helper]) => <div key={label} style={{ ...listItem, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 4 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div><div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5 }}>{helper}</div></div>)}
                    </div>
                  </div>
                  <div style={{ ...glass, padding: 18, borderRadius: 18 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Live waveform</div>
                    <Wave />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Login({ onEnter, onBack }) {
  const [email, setEmail] = useState('artist@audiomagic.ai');
  const [password, setPassword] = useState('demo123');
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: theme.bg, color: theme.text, padding: 24 }}>
      <div style={{ width: 'min(480px, 100%)', ...glass, padding: 28 }}>
        <Pill color={theme.magenta}>Private session</Pill>
        <h1 style={{ fontSize: 34, margin: '18px 0 10px' }}>Login to your studio</h1>
        <p style={{ color: theme.muted, lineHeight: 1.7 }}>Use the demo login to enter the redesigned private workspace.</p>
        <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <Button onClick={onEnter} icon={LogIn} style={{ flex: 1 }}>Enter session</Button>
          <Button variant="secondary" onClick={onBack} style={{ flex: 1 }}>Back</Button>
        </div>
      </div>
    </div>
  );
}


function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
  color: theme.text,
  padding: '14px 16px',
  outline: 'none',
};

function AppShell({ onLogout, language, setLanguage }) {
  const width = useViewport();
  const isWide = width >= 1360;
  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;
  const showSidebar = isDesktop;
  const showMobileNav = !isDesktop;
  const [nav, setNav] = useState('studio');
  const [section, setSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(width >= 1180);
  const [selectedProject, setSelectedProject] = useState(sampleProjects[0]);
  const [lyrics, setLyrics] = useState('Midnight city, neon rain\nI keep hearing your name...\n\n[Hook]\nPull me back into the light');
  const [idea, setIdea] = useState('Afro-R&B groove with warm synths and emotionally intimate vocals.');
  const [songReady, setSongReady] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(18);
  const [stems, setStems] = useState(initialStems);
  const [selectedPreset, setSelectedPreset] = useState(masterPresets[0].id);
  const [deliverState, setDeliverState] = useState({ review: true, credits: false, artwork: false, stems: true, metadata: false, split: false });
  const [guidedSteps, setGuidedSteps] = useState({ listen: true, lyrics: true, draft: false, stem: false, mix: false, master: false, deliver: false, feedback: false });
  const [feedback, setFeedback] = useState({ clarity: 4, realUse: 'Maybe', usefulPart: 'Production', confused: '', missing: '', pay: '', overall: 8 });
  const [reviewNotes, setReviewNotes] = useState(['00:15 — Clean first impression, the workflow is easier to follow.', '01:20 — I want the song generation result to feel more immediate.', '03:40 — The Produce and Mix sections feel the most useful.']);
  const [newReviewNote, setNewReviewNote] = useState('');
  const [magicState, setMagicState] = useState('idle');

  useEffect(() => {
    setSidebarOpen((prev) => (width < 1180 ? false : prev));
  }, [width]);

  const completion = useMemo(() => {
    const checks = [lyrics.trim().length > 0, songReady, stems.length >= 3, selectedPreset, Object.values(deliverState).filter(Boolean).length >= 3];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [lyrics, songReady, stems, selectedPreset, deliverState]);

  const doGenerate = () => {
    setSongReady(false);
    setGenerationProgress(28);
    const steps = [44, 61, 76, 92, 100];
    steps.forEach((value, index) => {
      setTimeout(() => {
        setGenerationProgress(value);
        if (value === 100) { setSongReady(true); setGuidedSteps((prev) => ({ ...prev, draft: true })); }
      }, 450 * (index + 1));
    });
  };

  const addLibraryStem = (name) => {
    setStems((prev) => [
      ...prev,
      { id: `s${prev.length + 1}`, name, pan: 0, volume: 68, color: prev.length % 2 ? theme.cyan : theme.magenta },
    ]);
    setGuidedSteps((prev) => ({ ...prev, stem: true }));
    setSection('produce');
  };

  const testCompletion = useMemo(() => {
    const values = Object.values(guidedSteps);
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [guidedSteps]);

  const addReviewNote = () => {
    if (!newReviewNote.trim()) return;
    setReviewNotes((prev) => [...prev, newReviewNote.trim()]);
    setNewReviewNote('');
  };

  const exportFeedback = () => {
    const payload = {
      project: selectedProject,
      language,
      guidedSteps,
      feedback,
      reviewNotes,
      summary: {
        completion: testCompletion,
        songReady,
        stems: stems.map(({ name, pan, volume }) => ({ name, pan, volume })),
        preset: masterPresets.find((item) => item.id === selectedPreset)?.name,
      },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audiomagic-musician-feedback.json';
    a.click();
    URL.revokeObjectURL(url);
    setGuidedSteps((prev) => ({ ...prev, feedback: true }));
  };

  const makeItMagic = () => {
    setMagicState('running');
    setGuidedSteps({ listen: true, lyrics: true, draft: true, stem: true, mix: true, master: true, deliver: true, feedback: guidedSteps.feedback });
    if (!lyrics.includes('[Verse 2]')) {
      setLyrics((prev) => `${prev}

[Verse 2]
We keep dancing through the pressure, turning scars into a flame.

[Bridge]
Hold on to the feeling, let the skyline sing our name.`);
    }
    setIdea('Afro-R&B / Pop crossover with warm synths, punchy percussion, earworm hook, emotional vocal lifts, and a 2:58 radio-ready arrangement.');
    setSongReady(true);
    setGenerationProgress(100);
    setStems((prev) => {
      const extras = [
        { id: `s${prev.length + 1}`, name: 'Hook Doubles', pan: 12, volume: 64, color: '#8D7CFF' },
        { id: `s${prev.length + 2}`, name: 'FX Riser', pan: -8, volume: 54, color: theme.warning },
      ];
      const names = new Set(prev.map((item) => item.name));
      return [...prev, ...extras.filter((item) => !names.has(item.name))];
    });
    setSelectedPreset('vocal');
    setDeliverState({ review: true, credits: true, artwork: true, stems: true, metadata: true, split: true });
    setSection('deliver');
    setTimeout(() => setMagicState('done'), 900);
  };

  const content = {
    dashboard: (
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : width < 980 ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))', gap: 16 }}>
          {[
            ['Active Projects', sampleProjects.length, theme.cyan],
            ['Songs in Mixing', 2, theme.magenta],
            ['Release Readiness', `${completion}%`, theme.warning],
          ].map(([title, value, color]) => (
            <Card key={title} title={title}>
              <div style={{ fontSize: 34, fontWeight: 800, color }}>{value}</div>
            </Card>
          ))}
        </div>
        <Card title="Continue where you left off" subtitle="The new UX keeps your next action visible.">
          <div style={{ display: 'grid', gap: 12 }}>
            {sampleProjects.map((project) => (
              <button key={project.id} onClick={() => { setSelectedProject(project); setNav('studio'); setSection('overview'); }} style={{ ...listItem, cursor: 'pointer', color: theme.text }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{project.name}</div>
                  <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>{project.status} · {project.bpm} BPM · {project.key}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.muted }}>
                  {project.updated}
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    ),
    projects: (
      <Card title="Projects" subtitle="Cleaner project list with direct entry into the studio flow.">
        <div style={{ display: 'grid', gap: 12 }}>
          {sampleProjects.map((project) => (
            <div key={project.id} style={listItem}>
              <div>
                <div style={{ fontWeight: 700 }}>{project.name}</div>
                <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>{project.status} · {project.updated}</div>
              </div>
              <Button variant="secondary" onClick={() => { setSelectedProject(project); setNav('studio'); }}>Open</Button>
            </div>
          ))}
        </div>
      </Card>
    ),
    studio: (
      <div style={{ display: 'grid', gap: 18 }}>
        <Card title={selectedProject.name} subtitle={`${selectedProject.status} · ${selectedProject.bpm} BPM · ${selectedProject.key}`} action={<Button icon={Sparkles} onClick={() => setSection('create')}>Continue session</Button>}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {studioSections.map((tab) => {
              const active = tab.id === section;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSection(tab.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    padding: '12px 14px', borderRadius: 14,
                    background: active ? `${theme.cyan}14` : 'rgba(255,255,255,0.03)',
                    border: active ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}`,
                    color: active ? theme.cyan : theme.muted,
                  }}
                >
                  <tab.icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        </Card>
        {section === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.1fr 0.9fr' : '1fr', gap: 18 }}>
            <Card title="Project progress" subtitle="One glance tells the artist, producer, and engineer what happens next.">
              <Progress value={completion} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : width < 980 ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 16 }}>
                {[
                  ['Lyrics', lyrics.trim() ? 'Ready' : 'Missing'],
                  ['Song Draft', songReady ? 'Generated' : 'Pending'],
                  ['Delivery', `${Object.values(deliverState).filter(Boolean).length}/6 items`],
                ].map(([k, v]) => (
                  <div key={k} style={{ ...listItem, flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <Button onClick={() => setSection('create')} icon={Mic}>Go to Create</Button>
                <Button variant="secondary" onClick={() => setSection('produce')} icon={Music2}>Go to Produce</Button>
                <Button variant="secondary" onClick={() => setSection('mix')} icon={SlidersHorizontal}>Go to Mix</Button>
              </div>
            </Card>
            <Card title="Current preview" subtitle="Keep the core playback visible.">
              <Wave />
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <Button variant="secondary" icon={Play}>Play</Button>
                <Button variant="secondary" icon={Headphones}>A/B Compare</Button>
              </div>
            </Card>
          </div>
        )}
        {section === 'create' && (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.1fr 0.9fr' : '1fr', gap: 18 }}>
            <Card title="Lyrics + Song Prompt" subtitle="A cleaner artist workspace: write, guide, and generate.">
              <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} style={{ ...inputStyle, minHeight: 220, resize: 'vertical' }} />
              <div style={{ height: 12 }} />
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }} placeholder="Describe the song you want to create..." />
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <Button onClick={doGenerate} icon={Wand2}>Create song draft</Button>
                <Button variant="secondary" icon={Mic}>Clone / record voice</Button>
              </div>
            </Card>
            <Card title="Generation status" subtitle="One clear area for generation feedback.">
              <div style={{ fontSize: 30, fontWeight: 800, color: songReady ? theme.success : theme.cyan }}>{generationProgress}%</div>
              <div style={{ marginTop: 12 }}><Progress value={generationProgress} color={songReady ? theme.success : theme.cyan} /></div>
              <div style={{ color: theme.muted, fontSize: 14, lineHeight: 1.7, marginTop: 14 }}>
                {songReady ? 'Working song draft ready. Move to Produce to shape the arrangement and stems.' : 'Preparing style, structure, vocal direction, and arrangement draft.'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <Button variant="secondary" onClick={() => setSection('produce')} icon={ArrowRight}>Send to Produce</Button>
              </div>
            </Card>
          </div>
        )}
        {section === 'produce' && (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '0.9fr 1.1fr' : '1fr', gap: 18 }}>
            <Card title="Sound Library" subtitle="Searchable sound choices now live in their own clean area.">
              <div style={{ ...listItem, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.muted }}><Search size={16} /> Search sounds</div>
                <div style={{ fontSize: 12, color: theme.cyan }}>Genre · BPM · Key · Mood</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {soundLibrary.map((item) => (
                  <button key={item.id} onClick={() => addLibraryStem(item.name)} style={{ ...listItem, cursor: 'pointer', color: theme.text }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>{item.bpm} BPM · {item.key} · {item.mood}</div>
                    </div>
                    <span style={{ color: theme.cyan, fontSize: 13 }}>Add stem</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Arrangement + Stems" subtitle="Producer tools grouped in one focused page.">
              <div style={{ display: 'grid', gap: 12 }}>
                {stems.map((stem) => (
                  <div key={stem.id} style={listItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 999, background: stem.color }} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{stem.name}</div>
                        <div style={{ fontSize: 12, color: theme.muted }}>Pan {stem.pan} · Volume {stem.volume}%</div>
                      </div>
                    </div>
                    <Button variant="ghost">Arrange</Button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <Button variant="secondary" onClick={() => setSection('mix')} icon={ArrowRight}>Send to Mix</Button>
              </div>
            </Card>
          </div>
        )}
        {section === 'mix' && (
          <Card title="Mix Room" subtitle="Channel-strip layout with fewer distractions.">
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : width < 980 ? 'repeat(2, minmax(0,1fr))' : width < 1280 ? 'repeat(3, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 14 }}>
              {stems.map((stem) => (
                <div key={stem.id} style={{ ...glass, padding: 16, borderRadius: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{stem.name}</div>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: stem.color }} />
                  </div>
                  <div style={{ marginTop: 14, height: 110, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${theme.border}` }}>
                    <Wave />
                  </div>
                  <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Volume</div>
                      <input type="range" min="0" max="100" value={stem.volume} onChange={(e) => setStems((prev) => prev.map((s) => s.id === stem.id ? { ...s, volume: Number(e.target.value) } : s))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Pan</div>
                      <input type="range" min="-50" max="50" value={stem.pan} onChange={(e) => setStems((prev) => prev.map((s) => s.id === stem.id ? { ...s, pan: Number(e.target.value) } : s))} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
        {section === 'master' && (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 18 }}>
            <Card title="Master Assistant" subtitle="Mastering gets its own page in v14.">
              <div style={{ display: 'grid', gap: 12 }}>
                {masterPresets.map((preset) => (
                  <button key={preset.id} onClick={() => setSelectedPreset(preset.id)} style={{ ...listItem, cursor: 'pointer', border: selectedPreset === preset.id ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}`, background: selectedPreset === preset.id ? `${theme.cyan}12` : 'rgba(255,255,255,0.03)', color: theme.text }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{preset.name}</div>
                      <div style={{ fontSize: 13, color: theme.muted, marginTop: 6 }}>{preset.note}</div>
                    </div>
                    <div style={{ color: theme.cyan, fontSize: 13 }}>{preset.lufs}</div>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Preview" subtitle="Keep comparison and release intent visible.">
              <Wave />
              <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                <Button variant="secondary" icon={Play}>Play raw</Button>
                <Button variant="secondary" icon={Headphones}>Play master</Button>
                <Button onClick={() => setSection('deliver')} icon={ArrowRight}>Go to Deliver</Button>
              </div>
            </Card>
          </div>
        )}
        {section === 'deliver' && (
          <Card title="Deliver & Release" subtitle="Final approvals, exports, and release tasks.">
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 18 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                {Object.entries(deliverState).map(([key, value]) => (
                  <button key={key} onClick={() => setDeliverState((prev) => ({ ...prev, [key]: !prev[key] }))} style={{ ...listItem, cursor: 'pointer', color: theme.text, border: value ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CheckCircle2 size={18} color={value ? theme.cyan : theme.muted} />
                      <div style={{ textTransform: 'capitalize', fontWeight: 700 }}>{key}</div>
                    </div>
                    <div style={{ color: value ? theme.cyan : theme.muted }}>{value ? 'Done' : 'Pending'}</div>
                  </button>
                ))}
              </div>
              <div>
                <div style={{ ...glass, padding: 18, borderRadius: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Export package</div>
                  <div style={{ color: theme.muted, fontSize: 14, lineHeight: 1.7 }}>Generate release ZIP, split sheet, credits, metadata, and master preview.</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                    <Button icon={Download}>Download package</Button>
                    <Button variant="secondary">Share review link</Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    ),
    library: (
      <Card title="Library" subtitle="This area can grow into a full Splice-style sound browser.">
        <div style={{ display: 'grid', gap: 12 }}>
          {soundLibrary.map((item) => <div key={item.id} style={listItem}><div><div style={{ fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: 13, color: theme.muted }}>{item.bpm} BPM · {item.key}</div></div><Button variant="ghost" onClick={() => addLibraryStem(item.name)}>Use</Button></div>)}
        </div>
      </Card>
    ),
    collab: (
      <Card title="Collaboration" subtitle="Timestamp review and approval hub.">
        <div style={{ display: 'grid', gap: 12 }}>
          {['00:42 Vocal a bit low before hook', '01:13 Add extra drum fill', '02:20 Master approved on headphones'].map((note) => <div key={note} style={listItem}><div>{note}</div><Pill color={theme.magenta}>Review</Pill></div>)}
        </div>
      </Card>
    ),
    test: (
      <div style={{ display: 'grid', gap: 18 }}>
        <Card title="AudioMagic v15 — Musician Test Mode" subtitle="Guided evaluation flow for artists, producers, and engineers.">
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.1fr 0.9fr' : '1fr', gap: 18 }}>
            <div>
              <Pill>Recommended test time · 10–15 minutes</Pill>
              <h2 style={{ fontSize: isMobile ? 28 : 34, margin: '16px 0 12px', lineHeight: 1.08 }}>Welcome to AudioMagic.ai</h2>
              <div style={{ color: theme.muted, lineHeight: 1.7, fontSize: 15 }}>Create a song idea, shape the production, prepare the mix, and export a release package. Use the guided test to experience the complete song cycle before leaving structured feedback.</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                <Button onClick={() => { setNav('test'); }} icon={Sparkles}>Start guided test</Button>
                <Button variant="secondary" onClick={() => { setNav('projects'); setSelectedProject(sampleProjects[0]); }} icon={FolderKanban}>Open demo project</Button>
                <Button variant="secondary" onClick={() => setGuidedSteps((prev) => ({ ...prev, feedback: true }))} icon={MessageSquare}>Give feedback</Button>
              </div>
            </div>
            <div style={{ ...glass, padding: 18, borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{sampleProjects[0].name}</div>
                  <div style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>Genre: Afro-R&B / Pop · {sampleProjects[0].bpm} BPM · {sampleProjects[0].key}</div>
                </div>
                <Pill color={theme.success}>Ready for musician test</Pill>
              </div>
              <div style={{ marginTop: 16 }}><Progress value={testCompletion} color={theme.success} /></div>
              <div style={{ fontSize: 13, color: theme.muted, marginTop: 10 }}>Musician Test Progress: {testCompletion}%</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {[
                  ['Lyrics', 'Prefilled to avoid empty-state confusion'],
                  ['Song idea prompt', 'Ready for generation testing'],
                  ['Stem list', `${stems.length} stems available for mix testing`],
                  ['Master preset', masterPresets.find((item) => item.id === selectedPreset)?.name || 'Not selected'],
                ].map(([label, helper]) => <div key={label} style={{ ...listItem, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}><div style={{ fontWeight: 700 }}>{label}</div><div style={{ fontSize: 12, color: theme.muted }}>{helper}</div></div>)}
              </div>
            </div>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '0.95fr 1.05fr' : '1fr', gap: 18 }}>
          <Card title="Guided test checklist" subtitle="A focused path ensures feedback is fair and actionable.">
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['listen', 'Step 1 — Listen to the demo idea'],
                ['lyrics', 'Step 2 — Write or edit lyrics'],
                ['draft', 'Step 3 — Generate a song draft'],
                ['stem', 'Step 4 — Add a sound or stem'],
                ['mix', 'Step 5 — Adjust the mix'],
                ['master', 'Step 6 — Choose a master preset'],
                ['deliver', 'Step 7 — Prepare delivery'],
                ['feedback', 'Step 8 — Submit feedback'],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setGuidedSteps((prev) => ({ ...prev, [key]: !prev[key] }))} style={{ ...listItem, cursor: 'pointer', color: theme.text, border: guidedSteps[key] ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><CheckCircle2 size={18} color={guidedSteps[key] ? theme.cyan : theme.muted} /><span>{label}</span></div>
                  <div style={{ color: guidedSteps[key] ? theme.cyan : theme.muted }}>{guidedSteps[key] ? 'Done' : 'Todo'}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => { setNav('studio'); setSection('create'); setGuidedSteps((prev) => ({ ...prev, lyrics: true })); }} icon={Mic}>Open Create</Button>
              <Button variant="secondary" onClick={() => { setNav('studio'); setSection('produce'); }} icon={Music2}>Open Produce</Button>
              <Button variant="secondary" onClick={() => { setNav('studio'); setSection('mix'); setGuidedSteps((prev) => ({ ...prev, mix: true })); }} icon={SlidersHorizontal}>Open Mix</Button>
            </div>
          </Card>
          <Card title="Make It Magic" subtitle="The memorable one-click demo of the full AudioMagic flow.">
            <div style={{ color: theme.muted, lineHeight: 1.7, marginBottom: 16 }}>This demo action improves the lyrics, suggests a hook, adds production direction, creates extra stems, prepares the mix, selects a master preset, and marks the song ready for review.</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                'Improves the lyrics',
                'Suggests a hook',
                'Adds production direction',
                'Adds stems',
                'Prepares a mix',
                'Selects a master preset',
              ].map((item) => <div key={item} style={{ ...listItem, justifyContent: 'flex-start' }}><Wand2 size={16} color={theme.magenta} /><span>{item}</span></div>)}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button variant="magenta" onClick={makeItMagic} icon={Sparkles}>Make It Magic</Button>
              <div style={{ ...listItem, color: magicState === 'done' ? theme.success : theme.muted }}>{magicState === 'running' ? 'Creating demo magic…' : magicState === 'done' ? 'Magic pass complete' : 'Ready'}</div>
            </div>
          </Card>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 18 }}>
          <Card title="Before / After" subtitle="Show the product value clearly for the tester.">
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div style={{ ...glass, padding: 18, borderRadius: 20 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Before AudioMagic</div>
                {['Raw idea', 'Basic lyrics', 'No arrangement', 'No mix direction'].map((item) => <div key={item} style={{ color: theme.muted, marginBottom: 10 }}>• {item}</div>)}
              </div>
              <div style={{ ...glass, padding: 18, borderRadius: 20, border: `1px solid ${theme.cyan}33` }}>
                <div style={{ fontWeight: 800, marginBottom: 12, color: theme.cyan }}>After AudioMagic</div>
                {['Structured song', 'Hook suggestion', 'Production plan', 'Stems prepared', 'Master target selected', 'Release checklist ready'].map((item) => <div key={item} style={{ color: theme.text, marginBottom: 10 }}>• {item}</div>)}
              </div>
            </div>
          </Card>
          <Card title="What this app does" subtitle="Make the core workflow obvious.">
            <div style={{ fontWeight: 800, fontSize: 18 }}>Write → Create → Produce → Mix → Master → Deliver</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {[
                ['Create', 'Lyrics, voice, and song idea'],
                ['Produce', 'Beat, arrangement, and stems'],
                ['Mix', 'Balance, pan, and levels'],
                ['Master', 'Loudness and final sound'],
                ['Deliver', 'Metadata, exports, credits, and review'],
              ].map(([title, helper]) => <div key={title} style={{ ...listItem, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}><div style={{ fontWeight: 700 }}>{title}</div><div style={{ fontSize: 13, color: theme.muted }}>{helper}</div></div>)}
            </div>
          </Card>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.05fr 0.95fr' : '1fr', gap: 18 }}>
          <Card title="Musician feedback" subtitle="Collect structured feedback after the test.">
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 8 }}><span>How easy was it to understand the app? (1–5)</span><input type="range" min="1" max="5" value={feedback.clarity} onChange={(e) => setFeedback((prev) => ({ ...prev, clarity: Number(e.target.value) }))} /></label>
              <label style={{ display: 'grid', gap: 8 }}><span>Would you use this for a real song idea?</span><select value={feedback.realUse} onChange={(e) => setFeedback((prev) => ({ ...prev, realUse: e.target.value }))} style={inputStyle}><option>Yes</option><option>Maybe</option><option>No</option></select></label>
              <label style={{ display: 'grid', gap: 8 }}><span>Which part felt most useful?</span><select value={feedback.usefulPart} onChange={(e) => setFeedback((prev) => ({ ...prev, usefulPart: e.target.value }))} style={inputStyle}><option>Lyrics</option><option>Production</option><option>Mixing</option><option>Mastering</option><option>Release preparation</option><option>Review workflow</option></select></label>
              <textarea value={feedback.confused} onChange={(e) => setFeedback((prev) => ({ ...prev, confused: e.target.value }))} placeholder="What confused you?" style={{ ...inputStyle, minHeight: 92, resize: 'vertical' }} />
              <textarea value={feedback.missing} onChange={(e) => setFeedback((prev) => ({ ...prev, missing: e.target.value }))} placeholder="What feature is missing?" style={{ ...inputStyle, minHeight: 92, resize: 'vertical' }} />
              <textarea value={feedback.pay} onChange={(e) => setFeedback((prev) => ({ ...prev, pay: e.target.value }))} placeholder="What would make you pay for this?" style={{ ...inputStyle, minHeight: 92, resize: 'vertical' }} />
              <label style={{ display: 'grid', gap: 8 }}><span>Overall rating (1–10)</span><input type="range" min="1" max="10" value={feedback.overall} onChange={(e) => setFeedback((prev) => ({ ...prev, overall: Number(e.target.value) }))} /></label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Button onClick={exportFeedback} icon={Download}>Export Feedback JSON</Button>
                <Button variant="secondary" onClick={() => setGuidedSteps((prev) => ({ ...prev, feedback: true }))} icon={CheckCircle2}>Mark feedback complete</Button>
              </div>
            </div>
          </Card>
          <Card title="Timestamp review notes" subtitle="Capture fast observations while testing.">
            <div style={{ display: 'grid', gap: 10 }}>
              {reviewNotes.map((note) => <div key={note} style={listItem}><div>{note}</div><Pill color={theme.magenta}>Note</Pill></div>)}
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <input value={newReviewNote} onChange={(e) => setNewReviewNote(e.target.value)} placeholder="e.g. 05:10 — The mix view feels closest to a real studio workflow." style={inputStyle} />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={addReviewNote} icon={MessageSquare}>Add note</Button>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
              <div style={{ fontWeight: 700 }}>Founder note</div>
              <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>Please test this like you are preparing a real song idea. Focus on clarity, usefulness, speed, what feels missing, what feels professional, and what feels unnecessary.</div>
            </div>
          </Card>
        </div>
      </div>
    ),
    release: (
      <Card title="Release Room" subtitle="Credits, metadata, exports, and readiness.">
        <Progress value={Math.round((Object.values(deliverState).filter(Boolean).length / 6) * 100)} color={theme.success} />
        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <Button icon={Download}>Export WAV</Button>
          <Button variant="secondary">Export stems ZIP</Button>
          <Button variant="secondary">Create metadata sheet</Button>
        </div>
      </Card>
    ),
    settings: (
      <Card title="Settings" subtitle="Language and session preferences.">
        <div style={{ ...listItem, maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Globe size={16} color={theme.cyan} /> Language</div>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ background: 'transparent', color: theme.text, border: 'none', outline: 'none' }}>
            {languages.map((lang) => <option key={lang.code} value={lang.code} style={{ color: '#000' }}>{lang.label}</option>)}
          </select>
        </div>
      </Card>
    ),
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, padding: isMobile ? 12 : 18, overflowX: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: showSidebar ? (isWide ? `${sidebarOpen ? 280 : 96}px 1fr 320px` : `${sidebarOpen ? 252 : 96}px 1fr`) : '1fr', gap: 18, maxWidth: 1600, margin: '0 auto', alignItems: 'start' }}>
        {showSidebar && (
          <aside style={{ ...glass, padding: 18, minHeight: isDesktop ? 'calc(100vh - 36px)' : 'auto', position: isWide ? 'sticky' : 'static', top: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg, #00E5FF, #7A5CFF 55%, #FF00FF)', boxShadow: '0 0 22px rgba(0,229,255,0.22)', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                    {[10, 15, 8, 16].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 999, background: 'rgba(255,255,255,0.92)' }} />)}
                  </div>
                </div>
                {sidebarOpen && (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>AudioMagic.ai</div>
                    <div style={{ color: theme.muted, fontSize: 11, marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Studio OS</div>
                  </div>
                )}
              </div>
              <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: 'transparent', border: 'none', color: theme.muted, cursor: 'pointer', padding: 6 }}>
                {sidebarOpen ? <PanelLeft size={18} /> : <Menu size={18} />}
              </button>
            </div>
            <div style={{ color: theme.muted, fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{sidebarOpen ? 'Workspace navigation' : ''}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {appShell.map((item) => {
                const active = nav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setNav(item.id)}
                    style={{
                      ...listItem,
                      cursor: 'pointer',
                      justifyContent: sidebarOpen ? 'space-between' : 'center',
                      padding: sidebarOpen ? '14px 16px' : '14px 0',
                      border: active ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}`,
                      background: active ? 'linear-gradient(90deg, rgba(0,229,255,0.13), rgba(255,255,255,0.03))' : 'rgba(255,255,255,0.03)',
                      color: active ? theme.text : theme.muted,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <item.icon size={17} color={active ? theme.cyan : theme.muted} />
                      {sidebarOpen && (
                        <div style={{ display: 'grid', justifyItems: 'start' }}>
                          <span style={{ fontWeight: 700 }}>{item.label}</span>
                          <span style={{ fontSize: 11, color: theme.muted }}>{item.id === 'studio' ? 'Create, mix and deliver' : item.id === 'projects' ? 'Open session folders' : item.id === 'dashboard' ? 'Daily studio overview' : item.id === 'library' ? 'Sounds and presets' : item.id === 'collab' ? 'Comments and reviews' : item.id === 'test' ? 'Musician guided feedback' : item.id === 'release' ? 'Export and publishing' : 'Preferences'}</span>
                        </div>
                      )}
                    </div>
                    {sidebarOpen && active ? <ChevronRight size={16} color={theme.cyan} /> : null}
                  </button>
                );
              })}
            </div>
            {sidebarOpen && (
              <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: `${theme.magenta}10`, border: `1px solid ${theme.magenta}33` }}>
                <div style={{ fontWeight: 700 }}>Studio flow</div>
                <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>Move from writing to production, mix, master, and release with clearer guided handoffs.</div>
              </div>
            )}
          </aside>
        )}

        <main style={{ display: 'grid', gap: 18, minWidth: 0 }}>
          {showMobileNav && (
            <div style={{ ...glass, padding: isMobile ? 14 : 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #00E5FF, #7A5CFF 55%, #FF00FF)', boxShadow: '0 0 22px rgba(0,229,255,0.22)', position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                      {[10, 15, 8, 16].map((h, i) => <span key={i} style={{ width: 3, height: h, borderRadius: 999, background: 'rgba(255,255,255,0.92)' }} />)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 20 }}>AudioMagic.ai</div>
                    <div style={{ color: theme.muted, fontSize: 12 }}>Studio workspace</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ ...listItem, padding: '10px 12px' }}><Globe size={16} color={theme.cyan} /><select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.text, outline: 'none' }}>{languages.map((lang) => <option key={lang.code} value={lang.code} style={{ color: '#000' }}>{lang.code}</option>)}</select></div>
                  <div style={{ ...listItem, padding: '10px 12px' }}><User size={16} color={theme.cyan} /><span>Roland</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {appShell.map((item) => {
                  const active = nav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setNav(item.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                        padding: '12px 14px', borderRadius: 14,
                        background: active ? `${theme.cyan}12` : 'rgba(255,255,255,0.03)',
                        border: active ? `1px solid ${theme.cyan}55` : `1px solid ${theme.border}`,
                        color: active ? theme.text : theme.muted,
                      }}
                    >
                      <item.icon size={16} color={active ? theme.cyan : theme.muted} />
                      <span style={{ fontWeight: 700 }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ ...glass, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, lineHeight: 1.15 }}>{nav === 'studio' ? selectedProject.name : appShell.find((n) => n.id === nav)?.label}</div>
                <div style={{ color: theme.muted, marginTop: 6 }}>Clearer structure, better navigation, and a more visible studio identity across every screen.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                <div style={{ ...listItem, minWidth: 190 }}><Search size={16} color={theme.cyan} /><span style={{ color: theme.muted }}>Search projects or sounds</span></div>
                <div style={{ ...listItem }}><Globe size={16} color={theme.cyan} /><select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.text, outline: 'none' }}>{languages.map((lang) => <option key={lang.code} value={lang.code} style={{ color: '#000' }}>{lang.code}</option>)}</select></div>
                <div style={{ ...listItem }}><Bell size={16} color={theme.muted} /></div>
                <div style={{ ...listItem }}><User size={16} color={theme.cyan} /><span>Roland</span></div>
              </div>
            </div>
          </div>
          {content[nav]}
        </main>

        {isWide && <aside style={{ ...glass, padding: 16, minHeight: 'calc(100vh - 36px)', position: 'sticky', top: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Session Rail</div>
          <div style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>Keep context and next actions visible.</div>
          <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
            <Card title="Project status" subtitle={`${selectedProject.status} · ${completion}% readiness`}>
              <Progress value={completion} />
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {['Continue writing lyrics', 'Move beat choices into Produce', 'Finalize mix notes', 'Prepare delivery package'].map((task) => (
                  <div key={task} style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.muted, fontSize: 13 }}>
                    <ListChecks size={15} color={theme.cyan} /> {task}
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Recent activity">
              <div style={{ display: 'grid', gap: 10 }}>
                {activity.map((item) => <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.muted, fontSize: 13 }}><FileAudio size={15} color={theme.magenta} /> {item}</div>)}
              </div>
            </Card>
            <Card title="Quick actions">
              <div style={{ display: 'grid', gap: 10 }}>
                <Button onClick={() => { setNav('studio'); setSection('create'); }} icon={Mic}>Open Create</Button>
                <Button variant="secondary" onClick={() => { setNav('studio'); setSection('mix'); }} icon={SlidersHorizontal}>Open Mix</Button>
                <Button variant="secondary" onClick={() => { setNav('release'); }} icon={Download}>Open Release</Button>
                <Button variant="ghost" onClick={onLogout}>Logout</Button>
              </div>
            </Card>
          </div>
        </aside>}

        {!isWide && (
          <section style={{ ...glass, padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Session Rail</div>
            <div style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>Key context and next actions, optimized for smaller screens.</div>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              <Card title="Project status" subtitle={`${selectedProject.status} · ${completion}% readiness`}>
                <Progress value={completion} />
                <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  {['Continue writing lyrics', 'Move beat choices into Produce', 'Finalize mix notes', 'Prepare delivery package'].map((task) => (
                    <div key={task} style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.muted, fontSize: 13 }}>
                      <ListChecks size={15} color={theme.cyan} /> {task}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function AudioMagicV14() {
  const [route, setRoute] = useState('landing');
  const [language, setLanguage] = useState('EN');

  if (route === 'landing') return <Landing onStart={() => setRoute('app')} onLogin={() => setRoute('login')} language={language} setLanguage={setLanguage} />;
  if (route === 'login') return <Login onEnter={() => setRoute('app')} onBack={() => setRoute('landing')} />;
  return <AppShell onLogout={() => setRoute('landing')} language={language} setLanguage={setLanguage} />;
}
