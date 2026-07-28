import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import { useSession, STORAGE_KEYS } from '../auth/SessionContext.jsx';
import { DemoBadge, ModeBadge, panel } from '../components/projectAssets.jsx';

export default function SettingsPage() {
  const { profile, logout, cloudMode, demoMode, projects } = useSession();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const clearLocalData = () => {
    if (!window.confirm('Delete all local projects and session data from this browser? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEYS.projects);
    localStorage.removeItem('infinity_studio_session_v1');
    localStorage.removeItem('infinity_recent_files_v1');
    localStorage.removeItem('infinity_master_history');
    localStorage.removeItem('infinity_mix_templates');
    window.location.reload();
  };

  return (
    <div className="view" style={{ display: 'grid', gap: 18 }}>
      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Session</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <div><span className="muted">Name</span> <b style={{ marginLeft: 8 }}>{profile.name}</b> {demoMode && <DemoBadge />}</div>
          <div><span className="muted">Email</span> <b style={{ marginLeft: 8 }}>{profile.email}</b></div>
          <div><span className="muted">Role</span> <b style={{ marginLeft: 8 }}>{profile.role}</b></div>
          <div><span className="muted">Storage</span> <span style={{ marginLeft: 8 }}><ModeBadge cloudMode={cloudMode} /></span></div>
          <div><span className="muted">Projects</span> <b style={{ marginLeft: 8 }}>{projects.length}</b></div>
        </div>
        <div className="actions">
          <button className="secondary" onClick={doLogout}><LogOut size={15} /> Sign out</button>
        </div>
      </section>

      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Data</p>
            <h2>Local data deletion</h2>
            <p className="muted wide">Remove all projects and studio sessions stored in this browser. Cloud projects in Supabase are not affected — delete those from the Projects page.</p>
          </div>
        </div>
        <button className="secondary" onClick={clearLocalData} style={{ borderColor: 'rgba(255,90,90,.4)', color: '#ffb4b4' }}>
          <Trash2 size={15} /> Delete local data
        </button>
      </section>
    </div>
  );
}
