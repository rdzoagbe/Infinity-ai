import type {
  ApprovalGate,
  ArrangementSection,
  ExportAssetId,
  ExportPackage,
  Project,
  ProjectStatus,
  RecordingTake,
  ReleaseChecklist,
  SessionHistoryEvent,
  SongCreationPayload,
  Stem,
  VersionRecord,
} from './types';

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

export const defaultApprovalGates = (timestamp = nowLabel()): ApprovalGate[] => [
  { id: 'artist', label: 'Artist approval', owner: 'Artist', status: 'pending', note: 'Artist needs to approve lyrics, vocal direction, and emotion.', updatedAt: timestamp },
  { id: 'producer', label: 'Producer approval', owner: 'Producer', status: 'pending', note: 'Producer needs to approve beat, structure, and stem handoff.', updatedAt: timestamp },
  { id: 'engineer', label: 'Engineer approval', owner: 'Engineer', status: 'pending', note: 'Engineer needs to approve mix balance, stereo field, and master readiness.', updatedAt: timestamp },
  { id: 'final', label: 'Final master approval', owner: 'System', status: 'pending', note: 'Final release approval is pending.', updatedAt: timestamp },
];

export const defaultExportAssets = (overrides?: Partial<Record<ExportAssetId, boolean>>): Record<ExportAssetId, boolean> => ({
  wavMaster: true,
  mp3Preview: true,
  stemsZip: true,
  instrumental: false,
  acapella: false,
  lyricsPdf: true,
  releaseNotes: true,
  ...overrides,
});

export const createHistoryEvent = (message: string, actor: SessionHistoryEvent['actor'] = 'System'): SessionHistoryEvent => ({
  id: id('event'),
  timestamp: nowLabel(),
  actor,
  message,
});

export const createVersionRecord = (
  label: string,
  kind: VersionRecord['kind'],
  owner: VersionRecord['owner'],
  summary: string,
  stemCount: number,
  approved = false,
): VersionRecord => ({
  id: id('version'),
  label,
  kind,
  owner,
  summary,
  stemCount,
  approved,
  createdAt: nowLabel(),
});

export const createRecordingTake = (name: string, section: string, stemId?: string, note = ''): RecordingTake => ({
  id: id('take'),
  name,
  section,
  stemId,
  createdAt: nowLabel(),
  durationLabel: 'Browser take',
  rating: 3,
  selected: false,
  note,
});

export const createExportPackage = (name: string, assets: Record<ExportAssetId, boolean>, notes: string): ExportPackage => ({
  id: id('export'),
  name,
  assets,
  notes,
  createdAt: nowLabel(),
  ready: Object.values(assets).some(Boolean),
});

export const createProject = (index: number, payload?: Partial<SongCreationPayload>): Project => {
  const hasLyrics = Boolean(payload?.lyrics?.trim());
  const initialHistory = createHistoryEvent(hasLyrics ? 'Song created from pasted lyrics and routed to Producer Mode.' : 'Blank studio session created.', 'System');
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
    sessionHistory: [initialHistory],
    releaseChecklist: defaultReleaseChecklist({ lyrics: hasLyrics }),
    recordingTakes: [],
    activeTakeId: undefined,
    approvals: defaultApprovalGates(initialHistory.timestamp),
    versionHistory: [
      createVersionRecord(hasLyrics ? 'V0 lyric brief' : 'V0 blank session', 'demo', 'System', hasLyrics ? 'Initial lyrics-to-song brief created.' : 'Blank studio session opened.', 0),
    ],
    exportPackages: [],
  };
};

const seedTime = 'May 01, 21:12';

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
    recordingTakes: [
      { id: id('take'), name: 'Hook Take 1', section: 'Hook', createdAt: 'May 01, 20:48', durationLabel: '00:34', rating: 4, selected: true, note: 'Strong emotion, keep as comp candidate.' },
    ],
    activeTakeId: undefined,
    approvals: [
      { id: 'artist', label: 'Artist approval', owner: 'Artist', status: 'approved', note: 'Lyrics and vocal direction approved.', updatedAt: seedTime },
      { id: 'producer', label: 'Producer approval', owner: 'Producer', status: 'approved', note: 'Beat and arrangement approved.', updatedAt: seedTime },
      { id: 'engineer', label: 'Engineer approval', owner: 'Engineer', status: 'pending', note: 'Mix approval pending.', updatedAt: seedTime },
      { id: 'final', label: 'Final master approval', owner: 'System', status: 'pending', note: 'Final release approval pending.', updatedAt: seedTime },
    ],
    versionHistory: [
      createVersionRecord('Mix v1', 'mix', 'Engineer', 'Initial spatial mix prepared from producer handoff.', 0),
      createVersionRecord('Beat foundation v1', 'beat', 'Producer', 'Lagos Bounce beat direction selected.', 0, true),
    ],
    exportPackages: [],
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
    recordingTakes: [],
    approvals: defaultApprovalGates('Apr 28, 19:44'),
    versionHistory: [createVersionRecord('Lyric draft v1', 'demo', 'Artist', 'Initial lyric draft ready for production.', 0)],
    exportPackages: [],
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
    recordingTakes: [
      { id: id('take'), name: 'Final vocal comp', section: 'Full song', createdAt: 'Apr 10, 18:22', durationLabel: '02:48', rating: 5, selected: true, note: 'Approved lead vocal comp.' },
    ],
    approvals: [
      { id: 'artist', label: 'Artist approval', owner: 'Artist', status: 'approved', note: 'Artist approved final direction.', updatedAt: 'Apr 12, 08:09' },
      { id: 'producer', label: 'Producer approval', owner: 'Producer', status: 'approved', note: 'Producer approved release package.', updatedAt: 'Apr 12, 08:09' },
      { id: 'engineer', label: 'Engineer approval', owner: 'Engineer', status: 'approved', note: 'Engineer approved final master.', updatedAt: 'Apr 12, 08:09' },
      { id: 'final', label: 'Final master approval', owner: 'System', status: 'approved', note: 'Release package complete.', updatedAt: 'Apr 12, 08:09' },
    ],
    versionHistory: [
      createVersionRecord('Master v1', 'master', 'Engineer', 'Final warm analog master exported.', 0, true),
      createVersionRecord('Release package v1', 'release', 'System', 'Distribution-ready package assembled.', 0, true),
    ],
    exportPackages: [
      createExportPackage('Midnight Pilot release package', defaultExportAssets({ instrumental: true, acapella: true }), 'Final package created for release review.'),
    ],
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
