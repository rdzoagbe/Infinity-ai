import { Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider } from './auth/SessionContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import DocsPage from './pages/Docs.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import ProjectWorkspace from './pages/ProjectWorkspace.jsx';
import SoundsPage from './pages/Sounds.jsx';
import LibraryPage from './pages/Library.jsx';
import MastersPage from './pages/Masters.jsx';
import SettingsPage from './pages/Settings.jsx';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/docs" element={<DocsPage />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectWorkspace />} />
          <Route path="projects/:projectId/:stage" element={<ProjectWorkspace />} />
          <Route path="sounds" element={<SoundsPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="masters" element={<MastersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}
