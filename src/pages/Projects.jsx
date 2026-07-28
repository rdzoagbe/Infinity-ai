import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderPlus, Plus } from 'lucide-react';
import { useSession } from '../auth/SessionContext.jsx';
import { CreateProjectModal, DemoBadge, ProjectCard, panel } from '../components/projectAssets.jsx';

export default function Projects() {
  const { projects, createProject, deleteProject, cloudMode, demoMode, loading } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects;
    if (q) list = list.filter((p) => `${p.title} ${p.artist} ${p.genre} ${p.status}`.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [projects, query, sort]);

  const openProject = (project) => navigate(`/app/projects/${project.id}`);
  const onCreate = async (project) => {
    const created = await createProject(project);
    setShowCreate(false);
    navigate(`/app/projects/${created.id}`);
  };

  return (
    <div className="view" style={{ display: 'grid', gap: 18 }}>
      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Projects {demoMode && <DemoBadge />}</p>
            <h2>All song sessions</h2>
            <p className="muted wide">{demoMode ? 'Sample data for exploring the interface.' : 'Every project with its files, versions and masters.'}</p>
          </div>
          <button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create project</button>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 14px', color: 'inherit' }} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 14px', color: 'inherit' }}>
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>

        {filtered.length ? (
          <div className="three">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={openProject} onDelete={demoMode ? null : deleteProject} demo={demoMode} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}>
            <FolderPlus size={34} color="#55e9ff" />
            <h3>{loading ? 'Loading projects…' : query ? 'No projects match your search' : 'No projects yet'}</h3>
            <p className="muted">{query ? 'Try a different search term.' : 'Create your first project, then upload your first track.'}</p>
            {!query && <button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create first project</button>}
          </div>
        )}
      </section>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={onCreate} cloudMode={cloudMode} />}
    </div>
  );
}
