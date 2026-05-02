export type ProjectStatus = 'Writing' | 'Recording' | 'Producing' | 'Mixing' | 'Released';
export type WorkspaceMode = 'artist' | 'producer' | 'engineer';
export type StemKind = 'vocal' | 'beat' | 'stem' | 'master';

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
}

export interface SongCreationPayload {
  trackName: string;
  lyrics: string;
  selectedGenreId: string;
  selectedBeatName: string;
  prompt?: string;
}
