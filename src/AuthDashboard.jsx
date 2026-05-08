import { useEffect, useMemo, useState } from 'react';
import {
  AudioLines,
  Cloud,
  CloudUpload,
  FolderPlus,
  Lock,
  LogOut,
  Music2,
  Plus,
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

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
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
    files: row.files || [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    cloud: Boolean(row.user_id),
  };
}

function ModeBadge({ cloudMode }) {
  return (
    <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {cloudMode ? <Cloud size={14} /> : <Lock size={14} />}
      {cloudMode ? 'Cloud Mode' : 'Local Mode'}
    </span>
  );
}

function StartPrivateSession({ onLogin }) {
  const [mode, setMode] = useState(isSupabaseConfigured ? 'cloud-signin' : 'local');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'Artist', language: 'English' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key, value) => {
    setError('');
    setInfo('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const startLocalSession = () => {
    const email = form.email.trim();
    const name = form.name.trim();
    if (!email && !name) {
      setError('Add at least an email or artist name to start a private session.');
      return;
    }
    const profile = {
      id: makeId('user'),
      email: email || 'creator@infinity.local',
      name: name || email.split('@')[0] || 'Infinity Creator',
      role: form.role,
      language: form.language,
      signedInAt: new Date().toISOString(),
      authMode: 'local-private-mvp',
    };
    saveJson(STORAGE_KEYS.session, profile);
    onLogin(profile);
  };

  const useDemo = () => {
    const profile = {
      id: makeId('user'),
      email: 'demo@infinity.local',
      name: 'Demo Artist',
      role: 'Artist',
      language: 'English',
      signedInAt: new Date().toISOString(),
      authMode: 'demo-local-private-mvp',
    };
    saveJson(STORAGE_KEYS.session, profile);
    onLogin(profile);
  };

  const submitCloud = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart Vite.');
      return;
    }
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required for cloud login.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      const payload = mode === 'cloud-signup'
        ? await signUpWithEmail(form.email.trim(), form.password, { name: form.name || form.email.split('@')[0], role: form.role, language: form.language })
        : await signInWithEmail(form.email.trim(), form.password);

      const user = payload?.user || payload?.session?.user;
      const session = payload?.session;

      if (!session && mode === 'cloud-signup') {
        setInfo('Account created. If email confirmation is enabled in Supabase, confirm your email, then sign in.');
        return;
      }

      if (!user) throw new Error('Supabase did not return a user session.');
      onLogin(profileFromSupabaseUser(user));
    } catch (err) {
      setError(err.message || 'Cloud authentication failed.');
    } finally {
      setBusy(false);
    }
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
            <p className="lead">Use Supabase cloud login when configured, or keep local MVP mode for fast testing. Your projects become cloud-private once you sign in with Supabase.</p>
            <div className="mini-grid" style={{ marginTop: 24 }}>
              <div className="card" style={{ boxShadow: 'none' }}><Cloud size={18} color="#55e9ff" /><h3>Cloud projects</h3><p className="muted">Supabase user-owned project storage.</p></div>
              <div className="card" style={{ boxShadow: 'none' }}><Lock size={18} color="#55e9ff" /><h3>Local fallback</h3><p className="muted">Works even without cloud keys.</p></div>
              <div className="card" style={{ boxShadow: 'none' }}><Sparkles size={18} color="#55e9ff" /><h3>AI-ready</h3><p className="muted">Prepared for FastAPI audio jobs.</p></div>
            </div>
          </div>
        </section>

        <section style={{ ...panel, padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <button className={mode === 'cloud-signin' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signin')} disabled={!isSupabaseConfigured}>Cloud sign in</button>
            <button className={mode === 'cloud-signup' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signup')} disabled={!isSupabaseConfigured}>Cloud sign up</button>
            <button className={mode === 'local' ? 'primary' : 'secondary'} onClick={() => setMode('local')}>Local fallback</button>
          </div>

          <p className="eyebrow">{isSupabaseConfigured ? 'Supabase configured' : 'Supabase not configured locally'}</p>
          <h2 style={{ margin: '6px 0 8px' }}>{mode === 'local' ? 'Create local session' : 'Access your cloud studio'}</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>{mode === 'local' ? 'Local mode stores projects in this browser only.' : 'Cloud mode stores projects in Supabase with private Row Level Security.'}</p>

          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            <label className="auth-field">Email<input value={form.email} onChange={(event) => update('email', event.target.value)} type="email" placeholder="artist@email.com" /></label>
            {mode !== 'local' ? <label className="auth-field">Password<input value={form.password} onChange={(event) => update('password', event.target.value)} type="password" placeholder="Minimum 6 characters" /></label> : null}
            <label className="auth-field">Artist / producer name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your artist or producer name" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
              <label className="auth-field">Role<select value={form.role} onChange={(event) => update('role', event.target.value)}><option>Artist</option><option>Producer</option><option>Sound Engineer</option><option>Manager</option></select></label>
              <label className="auth-field">Language<select value={form.language} onChange={(event) => update('language', event.target.value)}><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option></select></label>
            </div>

            {error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div> : null}
            {info ? <div style={{ border: '1px solid rgba(85,233,255,.35)', background: 'rgba(85,233,255,.1)', color: '#dffaff', borderRadius: 16, padding: 12 }}>{info}</div> : null}

            {mode === 'local' ? (
              <>
                <button type="button" className="primary" onClick={startLocalSession}><ShieldCheck size={17} /> Start local dashboard</button>
                <button type="button" className="secondary" onClick={useDemo}>Use demo artist account</button>
              </>
            ) : (
              <button type="button" className="primary" onClick={submitCloud} disabled={busy}>{busy ? 'Please wait...' : mode === 'cloud-signup' ? 'Create cloud account' : 'Sign in to cloud dashboard'}</button>
            )}
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
      await onCreate({
        id: makeId('project'),
        ...project,
        title: project.title.trim() || 'Untitled Infinity Session',
        artist: project.artist.trim() || 'Unknown Artist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        files: [],
        analysis: { bpm: 'Pending', key: 'Pending', loudness: 'Pending', status: 'Ready for upload' },
      });
    } finally {
      setBusy(false);
    }
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
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create project'}</button>
        </div>
      </form>
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete }) {
  return (
    <div className="card project-card" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><p className="eyebrow">{project.type}</p><h3 style={{ margin: '6px 0 4px' }}>{project.title}</h3><p className="muted" style={{ margin: 0 }}>{project.artist} - {project.genre}</p></div><span className="pill">{project.status}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 16 }}><div><span className="muted">BPM</span><b style={{ display: 'block' }}>{project.analysis?.bpm || 'Pending'}</b></div><div><span className="muted">Key</span><b style={{ display: 'block' }}>{project.analysis?.key || 'Pending'}</b></div></div>
      <p className="muted" style={{ lineHeight: 1.6, minHeight: 44 }}>{project.notes || 'No notes yet.'}</p><p className="muted" style={{ fontSize: 12 }}>Updated {formatDate(project.updatedAt)}</p>
      <div className="actions"><button className="primary" onClick={() => onOpen(project)}><Music2 size={15} /> Open studio</button><button className="secondary" onClick={() => onDelete(project.id)}>Delete</button></div>
    </div>
  );
}

function Dashboard({ profile, projects, onCreate, onLogout, onOpenProject, onDeleteProject, cloudMode, loading, error }) {
  const stats = useMemo(() => ({ total: projects.length, active: projects.filter((project) => ['In production', 'Ready for mastering', 'Ready for upload'].includes(project.status)).length, exportReady: projects.filter((project) => project.status === 'Ready for export').length }), [projects]);
  return (
    <main data-infinity-auth="true" style={shell}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{ ...panel, padding: 20, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><div className="logo" /><div><p className="eyebrow">Infinity private dashboard</p><h2 style={{ margin: '4px 0 0' }}>Welcome, {profile.name}</h2><p className="muted" style={{ margin: '6px 0 0' }}>{profile.role} - {profile.email}</p></div></div><div className="actions"><ModeBadge cloudMode={cloudMode} /><button className="primary" onClick={onCreate}><FolderPlus size={16} /> New project</button><button className="secondary" onClick={onLogout}><LogOut size={16} /> Logout</button></div></header>
        {error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div> : null}
        <section className="stats"><Stat label="Private projects" value={loading ? '...' : stats.total} icon={Music2} /><Stat label="Active sessions" value={loading ? '...' : stats.active} icon={AudioLines} /><Stat label="Ready for export" value={loading ? '...' : stats.exportReady} icon={CloudUpload} /><Stat label={cloudMode ? 'Supabase cloud' : 'Local MVP auth'} value="ON" icon={cloudMode ? Cloud : Lock} /></section>
        <section style={{ ...panel, padding: 22 }}><div className="section-head"><div><p className="eyebrow">Projects</p><h2>Private song sessions</h2><p className="muted wide">{cloudMode ? 'Projects are loaded from Supabase and protected by Row Level Security.' : 'Projects are stored locally in this browser until Supabase is configured or selected.'}</p></div><button className="primary" onClick={onCreate}><Plus size={16} /> Create project</button></div>
          {projects.length ? <div className="three">{projects.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} onDelete={onDeleteProject} />)}</div> : <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}><FolderPlus size={34} color="#55e9ff" /><h3>{loading ? 'Loading projects...' : 'No private project yet'}</h3><p className="muted">Create your first project to start the Infinity song cycle.</p><button className="primary" onClick={onCreate}><Plus size={16} /> Create first project</button></div>}
        </section>
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
    getSupabaseSession().then((session) => {
      if (!active || !session?.user) return;
      setProfile(profileFromSupabaseUser(session.user));
    }).catch(() => {});
    const subscription = supabase?.auth?.onAuthStateChange?.((_event, session) => {
      if (session?.user) setProfile(profileFromSupabaseUser(session.user));
      if (!session?.user && profile?.authMode === 'supabase-cloud') setProfile(null);
    });
    return () => { active = false; subscription?.data?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => { if (!cloudMode) saveJson(STORAGE_KEYS.projects, projects); }, [projects, cloudMode]);

  useEffect(() => {
    if (!cloudMode || !profile?.id) return;
    setLoading(true); setError('');
    listCloudProjects(profile.id).then((rows) => setProjects(rows.map(normalizeProject))).catch((err) => setError(err.message || 'Could not load cloud projects.')).finally(() => setLoading(false));
  }, [cloudMode, profile?.id]);

  const createProject = async (project) => {
    if (cloudMode) {
      const row = await createCloudProject({ user_id: profile.id, title: project.title, artist: project.artist, type: project.type, genre: project.genre, status: project.status, notes: project.notes, analysis: project.analysis, files: project.files });
      const normalized = normalizeProject(row);
      setProjects((current) => [normalized, ...current]);
      setShowCreate(false); setCurrentProject(normalized); setStudioOpen(true); return;
    }
    setProjects((current) => [project, ...current]); setShowCreate(false); setCurrentProject(project); setStudioOpen(true);
  };

  const logout = async () => {
    if (cloudMode) await signOutSupabase().catch(() => {});
    localStorage.removeItem(STORAGE_KEYS.session); setProfile(null); setStudioOpen(false); setCurrentProject(null); setProjects(loadJson(STORAGE_KEYS.projects, []));
  };

  const openProject = (project) => { const updated = { ...project, updatedAt: new Date().toISOString() }; if (!cloudMode) setProjects((current) => current.map((item) => (item.id === project.id ? updated : item))); setCurrentProject(updated); setStudioOpen(true); };
  const deleteProject = async (id) => { if (cloudMode) await deleteCloudProject(id); setProjects((current) => current.filter((project) => project.id !== id)); };

  if (!profile) return <StartPrivateSession onLogin={setProfile} />;
  if (studioOpen) return <>{children}<div data-infinity-auth="true" style={{ position: 'fixed', left: 18, top: 18, zIndex: 9996, display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="secondary" onClick={() => setStudioOpen(false)}>Back to dashboard</button><span className="pill">{currentProject?.title || 'Infinity Studio'}</span><ModeBadge cloudMode={cloudMode} /></div></>;
  return <><Dashboard profile={profile} projects={projects} onCreate={() => setShowCreate(true)} onLogout={logout} onOpenProject={openProject} onDeleteProject={deleteProject} cloudMode={cloudMode} loading={loading} error={error} />{showCreate ? <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} cloudMode={cloudMode} /> : null}</>;
}
