import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Disc3,
  FileAudio,
  FolderKanban,
  Mic2,
  Music2,
  PackageCheck,
  Plus,
  RadioTower,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES } from '../beatLibrary';
import type { Project, ProjectStatus, SongCreationPayload } from '../types';
import { statusClasses } from '../utils';

interface DashboardProps {
  projects: Project[];
  onStartProject: () => void;
  onCreateSong: (payload: SongCreationPayload) => void;
}

type ProjectFilter = 'all' | 'ongoing' | 'mixing' | 'released';

const filterProjects = (projects: Project[], filter: ProjectFilter) => {
  if (filter === 'ongoing') return projects.filter((project) => project.status !== 'Released');
  if (filter === 'mixing') return projects.filter((project) => project.status === 'Mixing');
  if (filter === 'released') return projects.filter((project) => project.status === 'Released');
  return projects;
};

const statusProgress: Record<ProjectStatus, number> = {
  Writing: 20,
  Recording: 38,
  Producing: 58,
  Mixing: 78,
  Released: 100,
};

const workflowSteps = [
  { label: 'Write', helper: 'Lyrics, hook, concept', icon: Mic2 },
  { label: 'Produce', helper: 'Beat, BPM, arrangement', icon: Music2 },
  { label: 'Record', helper: 'Takes and comping', icon: FileAudio },
  { label: 'Engineer', helper: 'Mix, master, approve', icon: SlidersHorizontal },
  { label: 'Release', helper: 'Package and deliver', icon: PackageCheck },
];

const openModeForProject = (project: Project) => {
  if (project.status === 'Mixing' || project.status === 'Released') return 'engineer';
  if (project.status === 'Producing') return 'producer';
  return 'artist';
};

export default function Dashboard({ projects, onStartProject, onCreateSong }: DashboardProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>('all');
  const [trackName, setTrackName] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState(GENRES[3]?.id ?? GENRES[0].id);
  const selectedGenre = useMemo(() => GENRES.find((genre) => genre.id === selectedGenreId) ?? GENRES[0], [selectedGenreId]);
  const [selectedBeatName, setSelectedBeatName] = useState(selectedGenre.beats[0].name);

  const visibleProjects = useMemo(() => filterProjects(projects, activeFilter), [projects, activeFilter]);
  const latestProject = projects[0];
  const needsAttention = projects.filter((project) => project.status !== 'Released').slice(0, 3);

  const stats = [
    { id: 'ongoing' as const, label: 'Active sessions', value: projects.filter((project) => project.status !== 'Released').length, icon: FolderKanban, helper: 'Songs moving through the studio' },
    { id: 'mixing' as const, label: 'In engineering', value: projects.filter((project) => project.status === 'Mixing').length, icon: SlidersHorizontal, helper: 'Sessions ready for mix decisions' },
    { id: 'released' as const, label: 'Release-ready', value: projects.filter((project) => project.status === 'Released').length, icon: RadioTower, helper: 'Completed masters and packages' },
  ];

  const handleGenreChange = (genreId: string) => {
    const nextGenre = GENRES.find((genre) => genre.id === genreId) ?? GENRES[0];
    setSelectedGenreId(nextGenre.id);
    setSelectedBeatName(nextGenre.beats[0].name);
  };

  const handleCreateSong = () => {
    const cleanedLyrics = lyrics.trim();
    if (!cleanedLyrics) return;

    onCreateSong({
      trackName: trackName.trim() || `Lyrics Session ${projects.length + 1}`,
      lyrics: cleanedLyrics,
      selectedGenreId: selectedGenre.id,
      selectedBeatName,
      prompt: `${selectedGenre.name} production using ${selectedBeatName}. Build the song around the pasted lyrics, then prepare stems for engineer handoff.`,
    });

    setTrackName('');
    setLyrics('');
  };

  const openProject = (project: Project) => navigate(`/workspace/${project.id}?mode=${openModeForProject(project)}`);

  return (
    <main className="min-h-screen bg-midnight text-white">
      <div className="mx-auto grid min-h-screen max-w-[96rem] gap-6 px-4 py-5 md:px-6 lg:grid-cols-[18rem_1fr] lg:py-6">
        <aside className="rounded-[2rem] border border-white/5 bg-black/30 p-5 shadow-panel backdrop-blur-xl lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan text-black shadow-cyan"><Disc3 className="h-6 w-6" /></div>
            <div><p className="font-semibold tracking-wide">AudioMagic.ai</p><p className="text-xs uppercase tracking-[0.22em] text-cyan/70">Studio OS v6</p></div>
          </div>

          <div className="mt-8 rounded-3xl border border-cyan/10 bg-cyan/10 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan">Today</p>
            <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
            <p className="text-sm text-white/45">total studio sessions</p>
          </div>

          <nav className="mt-6 space-y-2">
            {stats.map((stat) => {
              const active = activeFilter === stat.id;
              return (
                <button key={stat.id} type="button" onClick={() => setActiveFilter(active ? 'all' : stat.id)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 text-cyan' : 'border-white/5 bg-white/[0.03] text-white/55 hover:border-cyan/25 hover:text-white'}`}>
                  <span className="flex items-center gap-3"><stat.icon className="h-4 w-4" />{stat.label}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{stat.value}</span>
                </button>
              );
            })}
          </nav>

          <button type="button" onClick={onStartProject} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-cyan">
            <Plus className="h-4 w-4" /> Blank session
          </button>
        </aside>

        <section className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/5 bg-glass/85 p-6 shadow-panel backdrop-blur-xl md:p-8">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan/15 blur-3xl" />
              <div className="absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-magenta/15 blur-3xl" />
              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan"><Sparkles className="h-3.5 w-3.5" /> Complete song cycle</div>
                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tight md:text-6xl">A cleaner studio dashboard for building finished songs.</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">Start with lyrics, choose a production direction, record takes, manage versions, approve the mix, and package the release from one guided workspace.</p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {stats.map((stat) => (
                    <button key={stat.id} type="button" onClick={() => setActiveFilter(stat.id)} className="rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/30 hover:bg-cyan/10">
                      <stat.icon className="h-5 w-5 text-cyan" />
                      <p className="mt-4 text-3xl font-semibold">{stat.value}</p>
                      <p className="mt-1 text-sm text-white/50">{stat.helper}</p>
                    </button>
                  ))}
                </div>

                {latestProject && (
                  <button type="button" onClick={() => openProject(latestProject)} className="mt-6 flex w-full flex-col gap-3 rounded-3xl border border-magenta/20 bg-magenta/10 p-4 text-left transition hover:border-magenta/40 md:flex-row md:items-center md:justify-between">
                    <span><span className="text-xs uppercase tracking-[0.24em] text-magenta">Continue session</span><span className="mt-1 block text-xl font-semibold">{latestProject.trackName}</span><span className="mt-1 block text-sm text-white/45">{latestProject.status} · {latestProject.stems.length} stems · edited {latestProject.lastEdited}</span></span>
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-black">Open studio <ArrowRight className="h-4 w-4" /></span>
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-cyan/10 bg-black/35 p-5 shadow-panel backdrop-blur-xl md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs uppercase tracking-[0.28em] text-cyan">Quick start</p><h2 className="mt-2 text-2xl font-semibold">Paste lyrics → send to Producer</h2><p className="mt-2 text-sm leading-6 text-white/45">This is now the primary entry point: fewer clicks, clearer outcome.</p></div>
                <WandSparkles className="h-7 w-7 text-magenta" />
              </div>

              <div className="mt-5 grid gap-4">
                <input value={trackName} onChange={(event) => setTrackName(event.target.value)} placeholder="Song title, e.g. Accra Lights" className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 outline-none placeholder:text-white/25 focus:border-cyan/35" />
                <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} placeholder="Paste your lyrics here. The Producer workspace will use these lyrics to shape the beat, arrangement, and handoff." className="min-h-52 resize-none rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-cyan/35" />
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-sm text-white/50">Genre<select value={selectedGenreId} onChange={(event) => handleGenreChange(event.target.value)} className="rounded-2xl border border-white/5 bg-black/50 px-4 py-3 text-white outline-none focus:border-cyan/35">{GENRES.map((genre) => <option key={genre.id} value={genre.id}>{genre.emoji} {genre.name} · {genre.bpm} BPM</option>)}</select></label>
                  <label className="grid gap-2 text-sm text-white/50">Beat pattern<select value={selectedBeatName} onChange={(event) => setSelectedBeatName(event.target.value)} className="rounded-2xl border border-white/5 bg-black/50 px-4 py-3 text-white outline-none focus:border-cyan/35">{selectedGenre.beats.map((beat) => <option key={beat.name} value={beat.name}>{beat.name}</option>)}</select></label>
                </div>
                <motion.button type="button" whileHover={{ scale: lyrics.trim() ? 1.02 : 1 }} whileTap={{ scale: lyrics.trim() ? 0.98 : 1 }} disabled={!lyrics.trim()} onClick={handleCreateSong} className="inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan/35 bg-cyan px-5 py-4 font-semibold text-black shadow-cyan transition disabled:cursor-not-allowed disabled:opacity-45">
                  <Music2 className="h-5 w-5" /> Create song with Producer
                </motion.button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.28em] text-magenta">Studio pipeline</p><h2 className="mt-2 text-2xl font-semibold">One visible path from idea to release</h2></div><p className="max-w-xl text-sm leading-6 text-white/45">v6 makes the journey obvious before the user even opens a project.</p></div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">{workflowSteps.map((step, index) => <div key={step.label} className="rounded-3xl border border-white/5 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><step.icon className="h-5 w-5 text-cyan" /><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/45">0{index + 1}</span></div><p className="mt-4 font-semibold">{step.label}</p><p className="mt-2 text-sm leading-5 text-white/40">{step.helper}</p></div>)}</div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <div className="rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs uppercase tracking-[0.28em] text-cyan">Project command center</p><h2 className="mt-2 text-2xl font-semibold">Studio sessions</h2></div><button type="button" onClick={() => setActiveFilter('all')} className="text-left text-sm text-white/45 transition hover:text-cyan">Showing {visibleProjects.length} of {projects.length} {activeFilter !== 'all' ? '· clear filter' : ''}</button></div>
              <div className="mt-5 grid gap-4">
                {visibleProjects.map((project, index) => {
                  const completion = statusProgress[project.status];
                  return (
                    <motion.button key={project.id} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} onClick={() => openProject(project)} className="group grid gap-4 rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/30 hover:bg-cyan/[0.06] md:grid-cols-[1.1fr_0.8fr_0.7fr_auto] md:items-center">
                      <div><p className="text-lg font-semibold">{project.trackName}</p><p className="mt-1 text-sm text-white/40">{project.selectedBeatName ?? 'Beat not selected'} · {project.bpm ?? selectedGenre.bpm} BPM · {project.songKey ?? 'key pending'}</p></div>
                      <div><span className={`rounded-full border px-3 py-1 text-xs ${statusClasses[project.status]}`}>{project.status}</span><p className="mt-2 text-xs text-white/35">{project.stems.length} stems · {project.recordingTakes?.length ?? 0} takes</p></div>
                      <div><div className="flex items-center justify-between text-xs text-white/35"><span>Progress</span><span>{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan shadow-cyan" style={{ width: `${completion}%` }} /></div></div>
                      <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/60 transition group-hover:border-cyan/40 group-hover:text-cyan">Open <ArrowRight className="h-4 w-4" /></span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.25em] text-magenta">Needs attention</p><h3 className="mt-2 text-xl font-semibold">Next up</h3></div><Clock3 className="h-5 w-5 text-magenta" /></div><div className="mt-4 space-y-3">{needsAttention.length === 0 ? <div className="rounded-3xl border border-cyan/15 bg-cyan/10 p-4 text-sm text-cyan"><BadgeCheck className="mb-2 h-5 w-5" /> All active sessions are clear.</div> : needsAttention.map((project) => <button key={project.id} type="button" onClick={() => openProject(project)} className="w-full rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/25"><p className="font-semibold">{project.trackName}</p><p className="mt-1 text-sm text-white/40">Continue in {openModeForProject(project)} mode</p></button>)}</div></div>
              <div className="rounded-[2rem] border border-cyan/10 bg-cyan/10 p-5 shadow-cyan"><p className="text-xs uppercase tracking-[0.25em] text-cyan">Design update</p><h3 className="mt-2 text-xl font-semibold">v6 UX cleaned up</h3><p className="mt-3 text-sm leading-6 text-white/55">Fewer competing panels, stronger quick-start path, persistent navigation, clearer session list, and a visible song pipeline.</p></div>
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}
