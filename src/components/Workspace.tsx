import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Compass,
  DoorOpen,
  FileAudio,
  LayoutDashboard,
  ListChecks,
  Mic2,
  Music2,
  PackageCheck,
  Play,
  Radio,
  Route,
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
import CreatorTools from './CreatorTools';
import EngineerTab from './EngineerTab';
import FullSongBuilder from './FullSongBuilder';
import ProducerTab from './ProducerTab';
import SongCopilotPanel from './SongCopilotPanel';
import StudioCoreV12 from './StudioCoreV12';
import StudioCycle from './StudioCycle';
import StudioDawV11 from './StudioDawV11';
import StudioOpsV5 from './StudioOpsV5';

interface WorkspaceProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

type RoomId = 'creative' | 'recording' | 'producer' | 'mix' | 'release';
type WorkspaceView = 'core' | 'song' | 'daw' | 'room' | 'copilot' | 'creator' | 'cycle' | 'ops';

const tabs: Array<{ id: WorkspaceMode; label: string; subtitle: string; icon: typeof Mic2; room: string }> = [
  { id: 'artist', label: 'Artist Room', subtitle: 'Lyrics, clone voice, song draft', icon: Mic2, room: 'Write + Voice' },
  { id: 'producer', label: 'Producer Lab', subtitle: 'Beat, arrangement, stems', icon: Bot, room: 'Produce + Arrange' },
  { id: 'engineer', label: 'Mix Room', subtitle: 'Balance, master, export', icon: SlidersHorizontal, room: 'Mix + Release' },
];

const roomTimeline: Array<{ id: RoomId; label: string; helper: string; icon: typeof Mic2; mode: WorkspaceMode }> = [
  { id: 'creative', label: '1. Lyrics', helper: 'Write or paste the song', icon: Mic2, mode: 'artist' },
  { id: 'recording', label: '2. Voice', helper: 'Record or clone voice', icon: FileAudio, mode: 'artist' },
  { id: 'producer', label: '3. Producer', helper: 'Beat, structure, stems', icon: Bot, mode: 'producer' },
  { id: 'mix', label: '4. Mix', helper: 'Balance and master', icon: SlidersHorizontal, mode: 'engineer' },
  { id: 'release', label: '5. Release', helper: 'Approvals and exports', icon: PackageCheck, mode: 'engineer' },
];

const isWorkspaceMode = (value: string | null): value is WorkspaceMode => value === 'artist' || value === 'producer' || value === 'engineer';
const getActiveRoomId = (mode: WorkspaceMode): RoomId => (mode === 'artist' ? 'creative' : mode === 'producer' ? 'producer' : 'mix');

const transportButtons = [
  { id: 'demo', label: 'Demo', helper: 'Artist idea', icon: Play },
  { id: 'beat', label: 'Beat', helper: 'Producer groove', icon: Radio },
  { id: 'mix', label: 'Mix', helper: 'Engineer balance', icon: SlidersHorizontal },
  { id: 'compare', label: 'Master', helper: 'Final compare', icon: WandSparkles },
] as const;

const workspaceViews: Array<{ id: WorkspaceView; label: string; helper: string; icon: typeof LayoutDashboard }> = [
  { id: 'core', label: 'v12 Core', helper: 'Artist, producer, engineer flow', icon: LayoutDashboard },
  { id: 'song', label: 'Create Song', helper: 'Lyrics to full studio draft', icon: Music2 },
  { id: 'daw', label: 'v11 DAW', helper: 'Timeline, beat, mixer, master', icon: LayoutDashboard },
  { id: 'room', label: 'Studio Rooms', helper: 'Artist, producer, engineer', icon: DoorOpen },
  { id: 'cycle', label: 'Full Cycle', helper: 'Idea to release overview', icon: Route },
  { id: 'creator', label: 'Creator Tools', helper: 'MixSplit, sequencer, chains', icon: WandSparkles },
  { id: 'ops', label: 'Ops', helper: 'Takes, approvals, exports', icon: ListChecks },
  { id: 'copilot', label: 'Copilot', helper: 'AI song guidance', icon: Sparkles },
];

export default function Workspace({ project, onProjectUpdate }: WorkspaceProps) {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode: WorkspaceMode = isWorkspaceMode(modeParam) ? modeParam : 'artist';
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [roomView, setRoomView] = useState<RoomId>(getActiveRoomId(initialMode));
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('core');
  const [activeTransport, setActiveTransport] = useState<(typeof transportButtons)[number]['id']>('demo');
  const navigate = useNavigate();

  useEffect(() => {
    const nextMode = searchParams.get('mode');
    if (isWorkspaceMode(nextMode)) {
      setMode(nextMode);
      setRoomView(getActiveRoomId(nextMode));
      setWorkspaceView('room');
    }
  }, [searchParams]);

  const patchProject = (patch: Partial<Project>) => onProjectUpdate({ ...project, ...patch, lastEdited: nowLabel() });

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    setRoomView(getActiveRoomId(nextMode));
    setWorkspaceView('room');
  };

  const handleRoomClick = (room: RoomId, targetMode: WorkspaceMode) => {
    setRoomView(room);
    setMode(targetMode);
    setWorkspaceView('room');
  };

  const handleSendToEngineer = () => {
    patchProject({ status: 'Mixing', producerNotes: project.producerNotes || 'Producer handoff complete. Ready for visual mix adjustment.' });
    handleModeChange('engineer');
    setRoomView('mix');
  };

  const handleOpenRoomMode = (targetMode: WorkspaceMode) => {
    setMode(targetMode);
    setRoomView(getActiveRoomId(targetMode));
    setWorkspaceView('room');
  };

  const activeRoom = tabs.find((tab) => tab.id === mode) ?? tabs[0];
  const readiness = useMemo(() => getReadiness(project), [project]);
  const copilot = useMemo(() => analyseLyrics(project.lyrics, project.selectedGenreId), [project.lyrics, project.selectedGenreId]);
  const nextAction = useMemo(() => getNextAction(project), [project]);

  const renderActiveRoom = () => (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-white/5 bg-glass/80 p-4 shadow-panel backdrop-blur-xl">
        <nav className="grid gap-2 md:grid-cols-3">
          {tabs.map((tab) => {
            const active = mode === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => handleModeChange(tab.id)} className={`relative rounded-2xl px-5 py-3 text-left transition ${active ? 'text-black' : 'text-white/55 hover:text-white'}`}>
                {active && <motion.span layoutId="workspace-tab" className="absolute inset-0 rounded-2xl bg-cyan shadow-cyan" transition={{ type: 'spring', stiffness: 440, damping: 35 }} />}
                <span className="relative flex items-center gap-2 text-sm font-semibold"><tab.icon className="h-4 w-4" /> {tab.label}</span>
                <span className="relative mt-1 block text-xs opacity-70">{tab.subtitle}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {mode === 'artist' && <ArtistTab project={project} onProjectChange={patchProject} />}
      {mode === 'producer' && <ProducerTab project={project} onProjectChange={patchProject} onSendToEngineer={handleSendToEngineer} />}
      {mode === 'engineer' && <EngineerTab project={project} onProjectChange={patchProject} />}
    </div>
  );

  const renderCycleSummary = () => (
    <div className="rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan"><Compass className="h-3.5 w-3.5" /> Studio cycle</p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Your song must move visibly through each stage.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Start with v12 Core. After generation, use v11 DAW for timeline, beat, chords, mixer, mastering, library, assistant, and release.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setWorkspaceView('core')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan"><LayoutDashboard className="h-4 w-4" /> Open v12 Core</button>
          <button type="button" onClick={() => setWorkspaceView('daw')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-magenta/30 bg-magenta/10 px-5 py-3 font-semibold text-magenta"><LayoutDashboard className="h-4 w-4" /> Open v11 DAW</button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {roomTimeline.map((room, index) => {
          const complete = index === 0 ? project.lyrics.trim().length > 0 : index === 1 ? Boolean(project.activeTakeId || project.recordingTakes?.length) : index === 2 ? project.stems.length > 0 && project.status !== 'Writing' : index === 3 ? project.status === 'Mixing' || project.status === 'Released' || Boolean(project.aiMasterUrl) : Boolean(project.releaseChecklist && Object.values(project.releaseChecklist).some(Boolean));
          return <button key={room.id} type="button" onClick={() => handleRoomClick(room.id, room.mode)} className={`rounded-3xl border p-4 text-left transition ${complete ? 'border-cyan/25 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/20'}`}><room.icon className={complete ? 'h-5 w-5 text-cyan' : 'h-5 w-5 text-white/35'} /><p className="mt-4 font-semibold">{room.label}</p><p className="mt-2 text-sm leading-5 text-white/40">{room.helper}</p><p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/35">{complete ? 'Updated' : 'Pending'}</p></button>;
        })}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Lyrics', project.lyrics.trim() ? `${project.lyrics.trim().split(/\s+/).length} words` : 'Empty'],
          ['Stems', `${project.stems.length} generated`],
          ['Takes', `${project.recordingTakes?.length ?? 0} logged`],
          ['Status', project.status],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/5 bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.22em] text-white/35">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}
      </div>
      <div className="mt-5 rounded-2xl border border-magenta/20 bg-magenta/10 p-4 text-sm leading-6 text-white/65"><span className="font-semibold text-magenta">Next action:</span> {nextAction}</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-midnight px-4 py-5 text-white md:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-[2rem] border border-white/5 bg-glass/80 p-4 shadow-panel backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <button type="button" onClick={() => navigate('/dashboard')} className="rounded-2xl border border-white/5 bg-white/5 p-3 text-white/70 transition hover:border-cyan/30 hover:text-cyan" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></button>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-magenta/20 bg-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-magenta"><Sparkles className="h-3.5 w-3.5" /> AudioMagic v12 · Working studio core</div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{project.trackName}</h1>
                <p className="mt-1 text-sm text-white/45">{activeRoom.room} · {project.stems.length} stem{project.stems.length === 1 ? '' : 's'} · status: {project.status} · {project.selectedBeatName ?? 'No beat chosen'}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">{nextAction}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[24rem]">
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.22em] text-white/35">Readiness</p><p className="mt-2 text-2xl font-semibold">{readiness.score}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-magenta" style={{ width: `${readiness.score}%` }} /></div></div>
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.22em] text-white/35">Copilot BPM</p><p className="mt-2 text-2xl font-semibold">{copilot.bpm}</p><p className="mt-1 text-xs text-white/40">{copilot.key}</p></div>
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.22em] text-white/35">Current view</p><p className="mt-2 text-2xl font-semibold">{workspaceViews.find((item) => item.id === workspaceView)?.label}</p><p className="mt-1 text-xs text-white/40">{roomTimeline.find((room) => room.id === roomView)?.label ?? activeRoom.label}</p></div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[18rem_1fr]">
          <aside className="h-fit rounded-[2rem] border border-white/5 bg-glass/80 p-4 shadow-panel backdrop-blur-xl xl:sticky xl:top-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan">Session Navigator</p>
            <div className="mt-4 space-y-2">
              {workspaceViews.map((view) => {
                const active = workspaceView === view.id;
                return <button key={view.id} type="button" onClick={() => setWorkspaceView(view.id)} className={`w-full rounded-2xl border p-3 text-left transition ${active ? 'border-cyan/30 bg-cyan/10 text-white' : 'border-white/5 bg-black/20 text-white/50 hover:border-cyan/20 hover:text-white'}`}><span className="flex items-center gap-2 text-sm font-semibold"><view.icon className={active ? 'h-4 w-4 text-cyan' : 'h-4 w-4 text-white/35'} /> {view.label}</span><span className="mt-1 block text-xs text-white/35">{view.helper}</span></button>;
              })}
            </div>

            <div className="mt-5 border-t border-white/5 pt-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/35">Rooms</p>
              <div className="mt-3 space-y-2">
                {roomTimeline.map((room) => {
                  const active = roomView === room.id && workspaceView === 'room';
                  return <button key={room.id} type="button" onClick={() => handleRoomClick(room.id, room.mode)} className={`w-full rounded-2xl border p-3 text-left transition ${active ? 'border-magenta/30 bg-magenta/10 text-white' : 'border-white/5 bg-black/20 text-white/45 hover:border-magenta/20 hover:text-white'}`}><span className="flex items-center gap-2 text-sm font-semibold"><room.icon className={active ? 'h-4 w-4 text-magenta' : 'h-4 w-4 text-white/30'} /> {room.label}</span><span className="mt-1 block text-xs text-white/35">{room.helper}</span></button>;
                })}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/5 bg-black/25 p-3">
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">Preview stages</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {transportButtons.map((button) => { const active = activeTransport === button.id; return <button key={button.id} type="button" onClick={() => setActiveTransport(button.id)} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-white/[0.03]'}`}><button.icon className={`h-4 w-4 ${active ? 'text-cyan' : 'text-white/35'}`} /><p className="mt-2 text-sm font-semibold">{button.label}</p><p className="text-xs text-white/35">{button.helper}</p></button>; })}
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-5">
            {workspaceView === 'core' && <StudioCoreV12 project={project} onProjectChange={patchProject} onOpenRoom={handleOpenRoomMode} />}
            {workspaceView === 'song' && <FullSongBuilder project={project} onProjectChange={patchProject} onOpenRoom={handleOpenRoomMode} />}
            {workspaceView === 'daw' && <StudioDawV11 project={project} onProjectChange={patchProject} onOpenRoom={handleOpenRoomMode} />}
            {workspaceView === 'room' && renderActiveRoom()}
            {workspaceView === 'cycle' && renderCycleSummary()}
            {workspaceView === 'copilot' && <SongCopilotPanel project={project} compact />}
            {workspaceView === 'creator' && <CreatorTools project={project} onProjectChange={patchProject} />}
            {workspaceView === 'ops' && <StudioOpsV5 project={project} onModeChange={handleModeChange} onProjectChange={patchProject} />}
            {workspaceView === 'cycle' && <StudioCycle project={project} mode={mode} onModeChange={handleModeChange} onProjectChange={patchProject} />}
          </section>
        </div>
      </section>
    </main>
  );
}
