import { motion } from 'framer-motion';
import {
  Bot,
  CheckCircle2,
  DownloadCloud,
  FileAudio,
  Headphones,
  ListChecks,
  Mic2,
  Music2,
  PackageCheck,
  Play,
  Plus,
  RadioTower,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ArrangementSection, Project, ReleaseChecklist, Stem, StemKind, StemSplitRole, WorkspaceMode } from '../types';
import { createHistoryEvent, createVersionRecord, defaultArrangementSections, defaultReleaseChecklist, id, nowLabel } from '../utils';

interface StudioDawV11Props {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
  onOpenRoom: (mode: WorkspaceMode) => void;
}

type ModuleId = 'timeline' | 'beat' | 'chords' | 'mixer' | 'master' | 'library' | 'assistant' | 'release';
type BeatRowId = 'kick' | 'snare' | 'hat' | 'perc' | 'bass';
type BeatPattern = Record<BeatRowId, number[]>;

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';

const modules: Array<{ id: ModuleId; label: string; helper: string; icon: typeof Music2 }> = [
  { id: 'timeline', label: 'Song Timeline', helper: 'Playlist arrangement', icon: ListChecks },
  { id: 'beat', label: 'Beat Builder', helper: 'Channel rack grid', icon: Music2 },
  { id: 'chords', label: 'Chord Builder', helper: 'Key, chords, melody', icon: WandSparkles },
  { id: 'mixer', label: 'Mixer Console', helper: 'Faders and pan', icon: SlidersHorizontal },
  { id: 'master', label: 'AI Mastering', helper: 'Preset polish', icon: Headphones },
  { id: 'library', label: 'Sound Library', helper: 'Loops and packs', icon: UploadCloud },
  { id: 'assistant', label: 'Studio Assistant', helper: 'Engineer guidance', icon: Bot },
  { id: 'release', label: 'Release Room', helper: 'Exports and checklist', icon: PackageCheck },
];

const defaultPattern: BeatPattern = {
  kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  perc: [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1],
  bass: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
};

const beatRows: Array<{ id: BeatRowId; label: string; helper: string }> = [
  { id: 'kick', label: 'Kick', helper: 'Low punch' },
  { id: 'snare', label: 'Snare', helper: 'Backbeat' },
  { id: 'hat', label: 'Hat', helper: 'Motion' },
  { id: 'perc', label: 'Perc', helper: 'Groove' },
  { id: 'bass', label: 'Bass', helper: 'Root movement' },
];

const chordProgressions = [
  { mood: 'Emotional R&B', key: 'F minor', chords: 'Fm7 · Dbmaj7 · Ab · Eb', melody: 'Soft top-line, descending final phrase' },
  { mood: 'Afrobeat Uplift', key: 'A major', chords: 'A · E · F#m · D', melody: 'Call-and-response hook with bright thirds' },
  { mood: 'Dark Drill', key: 'D minor', chords: 'Dm · Bb · Gm · A', melody: 'Sparse minor motif with vocal doubles' },
  { mood: 'Dancehall Club', key: 'G minor', chords: 'Gm · Eb · Bb · F', melody: 'Short repeated hook with syncopated adlibs' },
];

const masterPresets = [
  { name: 'Streaming Loud', helper: 'Balanced loud master for Spotify and Apple Music', loudness: '-10 LUFS', width: 'Wide' },
  { name: 'Club Master', helper: 'Bigger low end and punch for speakers', loudness: '-8 LUFS', width: 'Medium' },
  { name: 'Warm Analog', helper: 'Softer high end, tape-like tone', loudness: '-12 LUFS', width: 'Natural' },
  { name: 'Vocal Forward', helper: 'Clear vocal, controlled bass, present hook', loudness: '-10 LUFS', width: 'Focused' },
];

const soundPacks: Array<{ name: string; helper: string; kind: StemKind; role?: StemSplitRole; frequency: number }> = [
  { name: 'Afro Percussion Loop', helper: 'Shakers, rim, conga pocket', kind: 'stem', role: 'drums', frequency: 176 },
  { name: 'Warm Rhodes Chords', helper: 'Smooth R&B harmonic bed', kind: 'stem', role: 'melody', frequency: 220 },
  { name: '808 Bass Slide', helper: 'Trap and drill low-end layer', kind: 'stem', role: 'bass', frequency: 88 },
  { name: 'Vocal Chop Texture', helper: 'Hook ear-candy for transitions', kind: 'vocal', role: 'vocals', frequency: 330 },
  { name: 'FX Riser Pack', helper: 'Builds into hooks and drops', kind: 'stem', role: 'other', frequency: 440 },
  { name: 'Demo Drum Bus', helper: 'Instant drum stem for mix testing', kind: 'beat', role: 'drums', frequency: 132 },
];

const writeString = (view: DataView, offset: number, text: string) => {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
};

const createDemoWavUrl = (frequency = 220, durationSeconds = 4) => {
  const sampleRate = 44100;
  const samples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples * 2, true);

  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.max(0.04, 1 - index / samples);
    const pulse = index % 11025 < 900 ? Math.sin((2 * Math.PI * 56 * index) / sampleRate) * 0.2 : 0;
    const tone = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.12 * envelope;
    const overtone = Math.sin((2 * Math.PI * frequency * 1.5 * index) / sampleRate) * 0.05 * envelope;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, pulse + tone + overtone)) * 32767, true);
  }

  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
};

const timelineFallback = (): ArrangementSection[] => defaultArrangementSections();
const releaseState = (project: Project): ReleaseChecklist => project.releaseChecklist ?? defaultReleaseChecklist();
const sectionWidth = (bars: number, totalBars: number) => `${Math.max(10, Math.round((bars / Math.max(totalBars, 1)) * 100))}%`;

export default function StudioDawV11({ project, onProjectChange, onOpenRoom }: StudioDawV11Props) {
  const [activeModule, setActiveModule] = useState<ModuleId>('timeline');
  const [beatPattern, setBeatPattern] = useState<BeatPattern>(defaultPattern);
  const [selectedProgression, setSelectedProgression] = useState(chordProgressions[0]);
  const sections = useMemo(() => (project.arrangementSections?.length ? project.arrangementSections : timelineFallback()), [project.arrangementSections]);
  const totalBars = useMemo(() => sections.reduce((sum, section) => sum + section.bars, 0), [sections]);
  const checklist = releaseState(project);

  const patchWithHistory = (patch: Partial<Project>, message: string, owner: 'Artist' | 'Producer' | 'Engineer' | 'System' = 'System') => {
    onProjectChange({
      ...patch,
      sessionHistory: [createHistoryEvent(message, owner), ...(project.sessionHistory ?? [])].slice(0, 14),
    });
  };

  const addGeneratedStem = (name: string, kind: StemKind, sourceTool: string, frequency: number, role?: StemSplitRole) => {
    const url = createDemoWavUrl(frequency);
    const stem: Stem = {
      id: id('stem'),
      name,
      kind,
      url,
      fileName: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`,
      pan: role === 'melody' ? 0.14 : role === 'drums' ? -0.08 : 0,
      gain: kind === 'master' ? 0.86 : 0.74,
      muted: false,
      solo: false,
      sourceTool,
      splitRole: role,
      position: { x: 160 + Math.min(project.stems.length, 4) * 70, y: 135 + Math.min(project.stems.length, 4) * 42 },
      createdAt: nowLabel(),
    };

    patchWithHistory(
      {
        stems: [stem, ...project.stems],
        releaseChecklist: { ...checklist, stems: true },
        status: project.status === 'Writing' ? 'Producing' : project.status,
        versionHistory: [createVersionRecord(`${sourceTool} stem`, kind === 'master' ? 'master' : 'beat', 'Producer', `${name} added from AudioMagic v11.`, project.stems.length + 1), ...(project.versionHistory ?? [])].slice(0, 12),
      },
      `${name} added from ${sourceTool}.`,
      'Producer',
    );
  };

  const toggleStep = (row: BeatRowId, index: number) => {
    setBeatPattern((current) => ({
      ...current,
      [row]: current[row].map((value, currentIndex) => (currentIndex === index ? (value ? 0 : 1) : value)),
    }));
  };

  const saveBeat = () => addGeneratedStem(`${project.trackName} · v11 Channel Rack Beat`, 'beat', 'Beat Builder', 146, 'drums');

  const saveChordProgression = () => {
    patchWithHistory(
      {
        songKey: selectedProgression.key,
        producerNotes: [project.producerNotes, `v11 Chord Builder: ${selectedProgression.mood} · ${selectedProgression.key} · ${selectedProgression.chords}. Melody guide: ${selectedProgression.melody}.`].filter(Boolean).join('\n'),
        versionHistory: [createVersionRecord('Chord progression v11', 'demo', 'Producer', `${selectedProgression.chords} saved as harmonic direction.`, project.stems.length), ...(project.versionHistory ?? [])].slice(0, 12),
      },
      `Chord progression saved: ${selectedProgression.chords}.`,
      'Producer',
    );
  };

  const updateStem = (stemId: string, patch: Partial<Stem>) => {
    onProjectChange({ stems: project.stems.map((stem) => (stem.id === stemId ? { ...stem, ...patch } : stem)) });
  };

  const applyMasterPreset = (preset: (typeof masterPresets)[number]) => {
    const masterUrl = project.aiMasterUrl ?? createDemoWavUrl(260, 5);
    patchWithHistory(
      {
        masterPreset: preset.name,
        aiMasterUrl: masterUrl,
        status: 'Mixing',
        releaseChecklist: { ...checklist, mix: true, master: true },
        versionHistory: [createVersionRecord(`${preset.name} master`, 'master', 'Engineer', `${preset.helper}. Target ${preset.loudness}, ${preset.width} stereo image.`, project.stems.length, false), ...(project.versionHistory ?? [])].slice(0, 12),
      },
      `${preset.name} mastering preset applied.`,
      'Engineer',
    );
  };

  const toggleReleaseItem = (key: keyof ReleaseChecklist) => {
    patchWithHistory({ releaseChecklist: { ...checklist, [key]: !checklist[key] } }, `${key} checklist ${checklist[key] ? 'cleared' : 'completed'}.`, 'System');
  };

  const assistantNotes = [
    project.lyrics.trim() ? 'Lyrics are present. The next artist task is to confirm hook strength and vocal emotion.' : 'Paste lyrics first so the DAW can create structure, hook notes, and a producer brief.',
    project.stems.length > 0 ? `${project.stems.length} stems are available. Balance the vocal first, then drums, bass, and melody.` : 'Generate or add stems from the Full Song Builder, Beat Builder, or Sound Library.',
    project.aiMasterUrl ? 'A master preview exists. Use Release Room to complete exports and metadata.' : 'No master preview yet. Apply an AI Mastering preset after the mix has a clear vocal balance.',
  ];

  return (
    <section className="space-y-5">
      <div className={panel}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan"><Sparkles className="h-3.5 w-3.5" /> AudioMagic v11 DAW Flow</p>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Build the record like a real studio session.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Timeline, channel rack, chord builder, mixer, mastering, sound packs, assistant, and release tools are now in one production layer.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => onOpenRoom('artist')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/65 transition hover:border-cyan/30 hover:text-cyan">Artist Room</button>
            <button type="button" onClick={() => onOpenRoom('producer')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/65 transition hover:border-cyan/30 hover:text-cyan">Producer Lab</button>
            <button type="button" onClick={() => onOpenRoom('engineer')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/65 transition hover:border-cyan/30 hover:text-cyan">Mix Room</button>
          </div>
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {modules.map((module) => {
            const active = activeModule === module.id;
            return (
              <button key={module.id} type="button" onClick={() => setActiveModule(module.id)} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 text-white shadow-cyan' : 'border-white/5 bg-black/25 text-white/50 hover:border-cyan/25 hover:text-white'}`}>
                <module.icon className={active ? 'h-5 w-5 text-cyan' : 'h-5 w-5 text-white/35'} />
                <p className="mt-3 text-sm font-semibold">{module.label}</p>
                <p className="mt-1 text-xs leading-4 text-white/35">{module.helper}</p>
              </button>
            );
          })}
        </div>
      </div>

      {activeModule === 'timeline' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Playlist timeline</p><h3 className="mt-2 text-2xl font-semibold">Full song arrangement</h3><p className="mt-2 text-sm text-white/45">Sections are shown like a DAW playlist so the artist can see the song being built from intro to outro.</p></div>
            <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-3 text-sm text-white/55">{totalBars} total bars · {project.bpm ?? 104} BPM</div>
          </div>
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-white/5 bg-black/25 p-4">
            <div className="flex min-w-[850px] gap-2">
              {sections.map((section) => <div key={section.id} className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4" style={{ width: sectionWidth(section.bars, totalBars) }}><p className="font-semibold text-cyan">{section.name}</p><p className="mt-1 text-xs text-white/45">{section.bars} bars · {section.energy}</p><p className="mt-3 text-xs leading-5 text-white/45">{section.note}</p></div>)}
            </div>
            <div className="mt-5 grid min-w-[850px] gap-2">
              {['Lead vocal', 'Backing vocals', 'Drums', 'Bass', 'Melody / chords', 'FX / master'].map((lane, laneIndex) => <div key={lane} className="grid grid-cols-[8rem_1fr] gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3"><span className="text-sm text-white/45">{lane}</span><div className="flex gap-2">{sections.map((section, index) => <span key={`${lane}-${section.id}`} className={`h-8 rounded-xl border ${project.stems.length > laneIndex || index % 2 === 0 ? 'border-cyan/20 bg-cyan/10' : 'border-white/5 bg-white/[0.03]'}`} style={{ width: sectionWidth(section.bars, totalBars) }} />)}</div></div>)}
            </div>
          </div>
        </div>
      )}

      {activeModule === 'beat' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Channel rack</p><h3 className="mt-2 text-2xl font-semibold">Beat Builder</h3><p className="mt-2 text-sm text-white/45">Toggle steps and save the beat as a project stem.</p></div><button type="button" onClick={saveBeat} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan"><Plus className="h-4 w-4" /> Save beat stem</button></div>
          <div className="mt-6 space-y-3">
            {beatRows.map((row) => <div key={row.id} className="grid gap-3 rounded-2xl border border-white/5 bg-black/25 p-3 lg:grid-cols-[8rem_1fr]"><div><p className="font-semibold">{row.label}</p><p className="text-xs text-white/35">{row.helper}</p></div><div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>{beatPattern[row.id].map((value, index) => <button key={`${row.id}-${index}`} type="button" onClick={() => toggleStep(row.id, index)} className={`h-10 rounded-xl border text-xs font-semibold transition ${value ? 'border-cyan/40 bg-cyan text-black shadow-cyan' : 'border-white/5 bg-white/[0.03] text-white/25 hover:border-cyan/25'}`}>{index + 1}</button>)}</div></div>)}
          </div>
        </div>
      )}

      {activeModule === 'chords' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-magenta">Chord and melody builder</p><h3 className="mt-2 text-2xl font-semibold">Give the producer harmonic direction.</h3><p className="mt-2 text-sm text-white/45">Choose a mood and save chords, key, and melody guide to the producer notes.</p></div><button type="button" onClick={saveChordProgression} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-magenta px-5 py-3 font-semibold text-black shadow-magenta"><WandSparkles className="h-4 w-4" /> Save chords</button></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{chordProgressions.map((progression) => { const active = selectedProgression.mood === progression.mood; return <button key={progression.mood} type="button" onClick={() => setSelectedProgression(progression)} className={`rounded-3xl border p-5 text-left transition ${active ? 'border-magenta/35 bg-magenta/10' : 'border-white/5 bg-black/25 hover:border-magenta/25'}`}><p className="text-lg font-semibold">{progression.mood}</p><p className="mt-2 text-sm text-cyan">{progression.key}</p><p className="mt-4 text-xl font-semibold">{progression.chords}</p><p className="mt-3 text-sm leading-6 text-white/45">{progression.melody}</p></button>; })}</div>
        </div>
      )}

      {activeModule === 'mixer' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Mixer console</p><h3 className="mt-2 text-2xl font-semibold">Balance the generated stems.</h3><p className="mt-2 text-sm text-white/45">Adjust volume, pan, mute, and solo like a simple engineer mix desk.</p></div><button type="button" onClick={() => onOpenRoom('engineer')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-5 py-3 font-semibold text-cyan"><SlidersHorizontal className="h-4 w-4" /> Open Mix Room</button></div>
          <div className="mt-6 grid gap-3">{project.stems.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-8 text-center text-white/40">No stems yet. Generate a full song draft, save a beat, or add sounds from the library.</div> : project.stems.map((stem) => <div key={stem.id} className="grid gap-4 rounded-3xl border border-white/5 bg-black/25 p-4 xl:grid-cols-[1fr_12rem_12rem_10rem]"><div><p className="font-semibold">{stem.name}</p><p className="mt-1 text-xs text-white/35">{stem.kind} · {stem.sourceTool ?? 'Project stem'} · {stem.createdAt}</p></div><label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-white/35">Volume<input type="range" min="0" max="1.2" step="0.01" value={stem.gain} onChange={(event) => updateStem(stem.id, { gain: Number(event.target.value) })} /></label><label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-white/35">Pan<input type="range" min="-1" max="1" step="0.01" value={stem.pan} onChange={(event) => updateStem(stem.id, { pan: Number(event.target.value) })} /></label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => updateStem(stem.id, { muted: !stem.muted })} className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${stem.muted ? 'border-magenta/35 bg-magenta/10 text-magenta' : 'border-white/5 bg-white/[0.03] text-white/50'}`}>Mute</button><button type="button" onClick={() => updateStem(stem.id, { solo: !stem.solo })} className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${stem.solo ? 'border-cyan/35 bg-cyan/10 text-cyan' : 'border-white/5 bg-white/[0.03] text-white/50'}`}>Solo</button></div></div>)}</div>
        </div>
      )}

      {activeModule === 'master' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">AI mastering room</p><h3 className="mt-2 text-2xl font-semibold">Apply a master direction.</h3><p className="mt-2 text-sm text-white/45">This creates a master preview state and marks mix/master progress for the release room.</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{masterPresets.map((preset) => <button key={preset.name} type="button" onClick={() => applyMasterPreset(preset)} className={`rounded-3xl border p-5 text-left transition ${project.masterPreset === preset.name ? 'border-cyan/35 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/25'}`}><Headphones className="h-5 w-5 text-cyan" /><p className="mt-4 text-lg font-semibold">{preset.name}</p><p className="mt-2 text-sm leading-6 text-white/45">{preset.helper}</p><p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/35">{preset.loudness} · {preset.width}</p></button>)}</div>
          {project.aiMasterUrl && <audio controls src={project.aiMasterUrl} className="mt-5 w-full" />}
        </div>
      )}

      {activeModule === 'library' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-magenta">Sound library</p><h3 className="mt-2 text-2xl font-semibold">Add starter sounds to the session.</h3><p className="mt-2 text-sm text-white/45">Mock royalty-free packs for the MVP. Later this can connect to storage or a sound marketplace.</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{soundPacks.map((pack) => <button key={pack.name} type="button" onClick={() => addGeneratedStem(`${project.trackName} · ${pack.name}`, pack.kind, 'Sound Library', pack.frequency, pack.role)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left transition hover:border-magenta/30 hover:bg-magenta/10"><FileAudio className="h-5 w-5 text-magenta" /><p className="mt-4 text-lg font-semibold">{pack.name}</p><p className="mt-2 text-sm leading-6 text-white/45">{pack.helper}</p><p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/35">Add as {pack.kind}</p></button>)}</div>
        </div>
      )}

      {activeModule === 'assistant' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Studio assistant</p><h3 className="mt-2 text-2xl font-semibold">What a sound engineer would check next.</h3></div>
          <div className="mt-6 grid gap-3">{assistantNotes.map((note) => <div key={note} className="flex gap-3 rounded-3xl border border-white/5 bg-black/25 p-4"><Bot className="mt-0.5 h-5 w-5 shrink-0 text-cyan" /><p className="text-sm leading-6 text-white/60">{note}</p></div>)}</div>
          <div className="mt-5 rounded-3xl border border-magenta/20 bg-magenta/10 p-4 text-sm leading-6 text-white/65"><span className="font-semibold text-magenta">Engineer rule:</span> build the song in order: lyric intent, vocal clarity, drum pocket, bass translation, stereo width, master loudness, then exports.</div>
        </div>
      )}

      {activeModule === 'release' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Release room</p><h3 className="mt-2 text-2xl font-semibold">Prepare deliverables.</h3><p className="mt-2 text-sm text-white/45">Track the assets an artist needs before distribution.</p></div><button type="button" onClick={() => patchWithHistory({ status: 'Released', releaseChecklist: defaultReleaseChecklist({ lyrics: true, stems: true, mix: true, master: true, artwork: true, metadata: true }) }, 'Release package marked complete.', 'System')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan"><RadioTower className="h-4 w-4" /> Mark release-ready</button></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(Object.keys(checklist) as Array<keyof ReleaseChecklist>).map((key) => <button key={key} type="button" onClick={() => toggleReleaseItem(key)} className={`rounded-3xl border p-5 text-left transition ${checklist[key] ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/25'}`}><CheckCircle2 className={checklist[key] ? 'h-5 w-5 text-cyan' : 'h-5 w-5 text-white/30'} /><p className="mt-4 text-lg font-semibold capitalize">{key}</p><p className="mt-2 text-sm text-white/40">{checklist[key] ? 'Completed' : 'Pending'}</p></button>)}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-3"><button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60"><DownloadCloud className="h-4 w-4" /> Export WAV</button><button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60"><DownloadCloud className="h-4 w-4" /> Export MP3</button><button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60"><DownloadCloud className="h-4 w-4" /> Export stems ZIP</button></div>
        </div>
      )}
    </section>
  );
}
