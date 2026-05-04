import { motion } from 'framer-motion';
import {
  AudioWaveform,
  BrainCircuit,
  CheckCircle2,
  Disc3,
  Drum,
  FolderSearch,
  Gauge,
  Layers3,
  MicVocal,
  Music2,
  PackageOpen,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  UploadCloud,
  Volume2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Project, Stem, StemKind, StemSplitRole, WorkspaceMode } from '../types';
import { id, nowLabel } from '../utils';

interface CreatorToolsV8Props {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
  onModeChange: (mode: WorkspaceMode) => void;
}

type StepLane = 'kick' | 'snare' | 'hat' | 'bass';

type VocalPreset = {
  name: string;
  tone: string;
  pitch: number;
  compression: number;
  reverb: number;
  delay: number;
};

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';

const soundPacks = [
  { name: 'Afrobeat Starter Kit', type: 'Drums + Percussion', color: 'border-emerald-300/25 bg-emerald-300/10', contents: 'Shakers, log drum, rim layers, warm bass' },
  { name: 'R&B Vocal Textures', type: 'Vocal Stack', color: 'border-magenta/25 bg-magenta/10', contents: 'Doubles, adlibs, airy pads, soft verbs' },
  { name: 'Trap 808 Kit', type: 'Low-end Kit', color: 'border-cyan/25 bg-cyan/10', contents: '808 slides, hats, snares, risers' },
  { name: 'Lo-Fi Drum Kit', type: 'Dusty Beats', color: 'border-white/10 bg-white/[0.04]', contents: 'Tape hats, vinyl noise, mellow kicks' },
];

const vocalPresets: VocalPreset[] = [
  { name: 'Afrobeat Lead Vocal', tone: 'Bright, forward, rhythmic', pitch: 38, compression: 72, reverb: 28, delay: 36 },
  { name: 'R&B Smooth Vocal', tone: 'Warm, intimate, polished', pitch: 26, compression: 64, reverb: 42, delay: 24 },
  { name: 'Drill Vocal Stack', tone: 'Dark, tight, aggressive', pitch: 48, compression: 78, reverb: 18, delay: 16 },
  { name: 'Podcast Clean Voice', tone: 'Clear, stable, de-essed', pitch: 8, compression: 68, reverb: 6, delay: 0 },
];

const splitTargets: Array<{ role: StemSplitRole; name: string; kind: StemKind; x: number; y: number }> = [
  { role: 'vocals', name: 'AI Split · Vocals', kind: 'vocal', x: 120, y: 90 },
  { role: 'drums', name: 'AI Split · Drums', kind: 'stem', x: 260, y: 130 },
  { role: 'bass', name: 'AI Split · Bass', kind: 'stem', x: 410, y: 180 },
  { role: 'melody', name: 'AI Split · Melody', kind: 'stem', x: 540, y: 130 },
  { role: 'other', name: 'AI Split · Other', kind: 'stem', x: 330, y: 260 },
];

const laneLabels: Record<StepLane, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hat: 'Hat',
  bass: 'Bass',
};

const initialPattern: Record<StepLane, number[]> = {
  kick: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  snare: [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
  hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
  bass: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
};

const createSilentStemUrl = () => URL.createObjectURL(new Blob(['AudioMagic v8 simulated stem placeholder'], { type: 'audio/wav' }));

const updateStem = (stems: Stem[], stemId: string, patch: Partial<Stem>) =>
  stems.map((stem) => (stem.id === stemId ? { ...stem, ...patch } : stem));

const WaveformPreview = ({ seed }: { seed: string }) => {
  const bars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => {
        const code = seed.charCodeAt(index % Math.max(seed.length, 1)) || 8;
        return 18 + ((code + index * 11) % 54);
      }),
    [seed],
  );

  return (
    <div className="flex h-16 items-center gap-1 rounded-2xl border border-white/5 bg-black/25 px-3">
      {bars.map((height, index) => (
        <span key={`${seed}-${index}`} className="w-full rounded-full bg-cyan/60" style={{ height }} />
      ))}
    </div>
  );
};

export default function CreatorToolsV8({ project, onProjectChange, onModeChange }: CreatorToolsV8Props) {
  const [pattern, setPattern] = useState(initialPattern);
  const [activePreset, setActivePreset] = useState(vocalPresets[0]);
  const [selectedPack, setSelectedPack] = useState(soundPacks[0].name);
  const [browserQuery, setBrowserQuery] = useState('');

  const splitStems = project.stems.filter((stem) => stem.sourceTool === 'AI MixSplit');
  const filteredSongLabel = browserQuery.trim() ? `Filtered by “${browserQuery.trim()}”` : 'All songs and sessions';

  const toggleStep = (lane: StepLane, index: number) => {
    setPattern((current) => ({
      ...current,
      [lane]: current[lane].map((value, stepIndex) => (stepIndex === index ? (value ? 0 : 1) : value)),
    }));
  };

  const applyPatternToProject = () => {
    const activeSteps = Object.values(pattern).flat().filter(Boolean).length;
    onProjectChange({
      producerNotes: `v8 Step Sequencer pattern saved with ${activeSteps} active drum/bass steps. Route this groove into Producer Lab for arrangement.`,
      status: 'Producing',
      sessionHistory: [
        ...(project.sessionHistory ?? []),
        { id: id('event'), actor: 'Producer', timestamp: nowLabel(), message: `Step Sequencer groove saved: ${activeSteps} active steps.` },
      ],
    });
    onModeChange('producer');
  };

  const runMixSplit = () => {
    const createdAt = nowLabel();
    const nextStems: Stem[] = splitTargets.map((target) => ({
      id: id('stem'),
      name: target.name,
      kind: target.kind,
      url: createSilentStemUrl(),
      fileName: `${target.role}-split-placeholder.wav`,
      pan: target.role === 'vocals' ? 0 : target.role === 'bass' ? -0.1 : target.role === 'melody' ? 0.22 : 0,
      gain: target.role === 'vocals' ? 0.86 : 0.7,
      position: { x: target.x, y: target.y },
      createdAt,
      sourceTool: 'AI MixSplit',
      splitRole: target.role,
      fadeIn: 0,
      fadeOut: 0,
      trimStart: 0,
      trimEnd: 100,
      muted: false,
      solo: false,
    }));

    onProjectChange({
      stems: [...nextStems, ...project.stems],
      status: 'Mixing',
      rawMasterUrl: project.rawMasterUrl ?? nextStems[0].url,
      aiMasterUrl: project.aiMasterUrl ?? nextStems[0].url,
      sessionHistory: [
        ...(project.sessionHistory ?? []),
        { id: id('event'), actor: 'System', timestamp: createdAt, message: 'AI MixSplit created vocals, drums, bass, melody, and other stem lanes.' },
      ],
    });
    onModeChange('engineer');
  };

  const applyVocalPreset = (preset: VocalPreset) => {
    setActivePreset(preset);
    onProjectChange({
      producerNotes: `${preset.name} vocal chain staged: ${preset.tone}. Pitch ${preset.pitch}%, compression ${preset.compression}%, reverb ${preset.reverb}%, delay ${preset.delay}%.`,
      sessionHistory: [
        ...(project.sessionHistory ?? []),
        { id: id('event'), actor: 'Engineer', timestamp: nowLabel(), message: `Applied vocal chain preset: ${preset.name}.` },
      ],
    });
  };

  const addSoundPack = (packName: string) => {
    const pack = soundPacks.find((item) => item.name === packName) ?? soundPacks[0];
    setSelectedPack(pack.name);
    onProjectChange({
      producerNotes: `${pack.name} loaded into the session library: ${pack.contents}.`,
      sessionHistory: [
        ...(project.sessionHistory ?? []),
        { id: id('event'), actor: 'Producer', timestamp: nowLabel(), message: `Loaded sound pack: ${pack.name}.` },
      ],
    });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <div className={panel}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
              <SplitSquareHorizontal className="h-3.5 w-3.5" /> v8 Creator Tools
            </p>
            <h2 className="mt-3 text-2xl font-semibold">AI MixSplit and stem intelligence</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Inspired by modern DAW workflows: split a full song into musical lanes, then control each stem with waveform, fade, trim, mute, solo, and volume tools.
            </p>
          </div>
          <button type="button" onClick={runMixSplit} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan transition hover:scale-[1.02]">
            <BrainCircuit className="h-4 w-4" /> Run AI MixSplit
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {splitTargets.map((target) => (
            <div key={target.role} className="rounded-2xl border border-white/5 bg-black/25 p-4">
              <Layers3 className="h-5 w-5 text-cyan" />
              <p className="mt-3 font-semibold">{target.role}</p>
              <p className="mt-1 text-xs leading-5 text-white/40">Create an editable {target.kind} lane for remixing, analysis, and engineering.</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {(splitStems.length ? splitStems : project.stems.slice(0, 3)).map((stem) => (
            <div key={stem.id} className="rounded-3xl border border-white/5 bg-black/25 p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_17rem] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1 text-xs text-cyan">{stem.kind}</span>
                    {stem.splitRole && <span className="rounded-full border border-magenta/25 bg-magenta/10 px-3 py-1 text-xs text-magenta">{stem.splitRole}</span>}
                    <p className="font-semibold">{stem.name}</p>
                  </div>
                  <div className="mt-3"><WaveformPreview seed={stem.name} /></div>
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => onProjectChange({ stems: updateStem(project.stems, stem.id, { muted: !stem.muted }) })} className={`rounded-xl border px-3 py-2 text-sm ${stem.muted ? 'border-magenta/35 bg-magenta/10 text-magenta' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>Mute</button>
                    <button type="button" onClick={() => onProjectChange({ stems: updateStem(project.stems, stem.id, { solo: !stem.solo }) })} className={`rounded-xl border px-3 py-2 text-sm ${stem.solo ? 'border-cyan/35 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>Solo</button>
                  </div>
                  <label className="text-xs text-white/40">Volume <input type="range" min="0" max="1" step="0.01" value={stem.gain} onChange={(event) => onProjectChange({ stems: updateStem(project.stems, stem.id, { gain: Number(event.target.value) }) })} className="mt-1 w-full" /></label>
                  <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
                    <label>Fade in <input type="range" min="0" max="12" value={stem.fadeIn ?? 0} onChange={(event) => onProjectChange({ stems: updateStem(project.stems, stem.id, { fadeIn: Number(event.target.value) }) })} className="w-full" /></label>
                    <label>Fade out <input type="range" min="0" max="12" value={stem.fadeOut ?? 0} onChange={(event) => onProjectChange({ stems: updateStem(project.stems, stem.id, { fadeOut: Number(event.target.value) }) })} className="w-full" /></label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!project.stems.length && <div className="rounded-3xl border border-white/5 bg-black/25 p-5 text-sm text-white/45">No stems yet. Run AI MixSplit or generate a beat to create editable audio lanes.</div>}
        </div>
      </div>

      <div className="space-y-5">
        <div className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-magenta/20 bg-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-magenta"><Drum className="h-3.5 w-3.5" /> Step Sequencer</p>
              <h2 className="mt-3 text-2xl font-semibold">Clickable beat grid</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">Build a groove visually, then send it into Producer Lab.</p>
            </div>
            <Music2 className="h-6 w-6 text-cyan" />
          </div>
          <div className="mt-5 space-y-3">
            {(Object.keys(pattern) as StepLane[]).map((lane) => (
              <div key={lane} className="grid grid-cols-[4rem_1fr] items-center gap-3">
                <p className="text-sm text-white/55">{laneLabels[lane]}</p>
                <div className="grid grid-cols-16 gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                  {pattern[lane].map((step, index) => (
                    <button key={`${lane}-${index}`} type="button" onClick={() => toggleStep(lane, index)} className={`h-8 rounded-lg border transition ${step ? 'border-cyan/45 bg-cyan shadow-cyan' : 'border-white/5 bg-white/[0.04] hover:border-cyan/25'}`} aria-label={`${lane} step ${index + 1}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={applyPatternToProject} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 font-semibold text-cyan transition hover:bg-cyan hover:text-black">
            <CheckCircle2 className="h-4 w-4" /> Save groove to Producer Lab
          </button>
        </div>

        <div className={panel}>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan"><MicVocal className="h-3.5 w-3.5" /> VocalTune chain</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {vocalPresets.map((preset) => (
              <button key={preset.name} type="button" onClick={() => applyVocalPreset(preset)} className={`rounded-2xl border p-4 text-left transition ${activePreset.name === preset.name ? 'border-cyan/35 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/20'}`}>
                <p className="font-semibold">{preset.name}</p>
                <p className="mt-1 text-xs leading-5 text-white/45">{preset.tone}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/35">
                  <span>Pitch {preset.pitch}%</span><span>Comp {preset.compression}%</span><span>Verb {preset.reverb}%</span><span>Delay {preset.delay}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/45"><PackageOpen className="h-3.5 w-3.5" /> Sound Packs</p>
              <h2 className="mt-3 text-2xl font-semibold">Loop and sample browser</h2>
            </div>
            <Disc3 className="h-6 w-6 text-magenta" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {soundPacks.map((pack) => (
              <button key={pack.name} type="button" onClick={() => addSoundPack(pack.name)} className={`rounded-2xl border p-4 text-left transition ${selectedPack === pack.name ? 'border-cyan/30 bg-cyan/10' : pack.color}`}>
                <p className="font-semibold">{pack.name}</p>
                <p className="mt-1 text-xs text-white/45">{pack.type}</p>
                <p className="mt-3 text-xs leading-5 text-white/40">{pack.contents}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={panel}>
          <p className="inline-flex items-center gap-2 rounded-full border border-magenta/20 bg-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-magenta"><FolderSearch className="h-3.5 w-3.5" /> Song Browser</p>
          <input value={browserQuery} onChange={(event) => setBrowserQuery(event.target.value)} placeholder="Search by title, BPM, genre, status..." className="mt-4 w-full rounded-2xl border border-white/5 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-cyan/30" />
          <div className="mt-4 rounded-2xl border border-white/5 bg-black/25 p-4">
            <p className="text-sm font-semibold">{filteredSongLabel}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">Library facets: Drafts, Recording, Producing, Mixing, Release Ready, Archived. This becomes the full project browser when persistence is added.</p>
          </div>
        </div>

        <div className={panel}>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan"><AudioWaveform className="h-3.5 w-3.5" /> Mix Analysis</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[{ label: 'Bass energy', value: 72 }, { label: 'Vocal presence', value: 84 }, { label: 'Stereo width', value: 61 }].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <Gauge className="h-4 w-4 text-cyan" />
                <p className="mt-3 text-sm text-white/45">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold">{metric.value}%</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/5 bg-black/25 p-4 text-sm leading-6 text-white/55">
            <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-magenta" />
            Copilot note: keep vocals centered, roll low mud from melody stems, and widen percussion after the second hook.
          </div>
        </div>
      </div>
    </section>
  );
}
