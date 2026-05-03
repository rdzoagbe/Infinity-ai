import { GENRES } from './beatLibrary';
import type { Project } from './types';

export interface CopilotAnalysis {
  wordCount: number;
  mood: string;
  key: string;
  bpm: number;
  density: string;
  genre: string;
  structure: string;
  summary: string;
  tips: string[];
}

export interface ReadinessResult {
  score: number;
  checks: Array<{ label: string; complete: boolean }>;
  missing: string[];
}

export const analyseLyrics = (lyrics: string, genreId?: string): CopilotAnalysis => {
  const words = lyrics.trim() ? lyrics.trim().split(/\s+/).filter(Boolean) : [];
  const lower = lyrics.toLowerCase();
  const genre = GENRES.find((item) => item.id === genreId) ?? GENRES[3] ?? GENRES[0];
  const profiles = [
    { mood: 'emotional / intimate', key: 'F minor', shift: -8, terms: ['love', 'heart', 'miss', 'alone', 'pain', 'tears', 'soul'] },
    { mood: 'confident / anthemic', key: 'C minor', shift: 4, terms: ['win', 'king', 'queen', 'money', 'rise', 'shine', 'power'] },
    { mood: 'spiritual / uplifting', key: 'A major', shift: -2, terms: ['god', 'pray', 'bless', 'faith', 'grace', 'hope'] },
    { mood: 'danceable / high energy', key: 'D minor', shift: 8, terms: ['dance', 'party', 'night', 'club', 'move', 'body', 'vibe'] },
  ]
    .map((profile) => ({
      ...profile,
      score: profile.terms.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  const top = profiles[0].score > 0 ? profiles[0] : { mood: 'focused / cinematic', key: 'F minor', shift: 0 };
  const bpm = Math.min(Math.max(genre.bpm + top.shift, 72), 148);
  const density = words.length > 130 ? 'dense lyric' : words.length > 60 ? 'balanced lyric' : words.length > 0 ? 'short sketch' : 'waiting for lyrics';
  const structure = words.length > 120
    ? 'Intro → Verse 1 → Pre-Hook → Hook → Verse 2 → Hook → Bridge → Final Hook'
    : 'Intro → Verse → Hook → Verse → Hook → Outro';

  const tips = [
    `Aim for a ${genre.name} groove around ${bpm} BPM.`,
    `Keep the performance direction ${top.mood}.`,
    words.length > 0 ? `Use ${top.key} as a starting tonal center.` : 'Paste lyrics to unlock structure and tonal guidance.',
  ];

  return {
    wordCount: words.length,
    mood: top.mood,
    key: top.key,
    bpm,
    density,
    genre: genre.name,
    structure,
    summary: words.length > 0
      ? `Copilot hears a ${top.mood} record with ${genre.name} energy, living around ${bpm} BPM in ${top.key}.`
      : 'Copilot is waiting for lyrics or a creative brief before recommending a song direction.',
    tips,
  };
};

export const getReadiness = (project: Project): ReadinessResult => {
  const checks = [
    { label: 'Lyrics written', complete: project.lyrics.trim().length > 0 },
    { label: 'Beat direction selected', complete: Boolean(project.selectedBeatName) },
    { label: 'At least one stem created', complete: project.stems.length > 0 },
    { label: 'Best vocal take selected', complete: Boolean(project.activeTakeId || project.recordingTakes?.some((take) => take.selected)) },
    { label: 'Mix in progress', complete: project.status === 'Mixing' || project.status === 'Released' },
    { label: 'Master exported or package started', complete: Boolean(project.exportPackages?.length || project.aiMasterUrl || project.rawMasterUrl) },
    { label: 'Release checklist started', complete: Boolean(project.releaseChecklist && Object.values(project.releaseChecklist).some(Boolean)) },
  ];

  return {
    score: Math.round((checks.filter((check) => check.complete).length / checks.length) * 100),
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
    checks,
  };
};

export const getNextAction = (project: Project) => {
  const readiness = getReadiness(project);
  if (!project.lyrics.trim()) return 'Paste or write lyrics to give the session a creative center.';
  if (!project.selectedBeatName) return 'Choose a beat direction in Producer Lab.';
  if (!project.stems.length) return 'Generate or upload stems so the song can move into recording and mix.';
  if (!(project.activeTakeId || project.recordingTakes?.some((take) => take.selected))) return 'Select the best vocal take before sending the session forward.';
  if (project.status !== 'Mixing' && project.status !== 'Released') return 'Send the song to Engineer Mode for visual mixing and master decisions.';
  if (readiness.score < 100) return 'Finish the release checklist and export package.';
  return 'The song cycle is healthy — prepare the release package or continue refining the master.';
};
