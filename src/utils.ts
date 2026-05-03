import type { ArrangementSection, Project, ProjectStatus, ReleaseChecklist, SessionHistoryEvent, SongCreationPayload, Stem } from './types';

export const nowLabel = () =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const defaultArrangementSections = (): ArrangementSection[] => [
  { id: id('section'), name: 'Intro', bars: 4, energy: 'Low', note: 'Set the atmosphere and tease the hook motif.' },
  { id: id('section'), name: 'Verse 1', bars: 16, energy: 'Medium', note: 'Keep lyrics forward with restrained drums.' },
  { id: id('section'), name: 'Hook', bars: 8, energy: 'High', note: 'Open the beat, widen backing vocals, lift the bass.' },
  { id: id('section'), name: 'Verse 2', bars: 16, energy: 'Medium', note: 'Add variation without crowding the vocal.' },
  { id: id('section'), name: 'Final Hook', bars: 8, energy: 'Peak', note: 'Full production and strongest vocal stack.' },
  { id: id('section'), name: 'Outro', bars: 4, energy: 'Low', note: 'Strip back and leave a clean ending.' },
];

export const defaultReleaseChecklist = (overrides?: Partial<ReleaseChecklist>): ReleaseChecklist => ({
  lyrics: false,
  stems: false,
  mix: false,
  master: false,
  artwork: false,
  metadata: false,
  ...overrides,
});

export const createHistoryEvent = (message: string, actor: SessionHistoryEvent['actor'] = 'System'): SessionHistoryEvent => ({
  id: id('event'),
  timestamp: nowLabel(),
  actor,
  message,
});

export const createProject = (index: number, payload?: Partial<SongCreationPayload>): Project => {
  const hasLyrics = Boolean(payload?.lyrics?.trim());
  return {
    id: id('project'),
    trackName: payload?.trackName?.trim() || `Untitled Session ${index}`,
    status: hasLyrics ? 'Producing' : 'Writing',
    lastEdited: nowLabel(),
    lyrics: payload?.lyrics ?? '',
    coWriterSuggestions: [],
    prompt: payload?.prompt ?? '',
    stems: [],
    selectedGenreId: payload?.selectedGenreId,
    selectedBeatName: payload?.selectedBeatName,
    arrangement: hasLyrics
      ? 'Suggested structure: Intro · Verse 1 · Hook · Verse 2 · Hook · Bridge · Final Hook'
      : undefined,
    producerNotes: hasLyrics ? 'Lyrics received from the dashboard. Select or render a beat, then send the session to Engineer Mode.' : undefined,
    bpm: 104,
    songKey: 'F minor',
    mood: hasLyrics ? 'Confident, emotional, radio-ready' : 'Unassigned',
    referenceTrack: '',
    masterPreset: 'Streaming Loud',
    arrangementSections: defaultArrangementSections(),
    sessionHistory: [createHistoryEvent(hasLyrics ? 'Song created from pasted lyrics and routed to Producer Mode.' : 'Blank studio session created.', 'System')],
    releaseChecklist: defaultReleaseChecklist({ lyrics: hasLyrics }),
  };
};

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
    bpm: 108,
    songKey: 'D minor',
    mood: 'Nocturnal, energetic, cinematic',
    referenceTrack: 'Afrobeats club record with wide synth atmosphere',
    masterPreset: 'Club Master',
    arrangementSections: defaultArrangementSections(),
    sessionHistory: [
      createHistoryEvent('Lyrics and production brief imported.', 'Artist'),
      createHistoryEvent('Beat direction selected: Lagos Bounce.', 'Producer'),
      createHistoryEvent('Session sent to Engineer Mode for visual mixing.', 'Producer'),
    ],
    releaseChecklist: defaultReleaseChecklist({ lyrics: true, stems: true, mix: false }),
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
    bpm: 86,
    songKey: 'A-flat minor',
    mood: 'Warm, intimate, late-night',
    referenceTrack: 'Modern R&B with soft bass and intimate vocal chain',
    masterPreset: 'Warm Analog',
    arrangementSections: defaultArrangementSections(),
    sessionHistory: [createHistoryEvent('R&B lyrics drafted and assigned to producer.', 'Artist')],
    releaseChecklist: defaultReleaseChecklist({ lyrics: true }),
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
    bpm: 78,
    songKey: 'F major',
    mood: 'Calm, reflective, night drive',
    referenceTrack: 'Lo-fi instrumental with tape hiss and soft low end',
    masterPreset: 'Warm Analog',
    arrangementSections: defaultArrangementSections(),
    sessionHistory: [
      createHistoryEvent('Final master exported.', 'Engineer'),
      createHistoryEvent('Release package prepared.', 'System'),
    ],
    releaseChecklist: defaultReleaseChecklist({ lyrics: true, stems: true, mix: true, master: true, artwork: true, metadata: true }),
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
