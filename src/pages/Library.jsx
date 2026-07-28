import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext.jsx';
import {
  DemoBadge, ExportRow, FileRow, SoundRow, exportPackages, generatedSounds, panel,
} from '../components/projectAssets.jsx';

const TABS = [
  ['files', 'Files'],
  ['sounds', 'Generated sounds'],
  ['exports', 'Exports'],
];

export default function LibraryPage() {
  const { projects, demoMode } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState('files');
  const [query, setQuery] = useState('');

  const data = useMemo(() => ({
    files: projects.flatMap((p) => (Array.isArray(p.files) ? p.files : []).map((f) => ({ ...f, _project: p.title, _projectId: p.id }))),
    sounds: projects.flatMap((p) => generatedSounds(p).map((s) => ({ ...s, _project: p.title }))),
    exports: projects.flatMap((p) => exportPackages(p).map((e) => ({ ...e, _project: p.title }))),
  }), [projects]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = data[tab] || [];
    if (!q) return items;
    return items.filter((item) => `${item.name || item.filename || item.prompt || ''} ${item._project}`.toLowerCase().includes(q));
  }, [data, tab, query]);

  const openFile = (file) => {
    if (file._projectId) navigate(`/app/projects/${file._projectId}`);
  };

  return (
    <div className="view">
      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Library {demoMode && <DemoBadge />}</p>
            <h2>Files and assets</h2>
            <p className="muted wide">Everything uploaded or produced across your projects.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)} style={{ padding: '8px 16px', fontSize: 13 }}>
              {label} ({(data[id] || []).length})
            </button>
          ))}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '8px 14px', color: 'inherit' }} />
        </div>

        {list.length === 0 && (
          <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}>
            <h3>{query ? 'Nothing matches your search' : tab === 'files' ? 'No files yet' : tab === 'sounds' ? 'No generated sounds yet' : 'No exports yet'}</h3>
            <p className="muted">
              {query ? 'Try a different search term.'
                : tab === 'files' ? 'Open a project and upload your first track.'
                : tab === 'sounds' ? 'Use the Sound Lab to generate audio assets.'
                : 'Complete a master in the studio to create export packages.'}
            </p>
          </div>
        )}

        {tab === 'files' && list.map((f, i) => <FileRow key={f.id || i} file={f} projectLabel={f._project} onOpen={openFile} />)}
        {tab === 'sounds' && list.map((s, i) => <SoundRow key={s.id || i} sound={s} projectLabel={s._project} />)}
        {tab === 'exports' && list.map((e, i) => <ExportRow key={e.id || i} item={e} projectLabel={e._project} />)}
      </section>
    </div>
  );
}
