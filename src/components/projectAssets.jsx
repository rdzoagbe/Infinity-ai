import { useState } from 'react';
import { Cloud, FileAudio, Library, Lock, Music2, Rocket, Sparkles, X } from 'lucide-react';
import { backendUrl } from '../api/infinityBackend.js';
import { makeId } from '../auth/SessionContext.jsx';

export const panel = { background: 'rgba(17,20,33,.84)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.09)', borderRadius: 28 };

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
export function formatDate(value) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value || ''; }
}
export function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName; anchor.click();
  URL.revokeObjectURL(url);
}
export function resolveAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') || url.startsWith('blob:') ? url : backendUrl(url);
}

export function assets(project) { return Array.isArray(project?.analysis?.generated_sounds) ? project.analysis.generated_sounds : []; }
function assetText(asset) { return `${asset?.type || ''} ${asset?.source || ''} ${asset?.name || ''}`.toLowerCase(); }
export function isMaster(asset) { return assetText(asset).includes('master'); }
export function isRelease(asset) { return assetText(asset).includes('release'); }
export function isExport(asset) { return assetText(asset).includes('export') && !isRelease(asset); }
export function generatedSounds(project) { return assets(project).filter((a) => !isMaster(a) && !isRelease(a) && !isExport(a)); }
export function masteredVersions(project) { return assets(project).filter(isMaster); }
export function releasePackages(project) { return assets(project).filter(isRelease); }
export function exportPackages(project) {
  const direct = Array.isArray(project?.analysis?.export_packages) ? project.analysis.export_packages : [];
  return [...direct, ...assets(project).filter(isExport)];
}

export function DemoBadge() {
  return <span className="pill" style={{ color: '#ffcf66', borderColor: 'rgba(255,207,102,.4)', background: 'rgba(255,207,102,.12)', fontWeight: 800 }}>Demo data</span>;
}
export function ModeBadge({ cloudMode }) {
  return (
    <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {cloudMode ? <Cloud size={14} /> : <Lock size={14} />}{cloudMode ? 'Cloud Mode' : 'Local Mode'}
    </span>
  );
}

export function Stat({ label, value, icon: Icon, active, onClick, action, color = '#55e9ff', hint }) {
  return (
    <div className="card" onClick={onClick}
      style={{ boxShadow: 'none', cursor: onClick ? 'pointer' : 'default', border: active ? `1px solid ${color}55` : '1px solid rgba(255,255,255,.06)', background: active ? `${color}0e` : 'rgba(255,255,255,.03)', transition: 'all .18s', position: 'relative' }}>
      <Icon size={18} color={color} />
      <b style={{ display: 'block', fontSize: 32, marginTop: 8, color: active ? color : '#f5f8ff' }}>{value}</b>
      <span className="muted">{label}</span>
      {hint && <div style={{ fontSize: 11, color: 'rgba(245,248,255,.38)', marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
      {action && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 700 }}>{action} →</div>}
    </div>
  );
}

export function AssetLinks({ asset }) {
  const links = [];
  if (asset.preview_url) links.push(['Preview', asset.preview_url]);
  if (asset.download_url) links.push(['Download', asset.download_url]);
  if (Array.isArray(asset.assets)) asset.assets.forEach((item) => { if (item?.download_url) links.push([item.type?.toUpperCase?.() || item.name || 'Asset', item.download_url]); });
  if (!links.length) return null;
  return (
    <div className="actions" style={{ marginTop: 8 }}>
      {links.slice(0, 4).map(([label, url], index) => (
        <a key={`${label}-${index}`} href={resolveAssetUrl(url)} target="_blank" rel="noreferrer" className="secondary" style={{ padding: '8px 10px', fontSize: 12 }}>{label}</a>
      ))}
    </div>
  );
}

export function ReleasePackageCard({ pkg }) {
  const fileName = pkg.filename || `${pkg.release_title || pkg.name || 'release-package'}.json`;
  return (
    <div style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', borderRadius: 14, padding: 12 }}>
      <p className="muted" style={{ margin: 0 }}>
        <b style={{ color: '#f5f8ff' }}>{pkg.release_title || pkg.name || 'Release package'}</b><br />
        {pkg.artist || 'Unknown artist'} · {pkg.release_type || 'Release'} · {pkg.genre || 'Genre'}<br />
        {pkg.status || (pkg.package_ready ? 'Release Ready' : 'Draft')} · {formatDate(pkg.created_at || pkg.linked_at)}
      </p>
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="secondary" style={{ padding: '8px 10px', fontSize: 12 }} onClick={() => downloadJson(fileName, pkg.payload || pkg)}>Download JSON</button>
      </div>
    </div>
  );
}

export const rowStyle = { padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' };
export const metaStyle = { fontSize: 12, color: 'rgba(245,248,255,.45)', marginTop: 2 };

export function FileRow({ file, projectLabel, onOpen }) {
  return (
    <div style={{ ...rowStyle, alignItems: 'center' }}>
      <FileAudio size={15} color="#55e9ff" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{file.name || file.filename || 'Audio file'}</div>
        <div style={metaStyle}>{projectLabel ? `${projectLabel} · ` : ''}{formatBytes(file.size || file.size_bytes)} · {formatDate(file.linked_at)}</div>
      </div>
      {(file.file_id || file.id) && onOpen && (
        <button type="button" className="primary" onClick={() => onOpen(file)} style={{ fontSize: 12, padding: '7px 13px', flexShrink: 0 }}>Continue →</button>
      )}
    </div>
  );
}

export function MasterRow({ master, projectLabel }) {
  const playUrl = resolveAssetUrl(master.preview_url || master.download_url);
  return (
    <div style={rowStyle}>
      <Music2 size={15} color="#b78aff" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{master.name || 'Mastered version'}</div>
        <div style={metaStyle}>{projectLabel ? `${projectLabel} · ` : ''}{master.mode || 'Custom'} · {master.platform || ''} · {formatDate(master.created_at || master.linked_at)}</div>
        {playUrl && <audio controls src={playUrl} style={{ width: '100%', marginTop: 8, height: 32 }} />}
        <AssetLinks asset={master} />
      </div>
    </div>
  );
}

export function SoundRow({ sound, projectLabel }) {
  const playUrl = resolveAssetUrl(sound.preview_url || sound.download_url || sound.assets?.[0]?.download_url);
  return (
    <div style={rowStyle}>
      <Sparkles size={15} color="#57f09c" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{sound.name || sound.prompt || 'Generated sound'}</div>
        <div style={metaStyle}>{projectLabel ? `${projectLabel} · ` : ''}{sound.genre || ''} · {sound.assets?.length || 1} asset(s) · {formatDate(sound.created_at || sound.linked_at)}</div>
        {playUrl && <audio controls src={playUrl} style={{ width: '100%', marginTop: 8, height: 32 }} />}
        <AssetLinks asset={sound} />
      </div>
    </div>
  );
}

export function ExportRow({ item, projectLabel }) {
  return (
    <div style={rowStyle}>
      <Library size={15} color="#ffcf66" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name || 'Export package'}</div>
        <div style={metaStyle}>{projectLabel ? `${projectLabel} · ` : ''}{formatDate(item.created_at || item.linked_at)}</div>
        <AssetLinks asset={item} />
      </div>
    </div>
  );
}

export function ProjectCard({ project, onOpen, onDelete, demo }) {
  return (
    <div className="card project-card" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">{project.type}</p>
          <h3 style={{ margin: '6px 0 4px' }}>{project.title}</h3>
          <p className="muted" style={{ margin: 0 }}>{project.artist} · {project.genre}</p>
        </div>
        <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
          <span className="pill">{project.status}</span>
          {demo && <DemoBadge />}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginTop: 16 }}>
        <div><span className="muted">Files</span><b style={{ display: 'block' }}>{Array.isArray(project.files) ? project.files.length : 0}</b></div>
        <div><span className="muted">Sounds</span><b style={{ display: 'block' }}>{generatedSounds(project).length}</b></div>
        <div><span className="muted">Masters</span><b style={{ display: 'block' }}>{masteredVersions(project).length}</b></div>
        <div><span className="muted">Releases</span><b style={{ display: 'block' }}>{releasePackages(project).length}</b></div>
      </div>
      <p className="muted" style={{ lineHeight: 1.6, minHeight: 44 }}>{project.notes || 'No notes yet.'}</p>
      <p className="muted" style={{ fontSize: 12 }}>Updated {formatDate(project.updatedAt)}</p>
      <div className="actions">
        <button type="button" className="primary" onClick={() => onOpen(project)}><Music2 size={15} /> Open studio</button>
        {onDelete && <button type="button" className="secondary" onClick={() => onDelete(project.id)}>Delete</button>}
      </div>
    </div>
  );
}

export function CreateProjectModal({ onClose, onCreate, cloudMode }) {
  const [project, setProject] = useState({ title: '', artist: '', type: 'Vocal + Beat', genre: 'Afrobeat', status: 'Draft', notes: '' });
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setProject((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onCreate({
        id: makeId('project'), ...project,
        title: project.title.trim() || 'Untitled Infinity Session',
        artist: project.artist.trim() || 'Unknown Artist',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        files: [], analysis: { status: 'Ready for upload', generated_sounds: [], feedback: [], export_packages: [] },
      });
    } finally { setBusy(false); }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(0,0,0,.68)', padding: 18, overflowY: 'auto' }}>
      <form onSubmit={submit} style={{ ...panel, maxWidth: 720, margin: '40px auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <p className="eyebrow">New project · {cloudMode ? 'Cloud' : 'Local'}</p>
            <h2 style={{ margin: '6px 0 8px' }}>Create private song session</h2>
            <p className="muted">Prepare a project container before upload, mix, master and export.</p>
          </div>
          <button type="button" className="secondary" onClick={onClose} style={{ width: 42, height: 42, padding: 0 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          <label className="auth-field">Project title<input value={project.title} onChange={(e) => update('title', e.target.value)} placeholder="Song title or session name" /></label>
          <label className="auth-field">Artist<input value={project.artist} onChange={(e) => update('artist', e.target.value)} placeholder="Artist name" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="auth-three">
            <label className="auth-field">Type<select value={project.type} onChange={(e) => update('type', e.target.value)}><option>Vocal + Beat</option><option>Full song</option><option>Instrumental</option><option>Vocal mix</option><option>Stem mix</option><option>Sound design</option></select></label>
            <label className="auth-field">Genre<select value={project.genre} onChange={(e) => update('genre', e.target.value)}><option>Afrobeat</option><option>Trap</option><option>Drill</option><option>House</option><option>Gospel</option><option>Cinematic</option><option>Soul</option><option>Experimental</option></select></label>
            <label className="auth-field">Status<select value={project.status} onChange={(e) => update('status', e.target.value)}><option>Draft</option><option>Ready for upload</option><option>In production</option><option>Ready for mastering</option><option>Ready for release</option></select></label>
          </div>
          <label className="auth-field">Notes<textarea value={project.notes} onChange={(e) => update('notes', e.target.value)} rows={4} placeholder="Reference, emotion, target sound, release plan..." /></label>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating...' : 'Create project'}</button>
        </div>
      </form>
    </div>
  );
}

export function ProjectLibraryPanel({ project, onOpenFile, compact = false, demo = false }) {
  const [drillTab, setDrillTab] = useState(null);
  if (!project) return null;
  const files = Array.isArray(project?.files) ? project.files : [];
  const generated = generatedSounds(project);
  const masters = masteredVersions(project);
  const exports = exportPackages(project);
  const releases = releasePackages(project);
  const toggle = (tab) => setDrillTab((prev) => (prev === tab ? null : tab));

  const renderDrill = () => {
    if (drillTab === 'files') return (
      <div>
        {files.length === 0 && <p className="muted">No files yet — upload a track in the studio.</p>}
        {files.map((f, i) => <FileRow key={f.id || i} file={f} onOpen={onOpenFile} />)}
      </div>
    );
    if (drillTab === 'sounds') return (
      <div>
        {generated.length === 0 && <p className="muted">No generated sounds yet.</p>}
        {generated.map((s, i) => <SoundRow key={s.id || i} sound={s} />)}
      </div>
    );
    if (drillTab === 'masters') return (
      <div>
        {masters.length === 0 && <p className="muted">No masters yet — complete the Master step in the studio.</p>}
        {masters.map((m, i) => <MasterRow key={m.id || i} master={m} />)}
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
        {exports.map((e, i) => <ExportRow key={e.id || i} item={e} />)}
      </div>
    );
    return null;
  };

  return (
    <section style={{ ...panel, padding: compact ? 14 : 20 }}>
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div>
          <p className="eyebrow">Project library</p>
          <h2 style={{ margin: '4px 0 0' }}>{project.title} {demo && <DemoBadge />}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{project.artist} · {project.genre} · {project.status}</p>
        </div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', marginBottom: 14 }}>
        <Stat label="Files" value={files.length} icon={FileAudio} active={drillTab === 'files'} onClick={() => toggle('files')} action={files.length ? 'View' : 'Upload'} color="#55e9ff" />
        <Stat label="Sounds" value={generated.length} icon={Sparkles} active={drillTab === 'sounds'} onClick={() => toggle('sounds')} action="View" color="#57f09c" />
        <Stat label="Masters" value={masters.length} icon={Music2} active={drillTab === 'masters'} onClick={() => toggle('masters')} action="View" color="#b78aff" />
        <Stat label="Releases" value={releases.length} icon={Rocket} active={drillTab === 'releases'} onClick={() => toggle('releases')} action="View" color="#ffcf66" />
        <Stat label="Exports" value={exports.length} icon={Library} active={drillTab === 'exports'} onClick={() => toggle('exports')} action="View" color="#55e9ff" />
      </div>
      {drillTab && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{drillTab}</p>
            <button type="button" className="secondary" onClick={() => setDrillTab(null)} style={{ fontSize: 11, padding: '4px 10px' }}>✕ Close</button>
          </div>
          {renderDrill()}
        </div>
      )}
    </section>
  );
}
