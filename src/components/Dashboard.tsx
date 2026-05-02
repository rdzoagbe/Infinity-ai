import { motion } from 'framer-motion';
import { ArrowUpRight, Disc3, FolderKanban, Plus, RadioTower, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types';
import { statusClasses } from '../utils';

interface DashboardProps {
  projects: Project[];
  onStartProject: () => void;
}

export default function Dashboard({ projects, onStartProject }: DashboardProps) {
  const navigate = useNavigate();

  const stats = [
    {
      label: 'Ongoing Projects',
      value: projects.filter((project) => project.status !== 'Released').length,
      icon: FolderKanban,
    },
    {
      label: 'In Mixing',
      value: projects.filter((project) => project.status === 'Mixing').length,
      icon: SlidersHorizontal,
    },
    {
      label: 'Released',
      value: projects.filter((project) => project.status === 'Released').length,
      icon: RadioTower,
    },
  ];

  return (
    <main className="min-h-screen bg-midnight px-6 py-8 text-white lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-cyan shadow-cyan">
              <Disc3 className="h-3.5 w-3.5" /> AudioMagic.ai
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              One workspace for the artist, producer, and engineer.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/55">
              Manage songs, capture vocals, generate production ideas, spatially mix stems, and export masters from a single premium studio dashboard.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartProject}
            className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan/40 bg-cyan px-6 py-4 font-semibold text-black shadow-cyan transition hover:shadow-[0_0_42px_rgba(0,229,255,0.42)]"
          >
            <Plus className="h-5 w-5" />
            Start New Project
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/5 bg-glass/80 p-6 shadow-panel backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/50">{stat.label}</p>
                <stat.icon className="h-5 w-5 text-cyan" />
              </div>
              <p className="mt-5 text-4xl font-semibold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Studio Projects</h2>
          <p className="text-sm text-white/40">{projects.length} total sessions</p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <motion.button
              key={project.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/workspace/${project.id}`)}
              className="group relative overflow-hidden rounded-3xl border border-white/5 bg-glass/85 p-6 text-left shadow-panel backdrop-blur-xl transition hover:border-cyan/30"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan/10 blur-3xl transition group-hover:bg-cyan/20" />
              <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-magenta/10 blur-3xl transition group-hover:bg-magenta/20" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/35">Track</p>
                  <h3 className="mt-3 text-2xl font-semibold">{project.trackName}</h3>
                </div>
                <ArrowUpRight className="h-5 w-5 text-white/35 transition group-hover:text-cyan" />
              </div>

              <div className="relative mt-8 flex items-center justify-between">
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses[project.status]}`}>
                  {project.status}
                </span>
                <span className="text-sm text-white/40">Edited {project.lastEdited}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </main>
  );
}
