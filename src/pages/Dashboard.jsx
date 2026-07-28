import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileAudio, FolderPlus, Library, Music2, Plus, Rocket, Sparkles } from 'lucide-react';
import { useSession } from '../auth/SessionContext.jsx';
import {
  CreateProjectModal, DemoBadge, ModeBadge, ProjectCard, Stat,
  exportPackages, generatedSounds, masteredVersions, panel, releasePackages,
} from '../components/projectAssets.jsx';

export default function Dashboard() {
  const { profile, projects, createProject, deleteProject, cloudMode, demoMode, loading, error, dataMode } = useSession();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const stats = useMemo(() => ({
    total: projects.length,
    files: projects.reduce((sum, p) => sum + (Array.isArray(p.files) ? p.files.length : 0), 0),
    sounds: projects.reduce((sum, p) => sum + generatedSounds(p).length, 0),
    masters: projects.reduce((sum, p) => sum + masteredVersions(p).length, 0),
    releases: projects.reduce((sum, p) => sum + releasePackages(p).length, 0),
    exports: projects.reduce((sum, p) => sum + exportPackages(p).length, 0),
  }), [projects]);

  const activeProject = projects.find((p) => ['In production', 'Ready for mastering', 'Ready for upload', 'Ready for release'].includes(p.status)) || projects[0];

  const openProject = (project) => navigate(`/app/projects/${project.id}`);
  const onCreate = async (project) => {
    const created = await createProject(project);
    setShowCreate(false);
    navigate(`/app/projects/${created.id}`);
  };

  return (
    <div className="view" style={{ display: 'grid', gap: 18 }}>
      <header style={{ ...panel, padding: 20, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow">Infinity private dashboard</p>
          <h2 style={{ margin: '4px 0 0' }}>Welcome, {profile.name}</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>{profile.role} · {profile.email}</p>
        </div>
        <div className="actions" style={{ alignItems: 'center' }}>
          {demoMode && <DemoBadge />}
          <ModeBadge cloudMode={cloudMode} />
          <button type="button" className="primary" onClick={() => setShowCreate(true)}><FolderPlus size={16} /> New project</button>
        </div>
      </header>

      {error && <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div>}

      {activeProject && (
        <div style={{ ...panel, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderLeft: '3px solid #55e9ff' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Current project {demoMode && <DemoBadge />}</p>
            <div style={{ fontWeight: 900, fontSize: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(245,248,255,.5)', marginTop: 4 }}>
              {activeProject.artist} · {activeProject.genre} ·{' '}
              <span style={{ color: activeProject.status === 'Draft' ? '#ffcf66' : '#57f09c', fontWeight: 700 }}>{activeProject.status}</span>
              {' '}· {Array.isArray(activeProject.files) ? activeProject.files.length : 0} files · {masteredVersions(activeProject).length} masters
            </div>
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={() => openProject(activeProject)}><Music2 size={15} /> Open Studio</button>
            <button type="button" className="secondary" onClick={() => navigate('/app/projects')}>All projects</button>
          </div>
        </div>
      )}

      <section className="stats">
        <Stat label="Projects" value={loading ? '…' : stats.total} icon={Music2} onClick={() => navigate('/app/projects')} action="View all" color="#55e9ff" />
        <Stat label="Files" value={loading ? '…' : stats.files} icon={FileAudio} onClick={() => navigate('/app/library')} action={stats.files ? 'Browse' : 'Upload first track'} color="#55e9ff" />
        <Stat label="Sounds" value={loading ? '…' : stats.sounds} icon={Sparkles} onClick={() => navigate('/app/sounds')} action={stats.sounds ? 'Play' : 'Generate'} color="#57f09c" />
        <Stat label="Masters" value={loading ? '…' : stats.masters} icon={Library} onClick={() => navigate('/app/masters')} action={stats.masters ? 'Download' : 'Start mastering'} color="#b78aff" />
        <Stat label="Releases" value={loading ? '…' : stats.releases} icon={Rocket} onClick={() => navigate('/app/masters')} action="View" color="#ffcf66" />
      </section>

      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Projects {demoMode && <DemoBadge />}</p>
            <h2>Private song sessions</h2>
            <p className="muted wide">{cloudMode ? 'Saved to Supabase with private Row Level Security.' : demoMode ? 'Sample data for exploring the interface — nothing here is a real recording.' : 'Stored locally in this browser.'}</p>
          </div>
          <button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create project</button>
        </div>
        {projects.length ? (
          <div className="three">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={openProject} onDelete={demoMode ? null : deleteProject} demo={demoMode} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}>
            <FolderPlus size={34} color="#55e9ff" />
            <h3>{loading ? 'Loading projects…' : 'No projects yet'}</h3>
            <p className="muted">Create your first project, then upload a vocal and beat to start the workflow.</p>
            <button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create first project</button>
          </div>
        )}
      </section>

      {dataMode === 'empty' && (
        <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
          All numbers on this page come from your own projects — nothing here is simulated.
        </p>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={onCreate} cloudMode={cloudMode} />}
    </div>
  );
}
