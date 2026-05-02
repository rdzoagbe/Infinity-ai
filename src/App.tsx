import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import { createProject, seedProjects } from './utils';
import type { Project } from './types';
import { useMemo, useState } from 'react';

function WorkspaceRoute({ projects, onProjectUpdate }: { projects: Project[]; onProjectUpdate: (project: Project) => void }) {
  const { projectId } = useParams();
  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  if (!project) return <Navigate to="/" replace />;

  return <Workspace project={project} onProjectUpdate={onProjectUpdate} />;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const navigate = useNavigate();

  const handleProjectUpdate = (project: Project) => {
    setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
  };

  const handleStartProject = () => {
    const project = createProject(projects.length + 1);
    setProjects((current) => [project, ...current]);
    navigate(`/workspace/${project.id}`);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<Dashboard projects={projects} onStartProject={handleStartProject} />}
      />
      <Route
        path="/workspace/:projectId"
        element={<WorkspaceRoute projects={projects} onProjectUpdate={handleProjectUpdate} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
