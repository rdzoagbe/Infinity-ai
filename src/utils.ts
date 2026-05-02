import type { Project, Stem, ProjectStatus } from './types';

export const nowLabel = () =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const createProject = (index: number): Project => ({
  id: id('project'),
  trackName: `Untitled Session ${index}`,
  status: 'Writing',
  lastEdited: nowLabel(),
  lyrics: '',
  coWriterSuggestions: [],
  prompt: '',
  stems: [],
});

export const seedProjects: Project[] = [
  {
    id: id('project'),
    trackName: 'Neon Afterglow',
    status: 'Mixing',
    lastEdited: 'May 01, 21:12',
    lyrics: 'City lights bend where the shadows go...',
    coWriterSuggestions: [],
    prompt: 'A dark afro-electronic groove with cinematic synth bass.',
    stems: [],
  },
  {
    id: id('project'),
    trackName: 'Velvet Static',
    status: 'Producing',
    lastEdited: 'Apr 28, 19:44',
    lyrics: '',
    coWriterSuggestions: [],
    prompt: '',
    stems: [],
  },
  {
    id: id('project'),
    trackName: 'Midnight Pilot',
    status: 'Released',
    lastEdited: 'Apr 12, 08:09',
    lyrics: '',
    coWriterSuggestions: [],
    prompt: '',
    stems: [],
  },
];

export const statusClasses: Record<ProjectStatus, string> = {
  Writing: 'border-white/10 text-white/70 bg-white/5',
  Recording: 'border-cyan/30 text-cyan bg-cyan/10',
  Producing: 'border-magenta/30 text-magenta bg-magenta/10',
  Mixing: 'border-cyan/30 text-cyan bg-cyan/10',
  Released: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const updateStem = (stems: Stem[], updatedStem: Stem) =>
  stems.map((stem) => (stem.id === updatedStem.id ? updatedStem : stem));
