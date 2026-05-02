import { motion } from 'framer-motion';
import { ArrowUpRight, Disc3, Filter, FolderKanban, Mic2, Music2, Plus, RadioTower, SlidersHorizontal, WandSparkles } from 'lucide-react';
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

export default function Dashboard({ projects, onStartProject, onCreateSong }: DashboardProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>('all');
  const [trackName, setTrackName] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState(GENRES[3]?.id ?? GENRES[0].id);
  const selectedGenre = useMemo(() => GENRES.find((genre) => genre.id === selectedGenreId) ?? GENRES[0], [selectedGenreId]);
  const [selectedBeatName, setSelectedBeatName] = useState(selectedGenre.beats[0].name);

  const visibleProjects = useMemo(() => filterProjects(projects, activeFilter), [projects, activeFilter]);

  const stats = [
    {
      id: 'ongoing' as const,
      label: 'Ongoing Projects',
      value: projects.filter((project) => project.status !== 'Released').length,
      icon: FolderKanban,
      helper: 'Active writing, production, and mix sessions',
    },
    {
      id: 'mixing' as const,
      label: 'In Mixing',
      value: projects.filter((project) => project.status === 'Mixing').length,
      icon: SlidersHorizontal,
      helper: 'Ready for the engineering visual console',
    },
    {
      id: 'released' as const,
      label: 'Released',
      value: projects.filter((project) => project.status === 'Released').length,
      icon: RadioTower,
      helper: 'Final exported masters',
    },
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

  return (
    <main className="min-h-screen bg-midnight px-6 py-8 text-white lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-cyan shadow-cyan">
              <Disc3 className="h-3.5 w-3.5" /> AudioMagic.ai
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              Lyrics to production to engineering, in one guided studio flow.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/55">
              Paste lyrics, choose a beat direction, let Producer Mode build the foundation, then send the session into a musical visual dashboard for engineering.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartProject}
            className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan/40 bg-cyan px-6 py-4 font-semibold text-black shadow-cyan transition hover:shadow-[0_0_42px_rgba(0,229,255,0.42)]"
          >
            <Plus className="h-5 w-5" />
            Start Blank Project
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const active = activeFilter === stat.id;
            return (
              <motion.button
                key={stat.label}
                type="button"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                onClick={() => setActiveFilter(active ? 'all' : stat.id)}
                className={`rounded-3xl border p-6 text-left shadow-panel backdrop-blur-xl transition ${
                  active ? 'border-cyan/55 bg-cyan/10 shadow-cyan' : 'border-white/5 bg-glass/80 hover:border-cyan/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50">{stat.label}</p>
                  <stat.icon className="h-5 w-5 text-cyan" />
                </div>
                <p className="mt-5 text-4xl font-semibold">{stat.value}</p>
                <p className="mt-3 text-xs leading-5 text-white/35">{stat.helper}</p>
                <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan/75">
                  <Filter className="h-3.5 w-3.5" /> {active ? 'Filter active' : 'Click to filter'}
                </div>
              </motion.button>
            );
          })}
        </div>

        <section className="mt-10 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-cyan/10 bg-glass/85 p-6 shadow-panel backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan">Lyrics to Song</p>
                <h2 className="mt-2 text-2xl font-semibold">Paste lyrics and ask the Producer to build it</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  This creates a session, sends it directly to Producer Mode, and preloads the chosen beat library direction.
                </p>
              </div>
              <WandSparkles className="h-7 w-7 text-magenta" />
            </div>

            <div className="mt-5 grid gap-4">
              <input
                value={trackName}
                onChange={(event) => setTrackName(event.target.value)}
                placeholder="Song title, e.g. Accra Lights"
                className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none placeholder:text-white/25 focus:border-cyan/35"
              />
              <textarea
                value={lyrics}
                onChange={(event) => setLyrics(event.target.value)}
                placeholder="Paste your lyrics here..."
                className="min-h-44 resize-none rounded-2xl border border-white/5 bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-cyan/35"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-white/50">
                  Genre
                  <select
                    value={selectedGenreId}
                    onChange={(event) => handleGenreChange(event.target.value)}
                    className="rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan/35"
                  >
                    {GENRES.map((genre) => (
                      <option key={genre.id} value={genre.id}>
                        {genre.emoji} {genre.name} · {genre.bpm} BPM
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-white/50">
                  Beat Pattern
                  <select
                    value={selectedBeatName}
                    onChange={(event) => setSelectedBeatName(event.target.value)}
                    className="rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan/35"
                  >
                    {selectedGenre.beats.map((beat) => (
                      <option key={beat.name} value={beat.name}>
                        {beat.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: lyrics.trim() ? 1.02 : 1 }}
                whileTap={{ scale: lyrics.trim() ? 0.98 : 1 }}
                disabled={!lyrics.trim()}
                onClick={handleCreateSong}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan/35 bg-cyan px-5 py-4 font-semibold text-black shadow-cyan transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Music2 className="h-5 w-5" /> Create Song with Producer
              </motion.button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-glass/75 p-6 shadow-panel backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-magenta">Guided workflow</p>
            <h2 className="mt-2 text-2xl font-semibold">Lyrics → Producer → Engineer → Export</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { title: '1. Lyrics', text: 'Paste or write lyrics and define the song direction.', icon: Mic2 },
                { title: '2. Producer', text: 'Pick a beat pattern, render a WAV, upload stems, and arrange.', icon: Music2 },
                { title: '3. Engineer', text: 'Drag stems in the visual console, adjust pan/depth, and export ZIP.', icon: SlidersHorizontal },
              ].map((step) => (
                <div key={step.title} className="rounded-3xl border border-white/5 bg-black/25 p-4">
                  <step.icon className="h-6 w-6 text-cyan" />
                  <p className="mt-4 font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/40">{step.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-magenta/20 bg-magenta/10 p-4 text-sm leading-6 text-white/55">
              Selected direction: <span className="text-white">{selectedGenre.name}</span> · <span className="text-white">{selectedBeatName}</span> · {selectedGenre.bpm} BPM
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">Studio Projects</h2>
          <button type="button" onClick={() => setActiveFilter('all')} className="text-left text-sm text-white/40 transition hover:text-cyan">
            Showing {visibleProjects.length} of {projects.length} sessions {activeFilter !== 'all' ? '· clear filter' : ''}
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <motion.button
              key={project.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/workspace/${project.id}?mode=${project.status === 'Mixing' ? 'engineer' : project.status === 'Producing' ? 'producer' : 'artist'}`)}
              className="group relative overflow-hidden rounded-3xl border border-white/5 bg-glass/85 p-6 text-left shadow-panel backdrop-blur-xl transition hover:border-cyan/30"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan/10 blur-3xl transition group-hover:bg-cyan/20" />
              <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-magenta/10 blur-3xl transition group-hover:bg-magenta/20" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/35">Track</p>
                  <h3 className="mt-3 text-2xl font-semibold">{project.trackName}</h3>
                  <p className="mt-2 text-xs text-white/35">{project.selectedBeatName ?? 'No beat selected'} {project.selectedGenreId ? `· ${project.selectedGenreId}` : ''}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-white/35 transition group-hover:text-cyan" />
              </div>

              <div className="relative mt-8 flex items-center justify-between">
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses[project.status]}`}>{project.status}</span>
                <span className="text-sm text-white/40">Edited {project.lastEdited}</span>
              </div>
              <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-cyan shadow-cyan" style={{ width: `${statusProgress[project.status]}%` }} />
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </main>
  );
}
