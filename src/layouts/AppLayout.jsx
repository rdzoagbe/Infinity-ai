import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext.jsx';
import { DemoBadge } from '../components/projectAssets.jsx';
import {
  IconDashboard, IconDocs, IconGlobe, IconLibrary, IconMasters, IconMusic,
  IconProjects, IconSettings,
} from '../components/icons.jsx';

const NAV_MAIN = [
  { to: '/app', end: true, label: 'Dashboard', icon: <IconDashboard /> },
  { to: '/app/projects', label: 'Projects', icon: <IconProjects /> },
  { to: '/app/sounds', label: 'Sound Lab', icon: <IconMusic /> },
  { to: '/app/masters', label: 'Masters', icon: <IconMasters /> },
  { to: '/app/library', label: 'Library', icon: <IconLibrary /> },
];
const NAV_ACCOUNT = [
  { to: '/docs', label: 'Documentation', icon: <IconDocs /> },
  { to: '/', label: 'Public website', icon: <IconGlobe /> },
  { to: '/app/settings', label: 'Settings', icon: <IconSettings /> },
];

const VIEW_TITLES = {
  '/app': ['Dashboard', 'Your production overview'],
  '/app/projects': ['Projects', 'All recordings, mixes and masters'],
  '/app/sounds': ['Sound Lab', 'Experimental synthesised sound generator'],
  '/app/masters': ['Masters', 'Completed versions from your projects'],
  '/app/library': ['Library', 'Files and assets from your projects'],
  '/app/settings': ['Settings', 'Session and preferences'],
};

export default function AppLayout() {
  const { profile, demoMode } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('infinity_theme') || 'dark');

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('infinity_theme', next);
  };

  const isProjectWorkspace = /^\/app\/projects\/[^/]+/.test(location.pathname);
  const [title, crumb] = isProjectWorkspace
    ? ['Studio', 'Project workspace']
    : (VIEW_TITLES[location.pathname] || ['Infinity AI', '']);

  const initials = (profile.name || 'IA').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app" data-theme={theme}>
      {sidebarOpen && <div className="shade" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" />
          <div><h1>Infinity AI</h1><p>Intelligent music production</p></div>
        </div>

        <nav className="nav-group">
          <div className="nav-label">Workspace</div>
          {NAV_MAIN.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>

        <nav className="nav-group">
          <div className="nav-label">Account</div>
          {NAV_ACCOUNT.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {demoMode && <div style={{ marginBottom: 10 }}><DemoBadge /></div>}
          <div className="profile">
            <div className="avatar">{initials}</div>
            <div><strong>{profile.name}</strong><span>{profile.email}</span></div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen((s) => !s)}>☰</button>
            <div>
              <div className="page-title">{title}</div>
              <div className="crumb">{crumb}</div>
            </div>
          </div>
          <div className="top-actions">
            <button className="btn ghost theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button className="btn primary" onClick={() => navigate('/app/projects?new=1')}>＋ New project</button>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
