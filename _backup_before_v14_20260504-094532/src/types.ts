export type ProjectStatus = 'Writing' | 'Recording' | 'Producing' | 'Mixing' | 'Released';
export type WorkspaceMode = 'artist' | 'producer' | 'engineer';
export type StemKind = 'vocal' | 'beat' | 'stem' | 'master';
export type StemSplitRole = 'vocals' | 'drums' | 'bass' | 'melody' | 'other';
export type LifecycleStageId = 'idea' | 'lyrics' | 'demo' | 'beat' | 'arrangement' | 'recording' | 'mix' | 'master' | 'release';
export type SessionLaneId = 'artist' | 'producer' | 'engineer';
export type ApprovalStatus = 'pending' | 'approved' | 'changes_requested';
export type VersionKind = 'demo' | 'beat' | 'mix' | 'master' | 'release';
export type ExportAssetId = 'wavMaster' | 'mp3Preview' | 'stemsZip' | 'instrumental' | 'acapella' | 'lyricsPdf' | 'releaseNotes';

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
  muted?: boolean;
  solo?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  trimStart?: number;
  trimEnd?: number;
  sourceTool?: string;
  splitRole?: StemSplitRole;
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

export interface RecordingTake {
  id: string;
  name: string;
  section: string;
  stemId?: string;
  createdAt: string;
  durationLabel: string;
  rating: number;
  selected: boolean;
  note: string;
}

export interface ApprovalGate {
  id: SessionLaneId | 'final';
  label: string;
  owner: 'Artist' | 'Producer' | 'Engineer' | 'System';
  status: ApprovalStatus;
  note: string;
  updatedAt: string;
}

export interface VersionRecord {
  id: string;
  label: string;
  kind: VersionKind;
  createdAt: string;
  owner: 'Artist' | 'Producer' | 'Engineer' | 'System';
  summary: string;
  stemCount: number;
  approved: boolean;
}

export interface ExportPackage {
  id: string;
  name: string;
  createdAt: string;
  assets: Record<ExportAssetId, boolean>;
  notes: string;
  ready: boolean;
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
  recordingTakes?: RecordingTake[];
  activeTakeId?: string;
  approvals?: ApprovalGate[];
  versionHistory?: VersionRecord[];
  exportPackages?: ExportPackage[];
}

export interface SongCreationPayload {
  trackName: string;
  lyrics: string;
  selectedGenreId: string;
  selectedBeatName: string;
  prompt?: string;
}
