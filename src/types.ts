export type ProjectStatus = 'Writing' | 'Recording' | 'Producing' | 'Mixing' | 'Released';
export type WorkspaceMode = 'artist' | 'producer' | 'engineer';
export type StemKind = 'vocal' | 'beat' | 'stem' | 'master';
export type LifecycleStageId = 'idea' | 'lyrics' | 'demo' | 'beat' | 'arrangement' | 'recording' | 'mix' | 'master' | 'release';
export type SessionLaneId = 'artist' | 'producer' | 'engineer';

export interface StemPosition {
  x: number;
  y: number;
}

export interface Stem {
  id: string;
  name: string;
  kind: StemKind;
  url: string;
  fileName?: string;
  pan: number;
  gain: number;
  position: StemPosition;
  createdAt: string;
}

export interface ArrangementSection {
  id: string;
  name: string;
  bars: number;
  energy: 'Low' | 'Medium' | 'High' | 'Peak';
  note: string;
}

export interface SessionHistoryEvent {
  id: string;
  timestamp: string;
  actor: 'Artist' | 'Producer' | 'Engineer' | 'System';
  message: string;
}

export interface ReleaseChecklist {
  lyrics: boolean;
  stems: boolean;
  mix: boolean;
  master: boolean;
  artwork: boolean;
  metadata: boolean;
}

export interface Project {
  id: string;
  trackName: string;
  status: ProjectStatus;
  lastEdited: string;
  lyrics: string;
  coWriterSuggestions: string[];
  prompt: string;
  stems: Stem[];
  rawMasterUrl?: string;
  aiMasterUrl?: string;
  selectedGenreId?: string;
  selectedBeatName?: string;
  arrangement?: string;
  producerNotes?: string;
  bpm?: number;
  songKey?: string;
  mood?: string;
  referenceTrack?: string;
  masterPreset?: string;
  arrangementSections?: ArrangementSection[];
  sessionHistory?: SessionHistoryEvent[];
  releaseChecklist?: ReleaseChecklist;
}

export interface SongCreationPayload {
  trackName: string;
  lyrics: string;
  selectedGenreId: string;
  selectedBeatName: string;
  prompt?: string;
}
