import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import type { AppLanguage, UserSession } from './components/LandingPage';
import Workspace from './components/Workspace';
import { createProject, seedProjects } from './utils';
import type { Project, SongCreationPayload } from './types';
import { useEffect, useMemo, useState } from 'react';

const SESSION_STORAGE_KEY = 'audiomagic.activeSession';
const LANGUAGE_STORAGE_KEY = 'audiomagic.language';
const projectsStorageKey = (userId: string) => `audiomagic.projects.${userId}`;

function WorkspaceRoute({ projects, onProjectUpdate }: { projects: Project[]; onProjectUpdate: (project: Project) => void }) {
  const { projectId } = useParams();
  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  if (!project) return <Navigate to="/dashboard" replace />;

  return <Workspace project={project} onProjectUpdate={onProjectUpdate} />;
}

const readStoredSession = (): UserSession | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
};

const readStoredLanguage = (): AppLanguage => {
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === 'fr' || saved === 'es' || saved === 'en' ? saved : 'en';
};

const readStoredProjects = (userId: string) => {
  try {
    const raw = window.localStorage.getItem(projectsStorageKey(userId));
    return raw ? (JSON.parse(raw) as Project[]) : seedProjects;
  } catch {
    return seedProjects;
  }
};

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => readStoredLanguage());
  const [session, setSession] = useState<UserSession | null>(() => readStoredSession());
  const [projects, setProjects] = useState<Project[]>(() => {
    const storedSession = readStoredSession();
    return storedSession ? readStoredProjects(storedSession.id) : [];
  });
  const navigate = useNavigate();

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (!session) return;
    window.localStorage.setItem(projectsStorageKey(session.id), JSON.stringify(projects));
  }, [projects, session]);

  const handleLogin = (nextSession: UserSession) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setProjects(readStoredProjects(nextSession.id));
    navigate('/dashboard');
  };

  const handleProjectUpdate = (project: Project) => {
    setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
  };

  const handleStartProject = () => {
    const project = createProject(projects.length + 1);
    setProjects((current) => [project, ...current]);
    navigate(`/workspace/${project.id}?mode=artist`);
  };

  const handleCreateSong = (payload: SongCreationPayload) => {
    const project = createProject(projects.length + 1, payload);
    setProjects((current) => [project, ...current]);
    navigate(`/workspace/${project.id}?mode=producer`);
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage language={language} onLanguageChange={setLanguage} onLogin={handleLogin} />} />
      <Route
        path="/dashboard"
        element={
          session ? (
            <Dashboard projects={projects} onStartProject={handleStartProject} onCreateSong={handleCreateSong} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/workspace/:projectId"
        element={session ? <WorkspaceRoute projects={projects} onProjectUpdate={handleProjectUpdate} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}
