import type { Project, ProjectStatus, SongCreationPayload, Stem } from './types';

export const nowLabel = () =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const createProject = (index: number, payload?: Partial<SongCreationPayload>): Project => ({
  id: id('project'),
  trackName: payload?.trackName?.trim() || `Untitled Session ${index}`,
  status: payload?.lyrics ? 'Producing' : 'Writing',
  lastEdited: nowLabel(),
  lyrics: payload?.lyrics ?? '',
  coWriterSuggestions: [],
  prompt: payload?.prompt ?? '',
  stems: [],
  selectedGenreId: payload?.selectedGenreId,
  selectedBeatName: payload?.selectedBeatName,
  arrangement: payload?.lyrics
    ? 'Suggested structure: Intro · Verse 1 · Hook · Verse 2 · Hook · Bridge · Final Hook'
    : undefined,
  producerNotes: payload?.lyrics ? 'Lyrics received from the dashboard. Select or render a beat, then send the session to Engineer Mode.' : undefined,
});

export const seedProjects: Project[] = [
  {
    id: id('project'),
    trackName: 'Neon Afterglow',
    status: 'Mixing',
    lastEdited: 'May 01, 21:12',
    lyrics: 'City lights bend where the shadows go...\nI keep my voice low but the drums still know...',
    coWriterSuggestions: [],
    prompt: 'A dark afro-electronic groove with cinematic synth bass.',
    stems: [],
    selectedGenreId: 'afrobeat',
    selectedBeatName: 'Lagos Bounce',
    arrangement: 'Intro · Verse · Hook · Verse · Hook · Outro',
    producerNotes: 'Ready for spatial placement. Beat direction: neon Afro-electronic bounce.',
  },
  {
    id: id('project'),
    trackName: 'Velvet Static',
    status: 'Producing',
    lastEdited: 'Apr 28, 19:44',
    lyrics: 'Velvet static on the radio line...\nYour name keeps cutting through the night...',
    coWriterSuggestions: [],
    prompt: 'Smooth R&B beat with warm chords and late-night percussion.',
    stems: [],
    selectedGenreId: 'rnb',
    selectedBeatName: 'Silky Groove',
    arrangement: 'Verse · Pre-hook · Hook · Verse · Hook',
    producerNotes: 'Needs beat rendering and vocal capture before engineering.',
  },
  {
    id: id('project'),
    trackName: 'Midnight Pilot',
    status: 'Released',
    lastEdited: 'Apr 12, 08:09',
    lyrics: 'Midnight pilot with the windows low...',
    coWriterSuggestions: [],
    prompt: 'Lo-fi atmospheric instrumental with soft tape saturation.',
    stems: [],
    selectedGenreId: 'lofi',
    selectedBeatName: 'Late Night',
    arrangement: 'Released master package.',
    producerNotes: 'Exported master is complete.',
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

export const updateStem = (stems: Stem[], updatedStem: Stem) => stems.map((stem) => (stem.id === updatedStem.id ? updatedStem : stem));
