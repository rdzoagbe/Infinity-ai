import { useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, Download, Eye, EyeOff, FileAudio, FolderPlus, Library, Lock, LogOut, Music2, Plus, RefreshCw, Rocket, ShieldCheck, Sparkles, X } from 'lucide-react';
import { appendCloudProjectFile, appendCloudProjectSound, createCloudProject, deleteCloudProject, getSupabaseSession, isSupabaseConfigured, listCloudProjects, signInWithEmail, signOutSupabase, signUpWithEmail, supabase } from './api/supabaseClient.js';
import { backendUrl } from './api/infinityBackend.js';

const STORAGE_KEYS = { session: 'infinity_private_session_v3', projects: 'infinity_private_projects_v3' };
const shell = { minHeight: '100vh', color: '#f5f8ff', background: 'radial-gradient(circle at top left,rgba(0,212,255,.14),transparent 30%),radial-gradient(circle at top right,rgba(255,77,225,.13),transparent 25%),#090b14', padding: 18 };
const panel = { background: 'rgba(17,20,33,.84)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.09)', borderRadius: 28 };

function loadJson(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function makeId(prefix = 'item') { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
function formatBytes(bytes) { if (!bytes) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`; }
function formatDate(value) { try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value || ''; } }
function downloadJson(fileName, payload) { const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url); }
function generatePasswordSuggestion() { const words = ['Sonic', 'Velvet', 'Nova', 'Echo', 'Studio', 'Rhythm', 'Orbit', 'Pulse', 'Wave', 'Neon']; return `${words[Math.floor(Math.random() * words.length)]}${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}!`; }
function profileFromSupabaseUser(user) { return { id: user.id, email: user.email, name: user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'Infinity Creator', role: user?.user_metadata?.role || 'Artist', language: user?.user_metadata?.language || 'English', signedInAt: new Date().toISOString(), authMode: 'supabase-cloud' }; }
function normalizeProject(row) { return { id: row.id, title: row.title, artist: row.artist || 'Unknown Artist', type: row.type || 'Full song', genre: row.genre || 'Unknown', status: row.status || 'Draft', notes: row.notes || '', analysis: row.analysis || { generated_sounds: [], feedback: [], export_packages: [] }, files: Array.isArray(row.files) ? row.files : [], createdAt: row.created_at || row.createdAt || new Date().toISOString(), updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(), cloud: Boolean(row.user_id) }; }
function assets(project) { return Array.isArray(project?.analysis?.generated_sounds) ? project.analysis.generated_sounds : []; }
function assetText(asset) { return `${asset?.type || ''} ${asset?.source || ''} ${asset?.name || ''}`.toLowerCase(); }
function isMaster(asset) { return assetText(asset).includes('master'); }
function isRelease(asset) { return assetText(asset).includes('release'); }
function isExport(asset) { return assetText(asset).includes('export') && !isRelease(asset); }
function generatedSounds(project) { return assets(project).filter((asset) => !isMaster(asset) && !isRelease(asset) && !isExport(asset)); }
function masteredVersions(project) { return assets(project).filter(isMaster); }
function releasePackages(project) { return assets(project).filter(isRelease); }
function exportPackages(project) { const direct = Array.isArray(project?.analysis?.export_packages) ? project.analysis.export_packages : []; return [...direct, ...assets(project).filter(isExport)]; }
function resolveAssetUrl(url) { if (!url) return ''; return url.startsWith('http') || url.startsWith('blob:') ? url : backendUrl(url); }

function openFileInStudio(file) {
  try {
    localStorage.setItem('infinity_studio_session_v1', JSON.stringify({
      songBackend: { file_id: file.file_id || file.id, filename: file.name || file.filename },
      savedAt: new Date().toISOString(),
    }));
  } catch {}
  window.dispatchEvent(new CustomEvent('infinity:open-studio'));
}

function AudioPlayer({ url, label }) {
  const resolved = resolveAssetUrl(url);
  if (!resolved) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {label && <div style={{ fontSize: 11, color: 'rgba(245,248,255,.4)', marginBottom: 4 }}>{label}</div>}
      <audio controls src={resolved} style={{ width: '100%', height: 32, borderRadius: 8 }} />
    </div>
  );
}

function Badge({ children }) { return <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>; }
function ModeBadge({ cloudMode }) { return <Badge>{cloudMode ? <Cloud size={14} /> : <Lock size={14} />}{cloudMode ? 'Cloud Mode' : 'Local Mode'}</Badge>; }
function StateBadge({ state }) { const color = state === 'Available' ? '#57f09c' : state === 'Beta' ? '#55e9ff' : '#ffcf66'; return <span className="pill" style={{ color, borderColor: `${color}55`, background: `${color}18` }}>{state}</span>; }

function Stat({ label, value, icon: Icon, active, onClick, action, color = '#55e9ff', hint }) {
  return (
    <div
      className="card"
      data-infinity-local-action="true"
      onClick={onClick}
      style={{
        boxShadow: 'none',
        cursor: onClick ? 'pointer' : 'default',
        border: active ? `1px solid ${color}55` : '1px solid rgba(255,255,255,.06)',
        background: active ? `${color}0e` : 'rgba(255,255,255,.03)',
        transition: 'all .18s',
        position: 'relative',
      }}
    >
      <Icon size={18} color={color} />
      <b style={{ display: 'block', fontSize: 32, marginTop: 8, color: active ? color : '#f5f8ff' }}>{value}</b>
      <span className="muted">{label}</span>
      {hint && <div style={{ fontSize: 11, color: 'rgba(245,248,255,.38)', marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
      {action && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 700 }}>{action} →</div>}
    </div>
  );
}
function AssetLinks({ asset }) { const links = []; if (asset.preview_url) links.push(['Preview', asset.preview_url]); if (asset.download_url) links.push(['Download', asset.download_url]); if (Array.isArray(asset.assets)) asset.assets.forEach((item) => { if (item?.download_url) links.push([item.type?.toUpperCase?.() || item.name || 'Asset', item.download_url]); }); if (!links.length) return null; return <div className="actions" style={{ marginTop: 8 }}>{links.slice(0, 4).map(([label, url], index) => <a key={`${label}-${index}`} href={resolveAssetUrl(url)} target="_blank" rel="noreferrer" className="secondary" style={{ padding: '8px 10px', fontSize: 12 }}>{label}</a>)}</div>; }

function PasswordInput({ value, onChange, disabled }) {
  const [visible, setVisible] = useState(false);
  return <label className="auth-field">Password<div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}><input value={value} onChange={(event) => onChange(event.target.value)} type={visible ? 'text' : 'password'} placeholder="Minimum 6 characters" disabled={disabled} autoComplete="current-password" style={{ minWidth: 0 }} /><button type="button" className="secondary" onClick={() => setVisible((current) => !current)} disabled={disabled} title={visible ? 'Hide password' : 'Show password'} style={{ padding: '12px 14px' }}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button><button type="button" className="secondary" onClick={() => onChange(generatePasswordSuggestion())} disabled={disabled} title="Generate password suggestion" style={{ padding: '12px 14px' }}><RefreshCw size={16} /></button></div><small className="muted">Use the eye to show/hide. Use the refresh button to generate a strong suggestion.</small></label>;
}

function StartPrivateSession({ onLogin }) {
  const [mode, setMode] = useState(isSupabaseConfigured ? 'cloud-signin' : 'local');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'Artist', language: 'English' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => { setError(''); setInfo(''); setForm((current) => ({ ...current, [key]: value })); };
  const startLocalSession = () => { const email = form.email.trim(); const name = form.name.trim(); if (!email && !name) { setError('Add at least an email or artist name to start a private session.'); return; } const profile = { id: makeId('user'), email: email || 'creator@infinity.local', name: name || email.split('@')[0] || 'Infinity Creator', role: form.role, language: form.language, signedInAt: new Date().toISOString(), authMode: 'local-private-mvp' }; saveJson(STORAGE_KEYS.session, profile); onLogin(profile); };
  const useDemo = () => { const profile = { id: makeId('user'), email: 'demo@infinity.local', name: 'Demo Artist', role: 'Artist', language: 'English', signedInAt: new Date().toISOString(), authMode: 'demo-local-private-mvp' }; saveJson(STORAGE_KEYS.session, profile); onLogin(profile); };
  const submitCloud = async () => { if (!isSupabaseConfigured) { setError('Supabase is not configured. Add GitHub/Vite Supabase environment variables.'); return; } if (!form.email.trim() || !form.password) { setError('Email and password are required for cloud login.'); return; } if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; } setBusy(true); try { const payload = mode === 'cloud-signup' ? await signUpWithEmail(form.email.trim(), form.password, { name: form.name || form.email.split('@')[0], role: form.role, language: form.language }) : await signInWithEmail(form.email.trim(), form.password); const user = payload?.user || payload?.session?.user; const session = payload?.session; if (!session && mode === 'cloud-signup') { setInfo('Account created. If email confirmation is enabled in Supabase, confirm your email, then sign in.'); return; } if (!user) throw new Error('Supabase did not return a user session.'); const profile = profileFromSupabaseUser(user); saveJson(STORAGE_KEYS.session, profile); onLogin(profile); } catch (err) { setError(err.message || 'Cloud authentication failed.'); } finally { setBusy(false); } };
  return <main data-infinity-auth="true" style={shell}><div className="auth-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, alignItems: 'stretch' }}><section style={{ ...panel, padding: 28, overflow: 'hidden', position: 'relative' }}><div style={{ position: 'absolute', width: 280, height: 280, borderRadius: 999, background: 'rgba(85,233,255,.18)', filter: 'blur(28px)', top: 30, left: 40 }} /><div style={{ position: 'relative' }}><span className="pill">Infinity private studio</span><h1 style={{ fontSize: 'clamp(42px,7vw,76px)', lineHeight: .96, margin: '18px 0 16px', maxWidth: 720 }}>Start a private AI music session.</h1><p className="lead">v12.2 separates files, sounds, masters, exports and release packages in the project library.</p><div className="mini-grid" style={{ marginTop: 24 }}><div className="card" style={{ boxShadow: 'none' }}><Cloud size={18} color="#55e9ff" /><h3>Cloud projects</h3><p className="muted">Supabase user-owned project storage.</p></div><div className="card" style={{ boxShadow: 'none' }}><Library size={18} color="#55e9ff" /><h3>Release packages</h3><p className="muted">Artist release metadata saved inside each project.</p></div><div className="card" style={{ boxShadow: 'none' }}><Sparkles size={18} color="#55e9ff" /><h3>AI-ready</h3><p className="muted">Prepared for FastAPI audio jobs.</p></div></div></div></section><section style={{ ...panel, padding: 24 }}><div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}><button type="button" className={mode === 'cloud-signin' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signin')} disabled={!isSupabaseConfigured}>Cloud sign in</button><button type="button" className={mode === 'cloud-signup' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signup')} disabled={!isSupabaseConfigured}>Cloud sign up</button><button type="button" className={mode === 'local' ? 'primary' : 'secondary'} onClick={() => setMode('local')}>Local fallback</button></div><p className="eyebrow">{isSupabaseConfigured ? 'Supabase configured' : 'Supabase not configured locally'}</p><h2 style={{ margin: '6px 0 8px' }}>{mode === 'local' ? 'Create local session' : 'Access your cloud studio'}</h2><p className="muted" style={{ lineHeight: 1.6 }}>{mode === 'local' ? 'Local mode stores projects in this browser only.' : 'Cloud mode stores projects in Supabase with private Row Level Security.'}</p><div style={{ display: 'grid', gap: 14, marginTop: 18 }}><label className="auth-field">Email<input value={form.email} onChange={(event) => update('email', event.target.value)} type="email" placeholder="artist@email.com" autoComplete="email" /></label>{mode !== 'local' ? <PasswordInput value={form.password} onChange={(value) => update('password', value)} disabled={busy} /> : null}<label className="auth-field">Artist / producer name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your artist or producer name" /></label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two"><label className="auth-field">Role<select value={form.role} onChange={(event) => update('role', event.target.value)}><option>Artist</option><option>Producer</option><option>Sound Engineer</option><option>Manager</option></select></label><label className="auth-field">Language<select value={form.language} onChange={(event) => update('language', event.target.value)}><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option></select></label></div>{error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div> : null}{info ? <div style={{ border: '1px solid rgba(85,233,255,.35)', background: 'rgba(85,233,255,.1)', color: '#dffaff', borderRadius: 16, padding: 12 }}>{info}</div> : null}{mode === 'local' ? <><button type="button" className="primary" onClick={startLocalSession}><ShieldCheck size={17} /> Start local dashboard</button><button type="button" className="secondary" onClick={useDemo}>Use demo artist account</button></> : <button type="button" className="primary" onClick={submitCloud} disabled={busy}>{busy ? 'Please wait...' : mode === 'cloud-signup' ? 'Create cloud account' : 'Sign in to cloud dashboard'}</button>}</div></section></div></main>;
}

function CreateProjectModal({ onClose, onCreate, cloudMode }) {
  const [project, setProject] = useState({ title: '', artist: '', type: 'Full song', genre: 'Afrobeat', status: 'Draft', notes: '' });
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setProject((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { await onCreate({ id: makeId('project'), ...project, title: project.title.trim() || 'Untitled Infinity Session', artist: project.artist.trim() || 'Unknown Artist', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), files: [], analysis: { status: 'Ready for upload', generated_sounds: [], feedback: [], export_packages: [] } }); } finally { setBusy(false); } };
  return <div data-infinity-auth="true" style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(0,0,0,.68)', padding: 18, overflowY: 'auto' }}><form onSubmit={submit} style={{ ...panel, maxWidth: 720, margin: '40px auto', padding: 24 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}><div><p className="eyebrow">New project - {cloudMode ? 'Cloud' : 'Local'}</p><h2 style={{ margin: '6px 0 8px' }}>Create private song session</h2><p className="muted">Prepare a project container before upload, mix, master, export or release preparation.</p></div><button type="button" className="secondary" onClick={onClose} style={{ width: 42, height: 42, padding: 0 }}><X size={18} /></button></div><div style={{ display: 'grid', gap: 14, marginTop: 18 }}><label className="auth-field">Project title<input value={project.title} onChange={(event) => update('title', event.target.value)} placeholder="Song title or session name" /></label><label className="auth-field">Artist<input value={project.artist} onChange={(event) => update('artist', event.target.value)} placeholder="Artist name" /></label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="auth-three"><label className="auth-field">Type<select value={project.type} onChange={(event) => update('type', event.target.value)}><option>Full song</option><option>Instrumental</option><option>Vocal mix</option><option>Stem mix</option><option>Sound design</option></select></label><label className="auth-field">Genre<select value={project.genre} onChange={(event) => update('genre', event.target.value)}><option>Afrobeat</option><option>Trap</option><option>Drill</option><option>House</option><option>Gospel</option><option>Cinematic</option><option>Soul</option><option>Experimental</option></select></label><label className="auth-field">Status<select value={project.status} onChange={(event) => update('status', event.target.value)}><option>Draft</option><option>Ready for upload</option><option>In production</option><option>Ready for mastering</option><option>Ready for release</option></select></label></div><label className="auth-field">Notes<textarea value={project.notes} onChange={(event) => update('notes', event.target.value)} rows={4} placeholder="Reference, emotion, target sound, release plan..." /></label><button type="submit" className="primary" disabled={busy}>{busy ? 'Creating...' : 'Create project'}</button></div></form></div>;
}

function ReleasePackageCard({ pkg }) {
  const fileName = pkg.filename || `${pkg.release_title || pkg.name || 'release-package'}.json`;
  return <div style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', borderRadius: 14, padding: 12 }}><p className="muted" style={{ margin: 0 }}><b style={{ color: '#f5f8ff' }}>{pkg.release_title || pkg.name || 'Release package'}</b><br />{pkg.artist || 'Unknown artist'} · {pkg.release_type || 'Release'} · {pkg.genre || 'Genre'}<br />{pkg.status || (pkg.package_ready ? 'Release Ready' : 'Draft')} · {pkg.checklist_completed ?? 0}/{pkg.checklist_total ?? 8} checklist · {formatDate(pkg.created_at || pkg.linked_at)}</p><div className="actions" style={{ marginTop: 8 }}><button className="secondary" style={{ padding: '8px 10px', fontSize: 12 }} onClick={() => downloadJson(fileName, pkg.payload || pkg)}>Download JSON</button></div></div>;
}

function ProjectLibraryPanel({ project, compact = false }) {
  const [drillTab, setDrillTab] = useState(null);
  const files = Array.isArray(project?.files) ? project.files : [];
  const generated = generatedSounds(project);
  const masters = masteredVersions(project);
  const exports = exportPackages(project);
  const releases = releasePackages(project);
  if (!project) return null;

  const toggle = (tab) => setDrillTab(prev => prev === tab ? null : tab);

  const row = { padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' };
  const meta = { fontSize: 12, color: 'rgba(245,248,255,.45)', marginTop: 2 };

  const renderDrill = () => {
    if (drillTab === 'files') return (
      <div>
        {files.length === 0 && <p className="muted">No files yet — upload a track in the studio.</p>}
        {files.map((f, i) => (
          <div key={f.id || i} style={{ ...row, alignItems: 'center' }}>
            <FileAudio size={15} color="#55e9ff" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name || f.filename || 'Audio file'}</div>
              <div style={meta}>{formatBytes(f.size || f.size_bytes)} · {formatDate(f.linked_at)}</div>
            </div>
            {(f.file_id || f.id) && (
              <button type="button" className="primary" data-infinity-local-action="true"
                onClick={() => openFileInStudio(f)}
                style={{ fontSize: 12, padding: '7px 13px', flexShrink: 0 }}>
                Continue →
              </button>
            )}
          </div>
        ))}
      </div>
    );
    if (drillTab === 'sounds') return (
      <div>
        {generated.length === 0 && <p className="muted">No generated sounds yet.</p>}
        {generated.map((s, i) => {
          const playUrl = resolveAssetUrl(s.preview_url || s.download_url || s.assets?.[0]?.download_url);
          return (
            <div key={s.id || i} style={row}>
              <Sparkles size={15} color="#57f09c" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name || s.prompt || 'Generated sound'}</div>
                <div style={meta}>{s.genre || ''} · {s.assets?.length || 1} asset(s) · {formatDate(s.created_at || s.linked_at)}</div>
                {playUrl && <audio controls src={playUrl} style={{ width: '100%', marginTop: 8, height: 32 }} />}
                <AssetLinks asset={s} />
              </div>
            </div>
          );
        })}
      </div>
    );
    if (drillTab === 'masters') return (
      <div>
        {masters.length === 0 && <p className="muted">No masters yet — complete the Master step in the studio.</p>}
        {masters.map((m, i) => {
          const playUrl = resolveAssetUrl(m.preview_url || m.download_url);
          return (
            <div key={m.id || i} style={row}>
              <Music2 size={15} color="#b78aff" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name || 'Mastered version'}</div>
                <div style={meta}>{m.mode || 'Custom'} · {m.platform || ''} · {m.strength ?? '-'}% · {formatDate(m.created_at || m.linked_at)}</div>
                {playUrl && <audio controls src={playUrl} style={{ width: '100%', marginTop: 8, height: 32 }} />}
                <AssetLinks asset={m} />
              </div>
            </div>
          );
        })}
      </div>
    );
    if (drillTab === 'releases') return (
      <div>
        {releases.length === 0 && <p className="muted">No release packages yet. Master your track first.</p>}
        {releases.map((r, i) => <ReleasePackageCard key={r.id || i} pkg={r} />)}
      </div>
    );
    if (drillTab === 'exports') return (
      <div>
        {exports.length === 0 && <p className="muted">No exports yet.</p>}
        {exports.map((e, i) => (
          <div key={e.id || i} style={row}>
            <Library size={15} color="#ffcf66" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name || 'Export package'}</div>
              <div style={meta}>{formatDate(e.created_at || e.linked_at)}</div>
              <AssetLinks asset={e} />
            </div>
          </div>
        ))}
      </div>
    );
    return null;
  };

  return (
    <section data-infinity-auth="true" style={{ ...panel, padding: compact ? 14 : 20 }}>
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div>
          <p className="eyebrow">v12.2 Project library</p>
          <h2 style={{ margin: '4px 0 0' }}>{project.title}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{project.artist} - {project.genre} - {project.status}</p>
        </div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', marginBottom: 14 }}>
        <Stat label="Files"    value={files.length}     icon={FileAudio} active={drillTab === 'files'}    onClick={() => toggle('files')}    action={files.length ? 'View' : 'Upload'}     hint="Click to browse" color="#55e9ff" />
        <Stat label="Sounds"   value={generated.length} icon={Sparkles}  active={drillTab === 'sounds'}   onClick={() => toggle('sounds')}   action={generated.length ? 'Play' : 'Generate'} hint="Click to view"  color="#57f09c" />
        <Stat label="Masters"  value={masters.length}   icon={Music2}    active={drillTab === 'masters'}  onClick={() => toggle('masters')}  action={masters.length ? 'Download' : 'Master'}  hint="Click to view"  color="#b78aff" />
        <Stat label="Releases" value={releases.length}  icon={Rocket}    active={drillTab === 'releases'} onClick={() => toggle('releases')} action={releases.length ? 'View' : 'Release'}   hint="Click to view"  color="#ffcf66" />
        <Stat label="Exports"  value={exports.length}   icon={Library}   active={drillTab === 'exports'}  onClick={() => toggle('exports')}  action={exports.length ? 'View' : 'Export'}     hint="Click to view"  color="#55e9ff" />
      </div>
      {drillTab && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{drillTab}</p>
            <button type="button" className="secondary" data-infinity-local-action="true" onClick={() => setDrillTab(null)} style={{ fontSize: 11, padding: '4px 10px' }}>✕ Close</button>
          </div>
          {renderDrill()}
        </div>
      )}
    </section>
  );
}

function ProjectCard({ project, onOpen, onDelete }) {
  return <div className="card project-card" style={{ boxShadow: 'none' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><p className="eyebrow">{project.type}</p><h3 style={{ margin: '6px 0 4px' }}>{project.title}</h3><p className="muted" style={{ margin: 0 }}>{project.artist} - {project.genre}</p></div><span className="pill">{project.status}</span></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginTop: 16 }}><div><span className="muted">Files</span><b style={{ display: 'block' }}>{Array.isArray(project.files) ? project.files.length : 0}</b></div><div><span className="muted">Sounds</span><b style={{ display: 'block' }}>{generatedSounds(project).length}</b></div><div><span className="muted">Masters</span><b style={{ display: 'block' }}>{masteredVersions(project).length}</b></div><div><span className="muted">Releases</span><b style={{ display: 'block' }}>{releasePackages(project).length}</b></div></div><p className="muted" style={{ lineHeight: 1.6, minHeight: 44 }}>{project.notes || 'No notes yet.'}</p><p className="muted" style={{ fontSize: 12 }}>Updated {formatDate(project.updatedAt)}</p><div className="actions"><button type="button" className="primary" onClick={() => onOpen(project)}><Music2 size={15} /> Open studio</button><button type="button" className="secondary" onClick={() => onDelete(project.id)}>Delete</button></div></div>;
}

function DrillPanel({ tab, projects, onOpenProject }) {
  const allFiles = projects.flatMap(p => (Array.isArray(p.files) ? p.files : []).map(f => ({ ...f, _project: p.title })));
  const allMasters = projects.flatMap(p => masteredVersions(p).map(m => ({ ...m, _project: p.title })));
  const allSounds = projects.flatMap(p => generatedSounds(p).map(s => ({ ...s, _project: p.title })));
  const allReleases = projects.flatMap(p => releasePackages(p).map(r => ({ ...r, _project: p.title })));
  const allExports = projects.flatMap(p => exportPackages(p).map(e => ({ ...e, _project: p.title })));

  const row = { padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' };
  const meta = { fontSize: 12, color: 'rgba(245,248,255,.45)', marginTop: 2 };

  if (tab === 'files') return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Uploaded files across all projects</p>
      {allFiles.length === 0 && <p className="muted">No files yet — upload a track in the studio to get started.</p>}
      {allFiles.map((f, i) => (
        <div key={f.id || i} style={{ ...row, alignItems: 'center' }}>
          <FileAudio size={15} color="#55e9ff" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name || f.filename || 'Audio file'}</div>
            <div style={meta}>{f._project} · {formatBytes(f.size || f.size_bytes)} · {formatDate(f.linked_at)}</div>
          </div>
          {(f.file_id || f.id) && (
            <button type="button" className="primary" data-infinity-local-action="true"
              onClick={() => openFileInStudio(f)}
              style={{ fontSize: 12, padding: '7px 13px', flexShrink: 0 }}>
              Continue →
            </button>
          )}
        </div>
      ))}
    </div>
  );

  if (tab === 'masters') return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Mastered versions across all projects</p>
      {allMasters.length === 0 && <p className="muted">No masters yet — complete the Master step in the studio to see versions here.</p>}
      {allMasters.map((m, i) => {
        const playUrl = resolveAssetUrl(m.preview_url || m.download_url);
        return (
          <div key={m.id || i} style={row}>
            <Music2 size={15} color="#b78aff" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name || 'Mastered version'}</div>
              <div style={meta}>{m._project} · {m.mode || 'Custom'} · {m.platform || ''} · {m.strength ?? '-'}% · {formatDate(m.created_at || m.linked_at)}</div>
              {playUrl && <audio controls src={playUrl} style={{ width: '100%', marginTop: 8, height: 32 }} />}
              <AssetLinks asset={m} />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (tab === 'sounds') return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Generated sounds across all projects</p>
      {allSounds.length === 0 && <p className="muted">No generated sounds yet — use the AI Sound Generator to create WAV assets.</p>}
      {allSounds.map((s, i) => {
        const playUrl = resolveAssetUrl(s.preview_url || s.download_url || s.assets?.[0]?.download_url);
        return (
          <div key={s.id || i} style={row}>
            <Sparkles size={15} color="#57f09c" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name || s.prompt || 'Generated sound'}</div>
              <div style={meta}>{s._project} · {s.genre || ''} · {s.assets?.length || 1} asset(s) · {formatDate(s.created_at || s.linked_at)}</div>
              {playUrl && <audio controls src={playUrl} style={{ width: '100%', marginTop: 8, height: 32 }} />}
              <AssetLinks asset={s} />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (tab === 'releases') return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Release packages across all projects</p>
      {allReleases.length === 0 && (
        <div>
          <p className="muted" style={{ marginBottom: 12 }}>No release packages yet. After mastering a track, a release package will appear here with all your download links and metadata.</p>
          <div style={{ background: 'rgba(255,207,102,.08)', border: '1px solid rgba(255,207,102,.25)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, color: '#ffcf66', marginBottom: 6 }}>How to create a release package</div>
            <div style={{ fontSize: 13, color: 'rgba(245,248,255,.6)', lineHeight: 1.6 }}>
              1. Open a project → Open Studio<br />
              2. Upload your track and complete mastering<br />
              3. The release package appears here automatically with WAV, MP3 and metadata
            </div>
          </div>
        </div>
      )}
      {allReleases.map((r, i) => <ReleasePackageCard key={r.id || i} pkg={r} />)}
    </div>
  );

  if (tab === 'exports') return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Export packages across all projects</p>
      {allExports.length === 0 && <p className="muted">No exports yet — use the Export button in the studio Download step.</p>}
      {allExports.map((e, i) => (
        <div key={e.id || i} style={row}>
          <Library size={15} color="#ffcf66" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name || 'Export package'}</div>
            <div style={meta}>{e._project} · {formatDate(e.created_at || e.linked_at)}</div>
            <AssetLinks asset={e} />
          </div>
        </div>
      ))}
    </div>
  );

  if (tab === 'projects') return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 12 }}>All projects</p>
      {projects.map((project) => (
        <div key={project.id} style={{ ...row, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{project.title}</div>
            <div style={meta}>{project.artist} · {project.genre} · {project.status} · Updated {formatDate(project.updatedAt)}</div>
          </div>
          <button type="button" className="primary" data-infinity-local-action="true" onClick={() => onOpenProject(project)} style={{ fontSize: 12, padding: '8px 14px' }}>
            <Music2 size={13} /> Open studio
          </button>
        </div>
      ))}
    </div>
  );

  return null;
}

function StudioShell({ children, onBack, project, cloudMode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      {/* Dark scrim — visual only, doesn't block clicks */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9993, background: 'rgba(9,11,20,.82)', backdropFilter: 'blur(3px)', pointerEvents: 'none' }} />
      {/* Top-left nav bar */}
      <div data-infinity-auth="true" style={{ position: 'fixed', left: 18, top: 18, zIndex: 9996, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="secondary" onClick={onBack}>← Dashboard</button>
        <span className="pill">{project?.title || 'Infinity Studio'}</span>
        <ModeBadge cloudMode={cloudMode} />
      </div>
      {/* Library toggle button */}
      <button
        type="button"
        data-infinity-local-action="true"
        onClick={() => setOpen(v => !v)}
        style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9997, background: open ? '#55e9ff' : 'rgba(17,20,33,.92)', color: open ? '#090b14' : '#f5f8ff', border: '1px solid rgba(85,233,255,.35)', borderRadius: 99, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <Library size={15} /> {open ? 'Close library' : 'Project library'}
      </button>
      {/* Slide-up library drawer */}
      {open && (
        <div data-infinity-auth="true" style={{ position: 'fixed', right: 18, bottom: 66, zIndex: 9995, width: 'min(640px, calc(100vw - 36px))', maxHeight: '72vh', overflowY: 'auto', borderRadius: 20, boxShadow: '0 22px 80px rgba(0,0,0,.6)' }}>
          <ProjectLibraryPanel project={project} compact />
        </div>
      )}
    </>
  );
}

function Dashboard({ profile, projects, onCreate, onLogout, onOpenProject, onDeleteProject, cloudMode, loading, error }) {
  const [activeTab, setActiveTab] = useState(null);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => ['In production', 'Ready for mastering', 'Ready for upload', 'Ready for release'].includes(p.status)).length,
    files: projects.reduce((sum, p) => sum + (Array.isArray(p.files) ? p.files.length : 0), 0),
    sounds: projects.reduce((sum, p) => sum + generatedSounds(p).length, 0),
    masters: projects.reduce((sum, p) => sum + masteredVersions(p).length, 0),
    releases: projects.reduce((sum, p) => sum + releasePackages(p).length, 0),
    exports: projects.reduce((sum, p) => sum + exportPackages(p).length, 0),
  }), [projects]);

  const toggle = (tab) => setActiveTab(prev => prev === tab ? null : tab);
  const activeProject = projects.find(p => ['In production', 'Ready for mastering', 'Ready for upload', 'Ready for release'].includes(p.status)) || projects[0];

  return (
    <main data-infinity-auth="true" style={shell}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 18 }}>
        {/* Header */}
        <header style={{ ...panel, padding: 20, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="logo" />
            <div>
              <p className="eyebrow">Infinity private dashboard</p>
              <h2 style={{ margin: '4px 0 0' }}>Welcome, {profile.name}</h2>
              <p className="muted" style={{ margin: '6px 0 0' }}>{profile.role} · {profile.email}</p>
            </div>
          </div>
          <div className="actions">
            <ModeBadge cloudMode={cloudMode} />
            <button type="button" className="primary" onClick={onCreate}><FolderPlus size={16} /> New project</button>
            <button type="button" className="secondary" onClick={onLogout}><LogOut size={16} /> Logout</button>
          </div>
        </header>

        {error && <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div>}

        {/* Active project banner */}
        {activeProject && (
          <div style={{ ...panel, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderLeft: '3px solid #55e9ff' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Current project</p>
              <div style={{ fontWeight: 900, fontSize: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(245,248,255,.5)', marginTop: 4 }}>
                {activeProject.artist} · {activeProject.genre} ·{' '}
                <span style={{ color: activeProject.status === 'Draft' ? '#ffcf66' : '#57f09c', fontWeight: 700 }}>{activeProject.status}</span>
                {' '}· {Array.isArray(activeProject.files) ? activeProject.files.length : 0} files · {masteredVersions(activeProject).length} masters
              </div>
            </div>
            <div className="actions">
              <button type="button" className="primary" data-infinity-local-action="true" onClick={() => onOpenProject(activeProject)}>
                <Music2 size={15} /> Open Studio
              </button>
              <button type="button" className="secondary" data-infinity-local-action="true" onClick={() => toggle('projects')}>
                All projects
              </button>
            </div>
          </div>
        )}

        {/* Clickable stat cubes */}
        <section className="stats">
          <Stat label="Projects" value={loading ? '…' : stats.total} icon={Music2} active={activeTab === 'projects'} onClick={() => toggle('projects')} action="View all" hint="Click to browse" color="#55e9ff" />
          <Stat label="Active" value={loading ? '…' : stats.active} icon={RefreshCw} hint="In production" color="#57f09c" />
          <Stat label="Files" value={loading ? '…' : stats.files} icon={FileAudio} active={activeTab === 'files'} onClick={() => toggle('files')} action={stats.files ? 'Browse files' : 'Upload first track'} hint="Click to view" color="#55e9ff" />
          <Stat label="Sounds" value={loading ? '…' : stats.sounds} icon={Sparkles} active={activeTab === 'sounds'} onClick={() => toggle('sounds')} action={stats.sounds ? 'Play sounds' : 'Generate sounds'} hint="Click to view" color="#57f09c" />
          <Stat label="Masters" value={loading ? '…' : stats.masters} icon={Library} active={activeTab === 'masters'} onClick={() => toggle('masters')} action={stats.masters ? 'Download' : 'Start mastering'} hint="Click to view" color="#b78aff" />
          <Stat label="Releases" value={loading ? '…' : stats.releases} icon={Rocket} active={activeTab === 'releases'} onClick={() => toggle('releases')} action={stats.releases ? 'View packages' : 'Prepare release'} hint="Click to view" color="#ffcf66" />
        </section>

        {/* Drill-down panel — shown when a stat is clicked */}
        {activeTab && (
          <section style={{ ...panel, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div />
              <button type="button" className="secondary" data-infinity-local-action="true" onClick={() => setActiveTab(null)} style={{ fontSize: 12, padding: '6px 12px' }}>✕ Close</button>
            </div>
            <DrillPanel tab={activeTab} projects={projects} onOpenProject={onOpenProject} />
          </section>
        )}

        {/* Projects section */}
        <section style={{ ...panel, padding: 22 }}>
          <div className="section-head">
            <div>
              <p className="eyebrow">Projects</p>
              <h2>Private song sessions</h2>
              <p className="muted wide">{cloudMode ? 'Saved to Supabase with private Row Level Security.' : 'Stored locally in this browser.'}</p>
            </div>
            <button type="button" className="primary" onClick={onCreate}><Plus size={16} /> Create project</button>
          </div>
          {projects.length ? (
            <div className="three">
              {projects.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} onDelete={onDeleteProject} />)}
            </div>
          ) : (
            <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}>
              <FolderPlus size={34} color="#55e9ff" />
              <h3>{loading ? 'Loading projects…' : 'No private project yet'}</h3>
              <p className="muted">Create your first project to start the Infinity song cycle.</p>
              <button type="button" className="primary" onClick={onCreate}><Plus size={16} /> Create first project</button>
            </div>
          )}
        </section>

        {activeProject && <ProjectLibraryPanel project={activeProject} />}
      </div>
    </main>
  );
}

export default function AuthDashboardV122({ children }) {
  const [profile, setProfile] = useState(() => loadJson(STORAGE_KEYS.session, null));
  const [projects, setProjects] = useState(() => loadJson(STORAGE_KEYS.projects, []));
  const [showCreate, setShowCreate] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cloudMode = profile?.authMode === 'supabase-cloud' && isSupabaseConfigured;
  const currentProjectRef = useRef(null);
  const projectsRef = useRef(projects);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => {
    const handler = () => setStudioOpen(false);
    window.addEventListener('infinity:close-studio', handler);
    return () => window.removeEventListener('infinity:close-studio', handler);
  }, []);

  const replaceProject = (updated) => { const normalized = normalizeProject(updated); setCurrentProject((current) => current?.id === normalized.id ? normalized : current); setProjects((current) => current.map((project) => project.id === normalized.id ? normalized : project)); return normalized; };
  const localUpdateProject = (projectId, updater) => { setProjects((current) => { const next = current.map((project) => { if (project.id !== projectId) return project; const updated = { ...updater(project), updatedAt: new Date().toISOString() }; setCurrentProject(updated); return updated; }); saveJson(STORAGE_KEYS.projects, next); return next; }); };

  useEffect(() => { let active = true; if (!isSupabaseConfigured) return; getSupabaseSession().then((session) => { if (!active || !session?.user) return; const next = profileFromSupabaseUser(session.user); saveJson(STORAGE_KEYS.session, next); setProfile(next); }).catch(() => {}); const subscription = supabase?.auth?.onAuthStateChange?.((_event, session) => { if (session?.user) { const next = profileFromSupabaseUser(session.user); saveJson(STORAGE_KEYS.session, next); setProfile(next); } if (!session?.user && profile?.authMode === 'supabase-cloud') setProfile(null); }); return () => { active = false; subscription?.data?.subscription?.unsubscribe?.(); }; }, []);
  useEffect(() => { if (!cloudMode) saveJson(STORAGE_KEYS.projects, projects); }, [projects, cloudMode]);
  useEffect(() => { if (!cloudMode || !profile?.id) return; setLoading(true); setError(''); listCloudProjects(profile.id).then((rows) => setProjects(rows.map(normalizeProject))).catch((err) => setError(err.message || 'Could not load cloud projects.')).finally(() => setLoading(false)); }, [cloudMode, profile?.id]);

  useEffect(() => {
    const onProjectFile = async (event) => { const currentProject = currentProjectRef.current || projectsRef.current[0] || null; if (!currentProject) return; const record = { id: event.detail?.id || event.detail?.file_id || makeId('file'), ...event.detail, linked_at: new Date().toISOString() }; if (cloudMode) { try { const updated = await appendCloudProjectFile(currentProject, record); replaceProject(updated); } catch (err) { setError(err.message || 'Could not save file to cloud project.'); } return; } localUpdateProject(currentProject.id, (project) => ({ ...project, status: 'In production', files: [record, ...(Array.isArray(project.files) ? project.files : [])] })); };
    const onProjectSound = async (event) => { const currentProject = currentProjectRef.current || projectsRef.current[0] || null; if (!currentProject) return; const record = { id: event.detail?.id || event.detail?.asset_id || makeId('asset'), ...event.detail, linked_at: new Date().toISOString() }; if (cloudMode) { try { const updated = await appendCloudProjectSound(currentProject, record); replaceProject(updated); } catch (err) { setError(err.message || 'Could not save asset to cloud project.'); } return; } localUpdateProject(currentProject.id, (project) => { const analysis = project.analysis || {}; const assetsList = Array.isArray(analysis.generated_sounds) ? analysis.generated_sounds : []; return { ...project, status: isRelease(record) ? 'Ready for release' : 'In production', analysis: { ...analysis, generated_sounds: [record, ...assetsList] } }; }); };
    window.addEventListener('infinity:project-file', onProjectFile);
    window.addEventListener('infinity:project-sound', onProjectSound);
    return () => { window.removeEventListener('infinity:project-file', onProjectFile); window.removeEventListener('infinity:project-sound', onProjectSound); };
  }, [currentProject, cloudMode]);

  const createProject = async (project) => { if (cloudMode) { const row = await createCloudProject({ user_id: profile.id, title: project.title, artist: project.artist, type: project.type, genre: project.genre, status: project.status, notes: project.notes, analysis: project.analysis, files: project.files }); const normalized = normalizeProject(row); setProjects((current) => [normalized, ...current]); setShowCreate(false); setCurrentProject(normalized); setStudioOpen(true); return; } setProjects((current) => [project, ...current]); setShowCreate(false); setCurrentProject(project); setStudioOpen(true); };
  const logout = async () => { if (cloudMode) await signOutSupabase().catch(() => {}); localStorage.removeItem(STORAGE_KEYS.session); setProfile(null); setStudioOpen(false); setCurrentProject(null); setProjects(loadJson(STORAGE_KEYS.projects, [])); };
  const openProject = (project) => { const updated = { ...project, updatedAt: new Date().toISOString() }; if (!cloudMode) setProjects((current) => current.map((item) => (item.id === project.id ? updated : item))); setCurrentProject(updated); setStudioOpen(true); window.dispatchEvent(new CustomEvent('infinity:open-studio')); };
  const deleteProject = async (id) => { if (cloudMode) await deleteCloudProject(id); setProjects((current) => current.filter((project) => project.id !== id)); };
  const refreshProjects = async () => { if (cloudMode && profile?.id) { setLoading(true); const rows = await listCloudProjects(profile.id); setProjects(rows.map(normalizeProject)); setLoading(false); } else { setProjects(loadJson(STORAGE_KEYS.projects, [])); } };

  if (!profile) return <StartPrivateSession onLogin={setProfile} />;
  if (studioOpen) return <StudioShell onBack={() => { setStudioOpen(false); window.dispatchEvent(new CustomEvent('infinity:close-studio')); refreshProjects().catch(() => {}); }} project={currentProject} cloudMode={cloudMode}>{children}</StudioShell>;
  return <><Dashboard profile={profile} projects={projects} onCreate={() => setShowCreate(true)} onLogout={logout} onOpenProject={openProject} onDeleteProject={deleteProject} cloudMode={cloudMode} loading={loading} error={error} />{showCreate ? <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} cloudMode={cloudMode} /> : null}</>;
}
