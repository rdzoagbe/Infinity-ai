import { useEffect, useMemo, useState } from 'react';
import {
  AudioLines,
  Cloud,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  FileAudio,
  FolderPlus,
  Library,
  Lock,
  LogOut,
  Music2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  createCloudProject,
  deleteCloudProject,
  getSupabaseSession,
  isSupabaseConfigured,
  listCloudProjects,
  signInWithEmail,
  signOutSupabase,
  signUpWithEmail,
  supabase,
} from './api/supabaseClient.js';

const STORAGE_KEYS = {
  session: 'infinity_private_session_v3',
  projects: 'infinity_private_projects_v3',
};

const shell = {
  minHeight: '100vh',
  color: '#f5f8ff',
  background: 'radial-gradient(circle at top left,rgba(0,212,255,.14),transparent 30%),radial-gradient(circle at top right,rgba(255,77,225,.13),transparent 25%),#090b14',
  padding: 18,
};

const panel = {
  background: 'rgba(17,20,33,.84)',
  backdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,.08)',
  boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.09)',
  borderRadius: 28,
};

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function generatePasswordSuggestion() {
  const words = ['Sonic', 'Velvet', 'Nova', 'Echo', 'Studio', 'Rhythm', 'Orbit', 'Pulse', 'Wave', 'Neon'];
  const symbols = ['!', '#', '%', '*'];
  const one = words[Math.floor(Math.random() * words.length)];
  const two = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  return `${one}${two}${number}${symbol}`;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function profileFromSupabaseUser(user) {
  const name = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'Infinity Creator';
  return {
    id: user.id,
    email: user.email,
    name,
    role: user?.user_metadata?.role || 'Artist',
    language: user?.user_metadata?.language || 'English',
    signedInAt: new Date().toISOString(),
    authMode: 'supabase-cloud',
  };
}

function normalizeProject(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist || 'Unknown Artist',
    type: row.type || 'Full song',
    genre: row.genre || 'Unknown',
    status: row.status || 'Draft',
    notes: row.notes || '',
    analysis: row.analysis || { bpm: 'Pending', key: 'Pending', loudness: 'Pending', status: 'Ready for upload' },
    files: Array.isArray(row.files) ? row.files : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    cloud: Boolean(row.user_id),
  };
}

function getGeneratedSounds(project) {
  return Array.isArray(project?.analysis?.generated_sounds) ? project.analysis.generated_sounds : [];
}

function getFeedback(project) {
  return Array.isArray(project?.analysis?.feedback) ? project.analysis.feedback : [];
}

function ModeBadge({ cloudMode }) {
  return (
    <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {cloudMode ? <Cloud size={14} /> : <Lock size={14} />}
      {cloudMode ? 'Cloud Mode' : 'Local Mode'}
    </span>
  );
}

function StateBadge({ state }) {
  const color = state === 'Available' ? '#57f09c' : state === 'Beta' ? '#55e9ff' : '#ffcf66';
  return <span className="pill" style={{ color, borderColor: `${color}55`, background: `${color}18` }}>{state}</span>;
}

function PasswordInput({ value, onChange, disabled }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-field">
      Password
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
        <input value={value} onChange={(event) => onChange(event.target.value)} type={visible ? 'text' : 'password'} placeholder="Minimum 6 characters" disabled={disabled} autoComplete="current-password" style={{ minWidth: 0 }} />
        <button type="button" className="secondary" onClick={() => setVisible((current) => !current)} disabled={disabled} title={visible ? 'Hide password' : 'Show password'} style={{ padding: '12px 14px' }}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        <button type="button" className="secondary" onClick={() => onChange(generatePasswordSuggestion())} disabled={disabled} title="Generate password suggestion" style={{ padding: '12px 14px' }}><RefreshCw size={16} /></button>
      </div>
      <small className="muted">Use the eye to show/hide. Use the refresh button to generate a strong suggestion.</small>
    </label>
  );
}

function StartPrivateSession({ onLogin }) {
  const [mode, setMode] = useState(isSupabaseConfigured ? 'cloud-signin' : 'local');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'Artist', language: 'English' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => { setError(''); setInfo(''); setForm((current) => ({ ...current, [key]: value })); };

  const startLocalSession = () => {
    const email = form.email.trim();
    const name = form.name.trim();
    if (!email && !name) { setError('Add at least an email or artist name to start a private session.'); return; }
    const profile = { id: makeId('user'), email: email || 'creator@infinity.local', name: name || email.split('@')[0] || 'Infinity Creator', role: form.role, language: form.language, signedInAt: new Date().toISOString(), authMode: 'local-private-mvp' };
    saveJson(STORAGE_KEYS.session, profile);
    onLogin(profile);
  };

  const useDemo = () => {
    const profile = { id: makeId('user'), email: 'demo@infinity.local', name: 'Demo Artist', role: 'Artist', language: 'English', signedInAt: new Date().toISOString(), authMode: 'demo-local-private-mvp' };
    saveJson(STORAGE_KEYS.session, profile);
    onLogin(profile);
  };

  const submitCloud = async () => {
    if (!isSupabaseConfigured) { setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart Vite.'); return; }
    if (!form.email.trim() || !form.password) { setError('Email and password are required for cloud login.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      const payload = mode === 'cloud-signup' ? await signUpWithEmail(form.email.trim(), form.password, { name: form.name || form.email.split('@')[0], role: form.role, language: form.language }) : await signInWithEmail(form.email.trim(), form.password);
      const user = payload?.user || payload?.session?.user;
      const session = payload?.session;
      if (!session && mode === 'cloud-signup') { setInfo('Account created. If email confirmation is enabled in Supabase, confirm your email, then sign in.'); return; }
      if (!user) throw new Error('Supabase did not return a user session.');
      onLogin(profileFromSupabaseUser(user));
    } catch (err) { setError(err.message || 'Cloud authentication failed.'); } finally { setBusy(false); }
  };

  return (
    <main data-infinity-auth="true" style={shell}>
      <div className="auth-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, alignItems: 'stretch' }}>
        <section style={{ ...panel, padding: 28, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: 999, background: 'rgba(85,233,255,.18)', filter: 'blur(28px)', top: 30, left: 40 }} />
          <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: 999, background: 'rgba(255,77,225,.14)', filter: 'blur(28px)', bottom: 40, right: 40 }} />
          <div style={{ position: 'relative' }}>
            <span className="pill">Infinity private studio</span>
            <h1 style={{ fontSize: 'clamp(42px,7vw,76px)', lineHeight: .96, margin: '18px 0 16px', maxWidth: 720 }}>Start a private AI music session.</h1>
            <p className="lead">Use Supabase cloud login when configured, or keep local MVP mode for fast testing. v9.1 adds project library visibility, file counts, generated sound counts, and clear feature states.</p>
            <div className="mini-grid" style={{ marginTop: 24 }}>
              <div className="card" style={{ boxShadow: 'none' }}><Cloud size={18} color="#55e9ff" /><h3>Cloud projects</h3><p className="muted">Supabase user-owned project storage.</p></div>
              <div className="card" style={{ boxShadow: 'none' }}><Library size={18} color="#55e9ff" /><h3>Project library</h3><p className="muted">Files, sounds, feedback and readiness in one place.</p></div>
              <div className="card" style={{ boxShadow: 'none' }}><Sparkles size={18} color="#55e9ff" /><h3>AI-ready</h3><p className="muted">Prepared for FastAPI audio jobs.</p></div>
            </div>
          </div>
        </section>
        <section style={{ ...panel, padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <button type="button" className={mode === 'cloud-signin' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signin')} disabled={!isSupabaseConfigured}>Cloud sign in</button>
            <button type="button" className={mode === 'cloud-signup' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signup')} disabled={!isSupabaseConfigured}>Cloud sign up</button>
            <button type="button" className={mode === 'local' ? 'primary' : 'secondary'} onClick={() => setMode('local')}>Local fallback</button>
          </div>
          <p className="eyebrow">{isSupabaseConfigured ? 'Supabase configured' : 'Supabase not configured locally'}</p>
          <h2 style={{ margin: '6px 0 8px' }}>{mode === 'local' ? 'Create local session' : 'Access your cloud studio'}</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>{mode === 'local' ? 'Local mode stores projects in this browser only.' : 'Cloud mode stores projects in Supabase with private Row Level Security.'}</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            <label className="auth-field">Email<input value={form.email} onChange={(event) => update('email', event.target.value)} type="email" placeholder="artist@email.com" autoComplete="email" /></label>
            {mode !== 'local' ? <PasswordInput value={form.password} onChange={(value) => update('password', value)} disabled={busy} /> : null}
            <label className="auth-field">Artist / producer name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your artist or producer name" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
              <label className="auth-field">Role<select value={form.role} onChange={(event) => update('role', event.target.value)}><option>Artist</option><option>Producer</option><option>Sound Engineer</option><option>Manager</option></select></label>
              <label className="auth-field">Language<select value={form.language} onChange={(event) => update('language', event.target.value)}><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option></select></label>
            </div>
            {error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div> : null}
            {info ? <div style={{ border: '1px solid rgba(85,233,255,.35)', background: 'rgba(85,233,255,.1)', color: '#dffaff', borderRadius: 16, padding: 12 }}>{info}</div> : null}
            {mode === 'local' ? <><button type="button" className="primary" onClick={startLocalSession}><ShieldCheck size={17} /> Start local dashboard</button><button type="button" className="secondary" onClick={useDemo}>Use demo artist account</button></> : <button type="button" className="primary" onClick={submitCloud} disabled={busy}>{busy ? 'Please wait...' : mode === 'cloud-signup' ? 'Create cloud account' : 'Sign in to cloud dashboard'}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, icon: Icon }) {
  return <div className="card" style={{ boxShadow: 'none' }}><Icon size={18} color="#55e9ff" /><b style={{ display: 'block', fontSize: 32, marginTop: 8 }}>{value}</b><span className="muted">{label}</span></div>;
}

function CreateProjectModal({ onClose, onCreate, cloudMode }) {
  const [project, setProject] = useState({ title: '', artist: '', type: 'Full song', genre: 'Afrobeat', status: 'Draft', notes: '' });
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setProject((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onCreate({ id: makeId('project'), ...project, title: project.title.trim() || 'Untitled Infinity Session', artist: project.artist.trim() || 'Unknown Artist', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), files: [], analysis: { bpm: 'Pending', key: 'Pending', loudness: 'Pending', status: 'Ready for upload', generated_sounds: [], feedback: [] } });
    } finally { setBusy(false); }
  };
  return (
    <div data-infinity-auth="true" style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(0,0,0,.68)', padding: 18, overflowY: 'auto' }}>
      <form onSubmit={submit} style={{ ...panel, maxWidth: 720, margin: '40px auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}><div><p className="eyebrow">New project - {cloudMode ? 'Cloud' : 'Local'}</p><h2 style={{ margin: '6px 0 8px' }}>Create private song session</h2><p className="muted">Prepare a project container before upload, mix, master, export or AI generation.</p></div><button type="button" className="secondary" onClick={onClose} style={{ width: 42, height: 42, padding: 0 }}><X size={18} /></button></div>
        <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          <label className="auth-field">Project title<input value={project.title} onChange={(event) => update('title', event.target.value)} placeholder="Song title or session name" /></label>
          <label className="auth-field">Artist<input value={project.artist} onChange={(event) => update('artist', event.target.value)} placeholder="Artist name" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="auth-three">
            <label className="auth-field">Type<select value={project.type} onChange={(event) => update('type', event.target.value)}><option>Full song</option><option>Instrumental</option><option>Vocal mix</option><option>Stem mix</option><option>Sound design</option></select></label>
            <label className="auth-field">Genre<select value={project.genre} onChange={(event) => update('genre', event.target.value)}><option>Afrobeat</option><option>Trap</option><option>Drill</option><option>House</option><option>Gospel</option><option>Cinematic</option><option>Soul</option><option>Experimental</option></select></label>
            <label className="auth-field">Status<select value={project.status} onChange={(event) => update('status', event.target.value)}><option>Draft</option><option>Ready for upload</option><option>In production</option><option>Ready for mastering</option><option>Ready for export</option></select></label>
          </div>
          <label className="auth-field">Notes<textarea value={project.notes} onChange={(event) => update('notes', event.target.value)} rows={4} placeholder="Reference, emotion, target sound, release plan..." /></label>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating...' : 'Create project'}</button>
        </div>
      </form>
    </div>
  );
}

function ProjectLibraryPanel({ project, compact = false }) {
  const files = Array.isArray(project?.files) ? project.files : [];
  const sounds = getGeneratedSounds(project);
  const feedback = getFeedback(project);
  const featureStates = [
    ['Cloud project', project?.cloud ? 'Available' : 'Beta'],
    ['Audio upload', 'Available'],
    ['Backend mastering', 'Beta'],
    ['Generated sounds', sounds.length ? 'Available' : 'Beta'],
    ['Stem separation', 'Coming soon'],
    ['Full DAW editor', 'Coming soon'],
  ];
  if (!project) return null;
  return (
    <section data-infinity-auth="true" style={{ ...panel, padding: compact ? 14 : 20 }}>
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div><p className="eyebrow">v9.1 Project library</p><h2 style={{ margin: '4px 0 0' }}>{project.title}</h2><p className="muted" style={{ marginTop: 6 }}>{project.artist} - {project.genre} - {project.status}</p></div>
        <div className="actions"><StateBadge state="Available" /><StateBadge state="Beta" /><StateBadge state="Coming soon" /></div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', marginBottom: 14 }}>
        <Stat label="Files" value={files.length} icon={FileAudio} />
        <Stat label="Generated sounds" value={sounds.length} icon={Sparkles} />
        <Stat label="Feedback notes" value={feedback.length} icon={Library} />
        <Stat label="Mode" value={project.cloud ? 'Cloud' : 'Local'} icon={project.cloud ? Cloud : Lock} />
      </div>
      <div className="three" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <div className="card" style={{ boxShadow: 'none' }}><h3><FileAudio size={17} /> Uploaded files</h3>{files.length ? files.slice(0, 4).map((file) => <p key={file.id || file.name} className="muted" style={{ margin: '8px 0' }}>{file.name || file.filename || 'Audio file'} - {formatBytes(file.size || file.size_bytes)}</p>) : <p className="muted">No project files saved yet. Upload from Mix & Master.</p>}</div>
        <div className="card" style={{ boxShadow: 'none' }}><h3><Sparkles size={17} /> Generated sounds</h3>{sounds.length ? sounds.slice(0, 4).map((sound) => <p key={sound.id || sound.asset_id || sound.name} className="muted" style={{ margin: '8px 0' }}>{sound.name || sound.prompt || 'Generated WAV'} {sound.download_url ? <a href={sound.download_url} target="_blank" rel="noreferrer" style={{ color: '#55e9ff' }}>Open</a> : null}</p>) : <p className="muted">No generated sounds saved yet. Use AI Sound Generator.</p>}</div>
        <div className="card" style={{ boxShadow: 'none' }}><h3><Download size={17} /> Feature states</h3>{featureStates.map(([label, state]) => <p key={label} className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><span>{label}</span><StateBadge state={state} /></p>)}</div>
      </div>
    </section>
  );
}

function ProjectCard({ project, onOpen, onDelete }) {
  const fileCount = Array.isArray(project.files) ? project.files.length : 0;
  const soundCount = getGeneratedSounds(project).length;
  return (
    <div className="card project-card" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><p className="eyebrow">{project.type}</p><h3 style={{ margin: '6px 0 4px' }}>{project.title}</h3><p className="muted" style={{ margin: 0 }}>{project.artist} - {project.genre}</p></div><span className="pill">{project.status}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 16 }}><div><span className="muted">Files</span><b style={{ display: 'block' }}>{fileCount}</b></div><div><span className="muted">Sounds</span><b style={{ display: 'block' }}>{soundCount}</b></div></div>
      <p className="muted" style={{ lineHeight: 1.6, minHeight: 44 }}>{project.notes || 'No notes yet.'}</p><p className="muted" style={{ fontSize: 12 }}>Updated {formatDate(project.updatedAt)}</p>
      <div className="actions"><button type="button" className="primary" onClick={() => onOpen(project)}><Music2 size={15} /> Open studio</button><button type="button" className="secondary" onClick={() => onDelete(project.id)}>Delete</button></div>
    </div>
  );
}

function Dashboard({ profile, projects, onCreate, onLogout, onOpenProject, onDeleteProject, cloudMode, loading, error }) {
  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => ['In production', 'Ready for mastering', 'Ready for upload'].includes(project.status)).length,
    files: projects.reduce((sum, project) => sum + (Array.isArray(project.files) ? project.files.length : 0), 0),
    sounds: projects.reduce((sum, project) => sum + getGeneratedSounds(project).length, 0),
  }), [projects]);
  return (
    <main data-infinity-auth="true" style={shell}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{ ...panel, padding: 20, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><div className="logo" /><div><p className="eyebrow">Infinity private dashboard</p><h2 style={{ margin: '4px 0 0' }}>Welcome, {profile.name}</h2><p className="muted" style={{ margin: '6px 0 0' }}>{profile.role} - {profile.email}</p></div></div><div className="actions"><ModeBadge cloudMode={cloudMode} /><button type="button" className="primary" onClick={onCreate}><FolderPlus size={16} /> New project</button><button type="button" className="secondary" onClick={onLogout}><LogOut size={16} /> Logout</button></div></header>
        {error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div> : null}
        <section className="stats"><Stat label="Projects" value={loading ? '...' : stats.total} icon={Music2} /><Stat label="Active" value={loading ? '...' : stats.active} icon={AudioLines} /><Stat label="Files saved" value={loading ? '...' : stats.files} icon={FileAudio} /><Stat label="Sounds" value={loading ? '...' : stats.sounds} icon={Sparkles} /></section>
        <section style={{ ...panel, padding: 22 }}><div className="section-head"><div><p className="eyebrow">Projects</p><h2>Private song sessions</h2><p className="muted wide">{cloudMode ? 'Projects are loaded from Supabase and protected by Row Level Security.' : 'Projects are stored locally in this browser until Supabase is configured or selected.'}</p></div><button type="button" className="primary" onClick={onCreate}><Plus size={16} /> Create project</button></div>{projects.length ? <div className="three">{projects.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} onDelete={onDeleteProject} />)}</div> : <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}><FolderPlus size={34} color="#55e9ff" /><h3>{loading ? 'Loading projects...' : 'No private project yet'}</h3><p className="muted">Create your first project to start the Infinity song cycle.</p><button type="button" className="primary" onClick={onCreate}><Plus size={16} /> Create first project</button></div>}</section>
        {projects[0] ? <ProjectLibraryPanel project={projects[0]} /> : null}
      </div>
    </main>
  );
}

export default function AuthDashboard({ children }) {
  const [profile, setProfile] = useState(() => loadJson(STORAGE_KEYS.session, null));
  const [projects, setProjects] = useState(() => loadJson(STORAGE_KEYS.projects, []));
  const [showCreate, setShowCreate] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cloudMode = profile?.authMode === 'supabase-cloud' && isSupabaseConfigured;

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return;
    getSupabaseSession().then((session) => { if (!active || !session?.user) return; setProfile(profileFromSupabaseUser(session.user)); }).catch(() => {});
    const subscription = supabase?.auth?.onAuthStateChange?.((_event, session) => { if (session?.user) setProfile(profileFromSupabaseUser(session.user)); if (!session?.user && profile?.authMode === 'supabase-cloud') setProfile(null); });
    return () => { active = false; subscription?.data?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => { if (!cloudMode) saveJson(STORAGE_KEYS.projects, projects); }, [projects, cloudMode]);
  useEffect(() => { if (!cloudMode || !profile?.id) return; setLoading(true); setError(''); listCloudProjects(profile.id).then((rows) => setProjects(rows.map(normalizeProject))).catch((err) => setError(err.message || 'Could not load cloud projects.')).finally(() => setLoading(false)); }, [cloudMode, profile?.id]);

  const createProject = async (project) => {
    if (cloudMode) {
      const row = await createCloudProject({ user_id: profile.id, title: project.title, artist: project.artist, type: project.type, genre: project.genre, status: project.status, notes: project.notes, analysis: project.analysis, files: project.files });
      const normalized = normalizeProject(row); setProjects((current) => [normalized, ...current]); setShowCreate(false); setCurrentProject(normalized); setStudioOpen(true); return;
    }
    setProjects((current) => [project, ...current]); setShowCreate(false); setCurrentProject(project); setStudioOpen(true);
  };

  const logout = async () => { if (cloudMode) await signOutSupabase().catch(() => {}); localStorage.removeItem(STORAGE_KEYS.session); setProfile(null); setStudioOpen(false); setCurrentProject(null); setProjects(loadJson(STORAGE_KEYS.projects, [])); };
  const openProject = (project) => { const updated = { ...project, updatedAt: new Date().toISOString() }; if (!cloudMode) setProjects((current) => current.map((item) => (item.id === project.id ? updated : item))); setCurrentProject(updated); setStudioOpen(true); };
  const deleteProject = async (id) => { if (cloudMode) await deleteCloudProject(id); setProjects((current) => current.filter((project) => project.id !== id)); };
  const refreshProjects = async () => { if (!cloudMode || !profile?.id) return; setLoading(true); const rows = await listCloudProjects(profile.id); setProjects(rows.map(normalizeProject)); setLoading(false); };

  if (!profile) return <StartPrivateSession onLogin={setProfile} />;
  if (studioOpen) return <>{children}<div data-infinity-auth="true" style={{ position: 'fixed', left: 18, top: 18, zIndex: 9996, display: 'flex', gap: 10, flexWrap: 'wrap' }}><button type="button" className="secondary" onClick={() => { setStudioOpen(false); refreshProjects().catch(() => {}); }}>Back to dashboard</button><span className="pill">{currentProject?.title || 'Infinity Studio'}</span><ModeBadge cloudMode={cloudMode} /></div><div data-infinity-auth="true" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9995, width: 'min(520px, calc(100vw - 36px))', maxHeight: '42vh', overflowY: 'auto' }}><ProjectLibraryPanel project={currentProject} compact /></div></>;
  return <><Dashboard profile={profile} projects={projects} onCreate={() => setShowCreate(true)} onLogout={logout} onOpenProject={openProject} onDeleteProject={deleteProject} cloudMode={cloudMode} loading={loading} error={error} />{showCreate ? <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} cloudMode={cloudMode} /> : null}</>;
}
