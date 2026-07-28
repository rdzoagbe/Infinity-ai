import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext.jsx';
import {
  DemoBadge, MasterRow, ReleasePackageCard, masteredVersions, panel, releasePackages,
} from '../components/projectAssets.jsx';

export default function MastersPage() {
  const { projects, demoMode } = useSession();
  const navigate = useNavigate();

  const masters = useMemo(
    () => projects.flatMap((p) => masteredVersions(p).map((m) => ({ ...m, _project: p.title, _projectId: p.id }))),
    [projects],
  );
  const releases = useMemo(
    () => projects.flatMap((p) => releasePackages(p).map((r) => ({ ...r, _project: p.title }))),
    [projects],
  );

  return (
    <div className="view" style={{ display: 'grid', gap: 18 }}>
      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Masters {demoMode && <DemoBadge />}</p>
            <h2>Completed versions</h2>
            <p className="muted wide">Every master rendered from your projects, with playback and downloads.</p>
          </div>
        </div>
        {masters.length === 0 ? (
          <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}>
            <h3>No completed masters</h3>
            <p className="muted">Open a project, upload a track and complete the Master step to see versions here.</p>
            <button className="primary" onClick={() => navigate('/app/projects')}>Go to projects</button>
          </div>
        ) : (
          masters.map((m, i) => <MasterRow key={m.id || i} master={m} projectLabel={m._project} />)
        )}
      </section>

      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Release packages</p>
            <h2>Prepared releases</h2>
          </div>
        </div>
        {releases.length === 0 ? (
          <p className="muted">No release packages yet. After mastering a track, its release package appears here.</p>
        ) : (
          releases.map((r, i) => <ReleasePackageCard key={r.id || i} pkg={r} />)
        )}
      </section>
    </div>
  );
}
