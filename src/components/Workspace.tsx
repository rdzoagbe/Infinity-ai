import { motion } from 'framer-motion';
import { ArrowLeft, Bot, Mic2, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Project, WorkspaceMode } from '../types';
import { nowLabel } from '../utils';
import ArtistTab from './ArtistTab';
import ProducerTab from './ProducerTab';
import EngineerTab from './EngineerTab';

interface WorkspaceProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const tabs: Array<{ id: WorkspaceMode; label: string; subtitle: string; icon: typeof Mic2 }> = [
  { id: 'artist', label: 'Artist', subtitle: 'Lyrics & vocal', icon: Mic2 },
  { id: 'producer', label: 'Producer', subtitle: 'Beat library', icon: Bot },
  { id: 'engineer', label: 'Engineer', subtitle: 'Visual console', icon: SlidersHorizontal },
];

const isWorkspaceMode = (value: string | null): value is WorkspaceMode => value === 'artist' || value === 'producer' || value === 'engineer';

export default function Workspace({ project, onProjectUpdate }: WorkspaceProps) {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode: WorkspaceMode = isWorkspaceMode(modeParam) ? modeParam : 'artist';
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const navigate = useNavigate();

  useEffect(() => {
    const nextMode = searchParams.get('mode');
    if (isWorkspaceMode(nextMode)) setMode(nextMode);
  }, [searchParams]);

  const patchProject = (patch: Partial<Project>) => {
    onProjectUpdate({ ...project, ...patch, lastEdited: nowLabel() });
  };

  const handleSendToEngineer = () => {
    patchProject({ status: 'Mixing', producerNotes: project.producerNotes || 'Producer handoff complete. Ready for visual mix adjustment.' });
    setMode('engineer');
  };

  const workflowProgress = mode === 'artist' ? 33 : mode === 'producer' ? 66 : 100;

  return (
    <main className="min-h-screen bg-midnight px-4 py-5 text-white md:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-[2rem] border border-white/5 bg-glass/80 p-4 shadow-panel backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-2xl border border-white/5 bg-white/5 p-3 text-white/70 transition hover:border-cyan/30 hover:text-cyan"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-magenta/20 bg-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-magenta">
                  <Sparkles className="h-3.5 w-3.5" /> Guided Studio Workflow
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{project.trackName}</h1>
                <p className="mt-1 text-sm text-white/45">
                  {project.stems.length} stem{project.stems.length === 1 ? '' : 's'} · Status: {project.status} · {project.selectedBeatName ?? 'No beat chosen'}
                </p>
              </div>
            </div>

            <nav className="grid gap-2 rounded-3xl border border-white/5 bg-black/20 p-2 md:grid-cols-3">
              {tabs.map((tab) => {
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={`relative rounded-2xl px-5 py-3 text-left transition ${active ? 'text-black' : 'text-white/55 hover:text-white'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="workspace-tab"
                        className="absolute inset-0 rounded-2xl bg-cyan shadow-cyan"
                        transition={{ type: 'spring', stiffness: 440, damping: 35 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2 text-sm font-semibold">
                      <tab.icon className="h-4 w-4" /> {tab.label}
                    </span>
                    <span className="relative mt-1 block text-xs opacity-70">{tab.subtitle}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/35">
              <span>Lyrics</span>
              <span>Producer</span>
              <span>Engineer</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full rounded-full bg-cyan shadow-cyan"
                animate={{ width: `${workflowProgress}%` }}
                transition={{ type: 'spring', stiffness: 140, damping: 20 }}
              />
            </div>
          </div>
        </header>

        {mode === 'artist' && <ArtistTab project={project} onProjectChange={patchProject} />}
        {mode === 'producer' && <ProducerTab project={project} onProjectChange={patchProject} onSendToEngineer={handleSendToEngineer} />}
        {mode === 'engineer' && <EngineerTab project={project} onProjectChange={patchProject} />}
      </section>
    </main>
  );
}
