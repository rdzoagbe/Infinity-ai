import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  DoorOpen,
  FileAudio,
  Mic2,
  PackageCheck,
  Play,
  Radio,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Project, WorkspaceMode } from '../types';
import { analyseLyrics, getNextAction, getReadiness } from '../studioInsights';
import { nowLabel } from '../utils';
import ArtistTab from './ArtistTab';
import EngineerTab from './EngineerTab';
import ProducerTab from './ProducerTab';
import SongCopilotPanel from './SongCopilotPanel';
import StudioCycle from './StudioCycle';
import StudioOpsV5 from './StudioOpsV5';

interface WorkspaceProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

type RoomId = 'creative' | 'recording' | 'producer' | 'mix' | 'release';

const tabs: Array<{ id: WorkspaceMode; label: string; subtitle: string; icon: typeof Mic2; room: string }> = [
  { id: 'artist', label: 'Creative Room', subtitle: 'Lyrics, demo vocals, takes', icon: Mic2, room: 'Write + Record' },
  { id: 'producer', label: 'Producer Lab', subtitle: 'Beat library and arrangement', icon: Bot, room: 'Produce + Arrange' },
  { id: 'engineer', label: 'Mix Room', subtitle: 'Sonic stage, master, export', icon: SlidersHorizontal, room: 'Mix + Release' },
];

const roomTimeline: Array<{ id: RoomId; label: string; helper: string; icon: typeof Mic2; mode: WorkspaceMode }> = [
  { id: 'creative', label: 'Creative Room', helper: 'Idea, lyrics, concept', icon: Mic2, mode: 'artist' },
  { id: 'recording', label: 'Recording Booth', helper: 'Capture takes and comp vocals', icon: FileAudio, mode: 'artist' },
  { id: 'producer', label: 'Producer Lab', helper: 'Choose beat, structure, stems', icon: Bot, mode: 'producer' },
  { id: 'mix', label: 'Mix Room', helper: 'Balance, stereo field, compare', icon: SlidersHorizontal, mode: 'engineer' },
  { id: 'release', label: 'Release Room', helper: 'Approvals, package, deliverables', icon: PackageCheck, mode: 'engineer' },
];

const isWorkspaceMode = (value: string | null): value is WorkspaceMode => value === 'artist' || value === 'producer' || value === 'engineer';

const getActiveRoomId = (mode: WorkspaceMode): RoomId => {
  if (mode === 'artist') return 'creative';
  if (mode === 'producer') return 'producer';
  return 'mix';
};

const transportButtons = [
  { id: 'demo', label: 'Play Demo', helper: 'Artist reference pass', icon: Play },
  { id: 'beat', label: 'Play Beat', helper: 'Producer groove', icon: Radio },
  { id: 'mix', label: 'Play Mix', helper: 'Engineer balance', icon: SlidersHorizontal },
  { id: 'compare', label: 'Compare Master', helper: 'Raw vs AI master', icon: WandSparkles },
] as const;

export default function Workspace({ project, onProjectUpdate }: WorkspaceProps) {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode: WorkspaceMode = isWorkspaceMode(modeParam) ? modeParam : 'artist';
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [roomView, setRoomView] = useState<RoomId>(getActiveRoomId(initialMode));
  const [activeTransport, setActiveTransport] = useState<(typeof transportButtons)[number]['id']>('demo');
  const navigate = useNavigate();

  useEffect(() => {
    const nextMode = searchParams.get('mode');
    if (isWorkspaceMode(nextMode)) {
      setMode(nextMode);
      setRoomView(getActiveRoomId(nextMode));
    }
  }, [searchParams]);

  const patchProject = (patch: Partial<Project>) => {
    onProjectUpdate({ ...project, ...patch, lastEdited: nowLabel() });
  };

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    setRoomView(getActiveRoomId(nextMode));
  };

  const handleRoomClick = (room: RoomId, targetMode: WorkspaceMode) => {
    setRoomView(room);
    setMode(targetMode);
  };

  const handleSendToEngineer = () => {
    patchProject({
      status: 'Mixing',
      producerNotes: project.producerNotes || 'Producer handoff complete. Ready for visual mix adjustment.',
    });
    handleModeChange('engineer');
    setRoomView('mix');
  };

  const workflowProgress = mode === 'artist' ? 34 : mode === 'producer' ? 68 : 100;
  const activeRoom = tabs.find((tab) => tab.id === mode) ?? tabs[0];
  const readiness = useMemo(() => getReadiness(project), [project]);
  const copilot = useMemo(() => analyseLyrics(project.lyrics, project.selectedGenreId), [project.lyrics, project.selectedGenreId]);
  const nextAction = useMemo(() => getNextAction(project), [project]);

  return (
    <main className="min-h-screen bg-midnight px-4 py-5 text-white md:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-[2rem] border border-white/5 bg-glass/80 p-4 shadow-panel backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
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
                  <Sparkles className="h-3.5 w-3.5" /> AudioMagic v7 · AI Song Copilot UX
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{project.trackName}</h1>
                <p className="mt-1 text-sm text-white/45">
                  {activeRoom.room} · {project.stems.length} stem{project.stems.length === 1 ? '' : 's'} · status: {project.status} · {project.selectedBeatName ?? 'No beat chosen'}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">{nextAction}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[24rem]">
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Readiness</p>
                <p className="mt-2 text-2xl font-semibold">{readiness.score}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-magenta" style={{ width: `${readiness.score}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Copilot BPM</p>
                <p className="mt-2 text-2xl font-semibold">{copilot.bpm}</p>
                <p className="mt-1 text-xs text-white/40">{copilot.key}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">Current room</p>
                <p className="mt-2 text-2xl font-semibold">{roomTimeline.find((room) => room.id === roomView)?.label ?? activeRoom.label}</p>
                <p className="mt-1 text-xs text-white/40">{copilot.mood}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-white/5 bg-black/20 p-3 md:grid-cols-5">
            {roomTimeline.map((room) => {
              const active = roomView === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleRoomClick(room.id, room.mode)}
                  className={`rounded-2xl border p-3 text-left transition ${active ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-white/[0.03] hover:border-cyan/20 hover:bg-white/[0.05]'}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold"><room.icon className={active ? 'h-4 w-4 text-cyan' : 'h-4 w-4 text-white/35'} /> {room.label}</div>
                  <p className="mt-1 text-xs leading-5 text-white/40">{room.helper}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[1.5rem] border border-white/5 bg-black/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan">Now working on</p>
                  <h2 className="mt-2 text-xl font-semibold">Song preview command center</h2>
                  <p className="mt-1 text-sm text-white/45">Use this as the musical dashboard to jump between draft stages of the same song.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/45">
                  <DoorOpen className="h-3.5 w-3.5" /> {activeRoom.label}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {transportButtons.map((button) => {
                  const active = activeTransport === button.id;
                  return (
                    <button
                      key={button.id}
                      type="button"
                      onClick={() => setActiveTransport(button.id)}
                      className={`rounded-2xl border p-4 text-left transition ${active ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/20'}`}
                    >
                      <button.icon className={`h-5 w-5 ${active ? 'text-cyan' : 'text-white/45'}`} />
                      <p className="mt-3 font-semibold">{button.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/40">{button.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/5 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-magenta">Workflow progress</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className="block h-full rounded-full bg-cyan shadow-cyan"
                  animate={{ width: `${workflowProgress}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-white/55">
                <div className="flex items-center justify-between"><span>Lyrics + concept</span><span>{project.lyrics.trim() ? 'Done' : 'Pending'}</span></div>
                <div className="flex items-center justify-between"><span>Beat + arrangement</span><span>{project.selectedBeatName ? 'In progress' : 'Pending'}</span></div>
                <div className="flex items-center justify-between"><span>Mix + master</span><span>{project.status === 'Mixing' || project.status === 'Released' ? 'Active' : 'Pending'}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-3">
            <nav className="grid gap-2 md:grid-cols-3">
              {tabs.map((tab) => {
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleModeChange(tab.id)}
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
        </header>

        <SongCopilotPanel project={project} compact />

        <StudioCycle project={project} mode={mode} onModeChange={handleModeChange} onProjectChange={patchProject} />
        <StudioOpsV5 project={project} onModeChange={handleModeChange} onProjectChange={patchProject} />

        {mode === 'artist' && <ArtistTab project={project} onProjectChange={patchProject} />}
        {mode === 'producer' && <ProducerTab project={project} onProjectChange={patchProject} onSendToEngineer={handleSendToEngineer} />}
        {mode === 'engineer' && <EngineerTab project={project} onProjectChange={patchProject} />}
      </section>
    </main>
  );
}
