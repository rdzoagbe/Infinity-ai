import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AudioMVP from '../AudioMVPV2.jsx';
import { useSession } from '../auth/SessionContext.jsx';
import { DemoBadge, ProjectLibraryPanel, panel } from '../components/projectAssets.jsx';
import VersionHistory from '../components/VersionHistory.jsx';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, setActiveProjectId, updateProjectAsset, demoMode, loading } = useSession();

  const project = projects.find((p) => p.id === projectId) || null;

  // Uploaded files and rendered assets attach to this project while it is open.
  useEffect(() => {
    setActiveProjectId(projectId);
    return () => setActiveProjectId(null);
  }, [projectId, setActiveProjectId]);

  const openFileInStudio = (file) => {
    try {
      localStorage.setItem('infinity_studio_session_v1', JSON.stringify({
        songBackend: { file_id: file.file_id || file.id, filename: file.name || file.filename },
        savedAt: new Date().toISOString(),
      }));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!project) {
    return (
      <div className="view">
        <section style={{ ...panel, padding: 28, textAlign: 'center' }}>
          <h2>{loading ? 'Loading project…' : 'Project not found'}</h2>
          <p className="muted">{loading ? 'Fetching your projects.' : 'This project does not exist or was deleted.'}</p>
          {!loading && <button className="primary" onClick={() => navigate('/app/projects')}>← Back to projects</button>}
        </section>
      </div>
    );
  }

  return (
    <div className="view" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="secondary" onClick={() => navigate('/app/projects')} style={{ padding: '8px 14px' }}>← Projects</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.title} {demoMode && <DemoBadge />}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(245,248,255,.5)' }}>{project.artist} · {project.genre} · {project.status}</div>
        </div>
      </div>

      {demoMode ? (
        <section style={{ ...panel, padding: 28, textAlign: 'center' }}>
          <h2>Demo project</h2>
          <p className="muted" style={{ maxWidth: 520, margin: '10px auto' }}>
            This is sample data — audio processing is disabled for the demo account so
            simulated results are never shown as real measurements. Create a local or
            cloud account to upload and process your own track.
          </p>
          <button className="primary" onClick={() => navigate('/app/settings')}>Switch account</button>
        </section>
      ) : (
        <AudioMVP open embedded projectId={projectId} projectTitle={project.title} onClose={() => navigate('/app/projects')} />
      )}

      <VersionHistory
        project={project}
        demo={demoMode}
        updateAsset={(assetId, updater) => updateProjectAsset(project.id, assetId, updater)}
      />

      <ProjectLibraryPanel project={project} onOpenFile={openFileInStudio} demo={demoMode} />
    </div>
  );
}
