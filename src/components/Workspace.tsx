import { motion } from 'framer-motion';
import { ArrowLeft, Bot, FileAudio, Mic2, PackageCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Project, WorkspaceMode } from '../types';
import { nowLabel } from '../utils';
import ArtistTab from './ArtistTab';
import ProducerTab from './ProducerTab';
import EngineerTab from './EngineerTab';
import StudioCycle from './StudioCycle';
import StudioOpsV5 from './StudioOpsV5';

interface WorkspaceProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const tabs: Array<{ id: WorkspaceMode; label: string; subtitle: string; icon: typeof Mic2; room: string }> = [
  { id: 'artist', label: 'Creative Room', subtitle: 'Lyrics, demo vocals, takes', icon: Mic2, room: 'Write + Record' },
  { id: 'producer', label: 'Producer Lab', subtitle: 'Beat library and arrangement', icon: Bot, room: 'Produce + Arrange' },
  { id: 'engineer', label: 'Mix Room', subtitle: 'Sonic stage, master, export', icon: SlidersHorizontal, room: 'Mix + Release' },
];

const roomTimeline = [
  { label: 'Creative Room', helper: 'Lyrics and emotional direction', icon: Mic2 },
  { label: 'Recording Booth', helper: 'Takes, count-in, comping', icon: FileAudio },
  { label: 'Producer Lab', helper: 'Beat, arrangement, stems', icon: Bot },
  { label: 'Mix Room', helper: 'Pan, depth, master compare', icon: SlidersHorizontal },
  { label: 'Release Room', helper: 'Approvals and package', icon: PackageCheck },
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

  const workflowProgress = mode === 'artist' ? 34 : mode === 'producer' ? 68 : 100;
  const activeRoom = tabs.find((tab) => tab.id === mode) ?? tabs[0];

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
                  <Sparkles className="h-3.5 w-3.5" /> AudioMagic Studio Rooms
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{project.trackName}</h1>
                <p className="mt-1 text-sm text-white/45">
                  {activeRoom.room} · {project.stems.length} stem{project.stems.length === 1 ? '' : 's'} · Status: {project.status} · {project.selectedBeatName ?? 'No beat chosen'}
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

          <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-white/5 bg-black/20 p-3 md:grid-cols-5">
            {roomTimeline.map((room, index) => {
              const activeIndex = mode === 'artist' ? 0 : mode === 'producer' ? 2 : 3;
              const active = index === activeIndex || (mode === 'artist' && index === 1) || (mode === 'engineer' && index === 4);
              return (
                <div key={room.label} className={`rounded-2xl border p-3 transition ${active ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold"><room.icon className={active ? 'h-4 w-4 text-cyan' : 'h-4 w-4 text-white/35'} /> {room.label}</div>
                  <p className="mt-1 text-xs leading-5 text-white/40">{room.helper}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/35">
              <span>Creative</span>
              <span>Producer</span>
              <span>Mix + Release</span>
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

        <StudioCycle project={project} mode={mode} onModeChange={setMode} onProjectChange={patchProject} />
        <StudioOpsV5 project={project} onModeChange={setMode} onProjectChange={patchProject} />

        {mode === 'artist' && <ArtistTab project={project} onProjectChange={patchProject} />}
        {mode === 'producer' && <ProducerTab project={project} onProjectChange={patchProject} onSendToEngineer={handleSendToEngineer} />}
        {mode === 'engineer' && <EngineerTab project={project} onProjectChange={patchProject} />}
      </section>
    </main>
  );
}
