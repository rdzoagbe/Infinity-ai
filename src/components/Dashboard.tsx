import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, BarChart3, Bot, BrainCircuit, CheckCircle2, Clock3, Disc3, FileAudio, FolderKanban, Headphones, Mic2, Music2, PackageCheck, Play, Plus, RadioTower, RotateCcw, SlidersHorizontal, Sparkles, UploadCloud, WandSparkles, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES } from '../beatLibrary';
import type { Project, ProjectStatus, SongCreationPayload } from '../types';
import { statusClasses } from '../utils';

interface DashboardProps { projects: Project[]; onStartProject: () => void; onCreateSong: (payload: SongCreationPayload) => void; }
type ProjectFilter = 'all' | 'ongoing' | 'mixing' | 'released';
type CreationPath = 'lyrics' | 'voice' | 'beat' | 'stems' | 'blank';

const statusProgress: Record<ProjectStatus, number> = { Writing: 20, Recording: 38, Producing: 58, Mixing: 78, Released: 100 };
const workflowSteps = [
  { label: 'Write', helper: 'Lyrics, hook, concept', icon: Mic2 },
  { label: 'Produce', helper: 'Beat, BPM, arrangement', icon: Music2 },
  { label: 'Record', helper: 'Takes and comping', icon: FileAudio },
  { label: 'Engineer', helper: 'Mix, master, approve', icon: SlidersHorizontal },
  { label: 'Release', helper: 'Package and deliver', icon: PackageCheck },
];
const creationPaths: Array<{ id: CreationPath; label: string; helper: string; icon: typeof Mic2 }> = [
  { id: 'lyrics', label: 'Start from lyrics', helper: 'Paste words and let Copilot shape the session.', icon: Mic2 },
  { id: 'voice', label: 'Start from voice', helper: 'Record a demo idea and build around the take.', icon: Waves },
  { id: 'beat', label: 'Start from beat idea', helper: 'Choose genre, BPM, groove, and arrangement.', icon: Music2 },
  { id: 'stems', label: 'Start from stems', helper: 'Upload tracks for mix and master decisions.', icon: UploadCloud },
  { id: 'blank', label: 'Blank studio', helper: 'Open a fresh session manually.', icon: Plus },
];
const openModeForProject = (project: Project) => project.status === 'Mixing' || project.status === 'Released' ? 'engineer' : project.status === 'Producing' ? 'producer' : 'artist';
const filterProjects = (projects: Project[], filter: ProjectFilter) => filter === 'ongoing' ? projects.filter((p) => p.status !== 'Released') : filter === 'mixing' ? projects.filter((p) => p.status === 'Mixing') : filter === 'released' ? projects.filter((p) => p.status === 'Released') : projects;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getReadiness = (project: Project) => {
  const checks = [
    { label: 'Lyrics written', complete: project.lyrics.trim().length > 0 },
    { label: 'Beat direction selected', complete: Boolean(project.selectedBeatName) },
    { label: 'At least one stem created', complete: project.stems.length > 0 },
    { label: 'Best vocal take selected', complete: Boolean(project.activeTakeId || project.recordingTakes?.some((take) => take.selected)) },
    { label: 'Mix is in progress', complete: project.status === 'Mixing' || project.status === 'Released' },
    { label: 'Release checklist started', complete: Boolean(project.releaseChecklist && Object.values(project.releaseChecklist).some(Boolean)) },
    { label: 'Final approval ready', complete: Boolean(project.approvals?.some((approval) => approval.id === 'final' && approval.status === 'approved')) },
  ];
  const score = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100);
  return { score, checks, missing: checks.filter((check) => !check.complete).slice(0, 3) };
};

const analyseLyrics = (lyrics: string, selectedGenreName: string, selectedGenreBpm: number) => {
  const cleaned = lyrics.trim();
  const words = cleaned ? cleaned.split(/\s+/).filter(Boolean) : [];
  const lower = cleaned.toLowerCase();
  const count = (items: string[]) => items.reduce((total, item) => total + (lower.includes(item) ? 1 : 0), 0);
  const scores = [
    { mood: 'emotional / intimate', key: 'F minor', bpmOffset: -8, score: count(['love', 'heart', 'miss', 'alone', 'pain', 'tears', 'soul', 'sorry', 'feel']) },
    { mood: 'confident / anthemic', key: 'C minor', bpmOffset: 4, score: count(['win', 'king', 'queen', 'money', 'rise', 'shine', 'boss', 'champion', 'power']) },
    { mood: 'spiritual / uplifting', key: 'A major', bpmOffset: -2, score: count(['god', 'pray', 'bless', 'faith', 'grace', 'mercy', 'hope']) },
    { mood: 'danceable / high energy', key: 'D minor', bpmOffset: 8, score: count(['dance', 'party', 'night', 'club', 'move', 'body', 'vibe']) },
  ].sort((a, b) => b.score - a.score);
  const top = scores[0].score > 0 ? scores[0] : { mood: 'focused / cinematic', key: 'F minor', bpmOffset: 0, score: 0 };
  const bpm = clamp(selectedGenreBpm + top.bpmOffset, 72, 148);
  const density = words.length > 130 ? 'dense lyric' : words.length > 60 ? 'balanced lyric' : words.length > 0 ? 'short sketch' : 'waiting for lyrics';
  const structure = words.length > 120 ? 'Intro → Verse 1 → Pre-Hook → Hook → Verse 2 → Hook → Bridge → Final Hook' : 'Intro → Verse → Hook → Verse → Hook → Outro';
  return { wordCount: words.length, mood: top.mood, key: top.key, bpm, density, genre: selectedGenreName, structure };
};

export default function Dashboard({ projects, onStartProject, onCreateSong }: DashboardProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>('all');
  const [creationPath, setCreationPath] = useState<CreationPath>('lyrics');
  const [trackName, setTrackName] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState(GENRES[3]?.id ?? GENRES[0].id);
  const selectedGenre = useMemo(() => GENRES.find((genre) => genre.id === selectedGenreId) ?? GENRES[0], [selectedGenreId]);
  const [selectedBeatName, setSelectedBeatName] = useState(selectedGenre.beats[0].name);
  const visibleProjects = useMemo(() => filterProjects(projects, activeFilter), [projects, activeFilter]);
  const latestProject = projects[0];
  const latestReadiness = latestProject ? getReadiness(latestProject) : null;
  const needsAttention = projects.filter((project) => project.status !== 'Released').slice(0, 3);
  const copilot = useMemo(() => analyseLyrics(lyrics, selectedGenre.name, selectedGenre.bpm), [lyrics, selectedGenre.name, selectedGenre.bpm]);
  const stats = [
    { id: 'ongoing' as const, label: 'Active sessions', value: projects.filter((p) => p.status !== 'Released').length, icon: FolderKanban, helper: 'Songs moving through the studio' },
    { id: 'mixing' as const, label: 'In engineering', value: projects.filter((p) => p.status === 'Mixing').length, icon: SlidersHorizontal, helper: 'Sessions ready for mix decisions' },
    { id: 'released' as const, label: 'Release-ready', value: projects.filter((p) => p.status === 'Released').length, icon: RadioTower, helper: 'Completed masters and packages' },
  ];
  const handleGenreChange = (genreId: string) => { const next = GENRES.find((genre) => genre.id === genreId) ?? GENRES[0]; setSelectedGenreId(next.id); setSelectedBeatName(next.beats[0].name); };
  const handleCreateSong = () => {
    if (creationPath === 'blank') { onStartProject(); return; }
    const cleanedLyrics = lyrics.trim();
    if (!cleanedLyrics) return;
    onCreateSong({ trackName: trackName.trim() || `Lyrics Session ${projects.length + 1}`, lyrics: cleanedLyrics, selectedGenreId: selectedGenre.id, selectedBeatName, prompt: `${selectedGenre.name} production using ${selectedBeatName}. Copilot analysis: ${copilot.mood}, ${copilot.key}, ${copilot.bpm} BPM, ${copilot.structure}. Build the song around the pasted lyrics, then prepare stems for engineer handoff.` });
    setTrackName(''); setLyrics('');
  };
  const openProject = (project: Project) => navigate(`/workspace/${project.id}?mode=${openModeForProject(project)}`);

  return (
    <main className="min-h-screen bg-midnight text-white">
      <div className="mx-auto grid min-h-screen max-w-[98rem] gap-6 px-4 py-5 md:px-6 lg:grid-cols-[18rem_1fr] lg:py-6">
        <aside className="rounded-[2rem] border border-white/5 bg-black/30 p-5 shadow-panel backdrop-blur-xl lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan text-black shadow-cyan"><Disc3 className="h-6 w-6" /></div><div><p className="font-semibold tracking-wide">AudioMagic.ai</p><p className="text-xs uppercase tracking-[0.22em] text-cyan/70">AI Studio OS v7</p></div></div>
          <div className="mt-8 rounded-3xl border border-cyan/10 bg-cyan/10 p-4"><p className="text-xs uppercase tracking-[0.25em] text-cyan">Today</p><p className="mt-2 text-2xl font-semibold">{projects.length}</p><p className="text-sm text-white/45">total studio sessions</p></div>
          <nav className="mt-6 space-y-2">{stats.map((stat) => { const active = activeFilter === stat.id; return <button key={stat.id} type="button" onClick={() => setActiveFilter(active ? 'all' : stat.id)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 text-cyan' : 'border-white/5 bg-white/[0.03] text-white/55 hover:border-cyan/25 hover:text-white'}`}><span className="flex items-center gap-3"><stat.icon className="h-4 w-4" />{stat.label}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{stat.value}</span></button>; })}</nav>
          <div className="mt-6 rounded-3xl border border-magenta/15 bg-magenta/10 p-4"><p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-magenta"><BrainCircuit className="h-4 w-4" /> Copilot</p><p className="mt-3 text-sm leading-6 text-white/55">Analyse lyrics, suggest BPM/key/mood, and guide the user to a finished record.</p></div>
          <button type="button" onClick={onStartProject} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-cyan"><Plus className="h-4 w-4" /> Blank session</button>
        </aside>

        <section className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/5 bg-glass/85 p-6 shadow-panel backdrop-blur-xl md:p-8">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan/15 blur-3xl" /><div className="absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-magenta/15 blur-3xl" />
              <div className="relative"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan"><Sparkles className="h-3.5 w-3.5" /> AI song copilot</div><h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tight md:text-6xl">Drop an idea. Leave with a finished record plan.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/55">AudioMagic now feels less like a static dashboard and more like a studio companion: it reads the song direction, suggests a creative path, tracks readiness, and moves the session from writing to release.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">{stats.map((stat) => <button key={stat.id} type="button" onClick={() => setActiveFilter(stat.id)} className="rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/30 hover:bg-cyan/10"><stat.icon className="h-5 w-5 text-cyan" /><p className="mt-4 text-3xl font-semibold">{stat.value}</p><p className="mt-1 text-sm text-white/50">{stat.helper}</p></button>)}</div>
                {latestProject && latestReadiness && <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_16rem]"><button type="button" onClick={() => openProject(latestProject)} className="flex flex-col gap-4 rounded-3xl border border-magenta/20 bg-magenta/10 p-4 text-left transition hover:border-magenta/40 md:flex-row md:items-center md:justify-between"><span><span className="text-xs uppercase tracking-[0.24em] text-magenta">Now working on</span><span className="mt-1 block text-xl font-semibold">{latestProject.trackName}</span><span className="mt-1 block text-sm text-white/45">{latestProject.status} · {latestProject.stems.length} stems · {latestProject.recordingTakes?.length ?? 0} takes · edited {latestProject.lastEdited}</span></span><span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-black"><Play className="h-4 w-4" /> Open player</span></button><div className="rounded-3xl border border-cyan/15 bg-cyan/10 p-4"><div className="flex items-center justify-between text-sm"><span className="text-white/55">Song readiness</span><span className="font-semibold text-cyan">{latestReadiness.score}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan shadow-cyan" style={{ width: `${latestReadiness.score}%` }} /></div><p className="mt-3 text-xs leading-5 text-white/45">Next: {latestReadiness.missing[0]?.label ?? 'Ready for final review'}</p></div></div>}
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-[2.25rem] border border-cyan/10 bg-black/35 p-5 shadow-panel backdrop-blur-xl md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.28em] text-cyan">Create</p><h2 className="mt-2 text-2xl font-semibold">What do you want to create today?</h2><p className="mt-2 text-sm leading-6 text-white/45">Choose the starting point. Copilot adapts the studio route.</p></div><WandSparkles className="h-7 w-7 text-magenta" /></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{creationPaths.map((path) => { const active = creationPath === path.id; return <button key={path.id} type="button" onClick={() => setCreationPath(path.id)} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-white/5 bg-white/[0.03] text-white/55 hover:border-cyan/25 hover:text-white'}`}><path.icon className="h-4 w-4" /><p className="mt-2 text-sm font-semibold">{path.label}</p><p className="mt-1 text-xs leading-5 opacity-70">{path.helper}</p></button>; })}</div></div>
              <div className="rounded-[2.25rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl md:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.28em] text-magenta">Live analysis</p><h2 className="mt-2 text-2xl font-semibold">AudioMagic Copilot</h2></div><Bot className="h-7 w-7 text-cyan" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[{ label: 'Mood', value: copilot.mood }, { label: 'Key', value: copilot.key }, { label: 'BPM', value: String(copilot.bpm) }, { label: 'Lyric density', value: copilot.density }].map((item) => <div key={item.label} className="rounded-2xl border border-white/5 bg-black/25 p-3"><p className="text-xs uppercase tracking-[0.2em] text-white/35">{item.label}</p><p className="mt-2 font-semibold text-white">{item.value}</p></div>)}</div><div className="mt-3 rounded-2xl border border-cyan/15 bg-cyan/10 p-3 text-sm leading-6 text-white/60"><span className="text-cyan">Recommended structure:</span> {copilot.structure}</div></div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[2rem] border border-cyan/10 bg-black/35 p-5 shadow-panel backdrop-blur-xl md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.28em] text-cyan">Quick studio start</p><h2 className="mt-2 text-2xl font-semibold">Lyrics → Copilot → Producer</h2><p className="mt-2 text-sm leading-6 text-white/45">Paste lyrics, let the AI plan the song, then open Producer Mode with the right context.</p></div><Headphones className="h-7 w-7 text-cyan" /></div><div className="mt-5 grid gap-4"><input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Song title, e.g. Accra Lights" className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 outline-none placeholder:text-white/25 focus:border-cyan/35" /><textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste your lyrics here. Copilot will analyse mood, key, BPM, structure, and producer handoff." className="min-h-52 resize-none rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-cyan/35" /><div className="grid gap-3 md:grid-cols-2"><label className="grid gap-2 text-sm text-white/50">Genre<select value={selectedGenreId} onChange={(e) => handleGenreChange(e.target.value)} className="rounded-2xl border border-white/5 bg-black/50 px-4 py-3 text-white outline-none focus:border-cyan/35">{GENRES.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name} · {g.bpm} BPM</option>)}</select></label><label className="grid gap-2 text-sm text-white/50">Beat pattern<select value={selectedBeatName} onChange={(e) => setSelectedBeatName(e.target.value)} className="rounded-2xl border border-white/5 bg-black/50 px-4 py-3 text-white outline-none focus:border-cyan/35">{selectedGenre.beats.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}</select></label></div><motion.button type="button" whileHover={{ scale: lyrics.trim() || creationPath === 'blank' ? 1.02 : 1 }} whileTap={{ scale: lyrics.trim() || creationPath === 'blank' ? 0.98 : 1 }} disabled={creationPath !== 'blank' && !lyrics.trim()} onClick={handleCreateSong} className="inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan/35 bg-cyan px-5 py-4 font-semibold text-black shadow-cyan transition disabled:cursor-not-allowed disabled:opacity-45"><Music2 className="h-5 w-5" /> {creationPath === 'blank' ? 'Open blank studio' : 'Create song with Copilot'}</motion.button></div></div>
            <div className="rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl md:p-6"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.28em] text-magenta">Studio pipeline</p><h2 className="mt-2 text-2xl font-semibold">One visible path from idea to release</h2></div><p className="max-w-xl text-sm leading-6 text-white/45">v7 adds the intelligent layer that explains what happens next at each step.</p></div><div className="mt-5 grid gap-3 md:grid-cols-5">{workflowSteps.map((step, index) => <div key={step.label} className="rounded-3xl border border-white/5 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><step.icon className="h-5 w-5 text-cyan" /><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/45">0{index + 1}</span></div><p className="mt-4 font-semibold">{step.label}</p><p className="mt-2 text-sm leading-5 text-white/40">{step.helper}</p></div>)}</div><div className="mt-5 rounded-3xl border border-cyan/15 bg-cyan/10 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-cyan"><BarChart3 className="h-4 w-4" /> Copilot output</p><p className="mt-2 text-sm leading-6 text-white/55">{copilot.wordCount > 0 ? `Detected ${copilot.wordCount} words. Recommended ${copilot.genre}, ${copilot.bpm} BPM, ${copilot.key}, with a ${copilot.mood} performance direction.` : 'Paste lyrics to generate a song plan, structure, and producer handoff.'}</p></div></div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_23rem]">
            <div className="rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl md:p-6"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs uppercase tracking-[0.28em] text-cyan">Project command center</p><h2 className="mt-2 text-2xl font-semibold">Studio sessions</h2></div><button type="button" onClick={() => setActiveFilter('all')} className="text-left text-sm text-white/45 transition hover:text-cyan">Showing {visibleProjects.length} of {projects.length} {activeFilter !== 'all' ? '· clear filter' : ''}</button></div><div className="mt-5 grid gap-4">{visibleProjects.map((project, index) => { const completion = statusProgress[project.status]; const readiness = getReadiness(project); return <motion.button key={project.id} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} onClick={() => openProject(project)} className="group grid gap-4 rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/30 hover:bg-cyan/[0.06] md:grid-cols-[1.05fr_0.7fr_0.8fr_0.7fr_auto] md:items-center"><div><p className="text-lg font-semibold">{project.trackName}</p><p className="mt-1 text-sm text-white/40">{project.selectedBeatName ?? 'Beat not selected'} · {project.bpm ?? selectedGenre.bpm} BPM · {project.songKey ?? 'key pending'}</p></div><div><span className={`rounded-full border px-3 py-1 text-xs ${statusClasses[project.status]}`}>{project.status}</span><p className="mt-2 text-xs text-white/35">{project.stems.length} stems · {project.recordingTakes?.length ?? 0} takes</p></div><div><div className="flex items-center justify-between text-xs text-white/35"><span>Progress</span><span>{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan shadow-cyan" style={{ width: `${completion}%` }} /></div></div><div><div className="flex items-center justify-between text-xs text-white/35"><span>Ready</span><span>{readiness.score}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-magenta" style={{ width: `${readiness.score}%` }} /></div></div><span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/60 transition group-hover:border-cyan/40 group-hover:text-cyan">Open <ArrowRight className="h-4 w-4" /></span></motion.button>; })}</div></div>
            <aside className="space-y-5"><div className="rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.25em] text-magenta">Needs attention</p><h3 className="mt-2 text-xl font-semibold">Next up</h3></div><Clock3 className="h-5 w-5 text-magenta" /></div><div className="mt-4 space-y-3">{needsAttention.length === 0 ? <div className="rounded-3xl border border-cyan/15 bg-cyan/10 p-4 text-sm text-cyan"><BadgeCheck className="mb-2 h-5 w-5" /> All active sessions are clear.</div> : needsAttention.map((project) => { const readiness = getReadiness(project); return <button key={project.id} type="button" onClick={() => openProject(project)} className="w-full rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/25"><p className="font-semibold">{project.trackName}</p><p className="mt-1 text-sm text-white/40">Continue in {openModeForProject(project)} mode</p><div className="mt-3 flex items-center gap-2 text-xs text-white/35"><CheckCircle2 className="h-4 w-4 text-cyan" /> Readiness {readiness.score}%</div></button>; })}</div></div><div className="rounded-[2rem] border border-cyan/10 bg-cyan/10 p-5 shadow-cyan"><p className="text-xs uppercase tracking-[0.25em] text-cyan">v7 update</p><h3 className="mt-2 text-xl font-semibold">The missing magic layer</h3><p className="mt-3 text-sm leading-6 text-white/55">AI Song Copilot, song readiness, music-player session context, onboarding choices, and clearer next actions are now part of the main experience.</p></div><button type="button" onClick={() => { setTrackName(''); setLyrics(''); setCreationPath('lyrics'); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/60 transition hover:border-magenta/30 hover:text-magenta"><RotateCcw className="h-4 w-4" /> Reset quick start</button></aside>
          </section>
        </section>
      </div>
    </main>
  );
}
