import { motion } from 'framer-motion';
import {
  AudioWaveform,
  Boxes,
  CheckCircle2,
  Disc3,
  DownloadCloud,
  Guitar,
  Layers3,
  MicVocal,
  Music2,
  Piano,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  Volume2,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { GENRES } from '../beatLibrary';
import type { BeatPattern } from '../beatLibrary';
import type { Project, Stem, StemKind, StemSplitRole } from '../types';
import { createHistoryEvent, id, nowLabel, updateStem } from '../utils';

interface CreatorToolsProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
}

type ToolMode = 'mixsplit' | 'sequencer' | 'vocal-chain' | 'packs' | 'stem-widgets';

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';
const inputClass = 'w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan/35';
const smallButton = 'rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-cyan/30 hover:text-cyan';

const tools: Array<{ id: ToolMode; label: string; helper: string; icon: typeof WandSparkles }> = [
  { id: 'mixsplit', label: 'AI MixSplit', helper: 'Split an audio file into vocals, drums, bass, melody, and other.', icon: Layers3 },
  { id: 'sequencer', label: 'Step Sequencer', helper: 'Edit beat patterns like a drum grid.', icon: Piano },
  { id: 'vocal-chain', label: 'Vocal Chain', helper: 'Apply vocal correction and preset chains.', icon: MicVocal },
  { id: 'packs', label: 'Sound Packs', helper: 'Browse loop-kit style production starters.', icon: Boxes },
  { id: 'stem-widgets', label: 'Stem Widgets', helper: 'Fade, trim, mute, solo, and volume controls.', icon: AudioWaveform },
];

const splitRoles: Array<{ role: StemSplitRole; label: string; kind: StemKind; pan: number; gain: number }> = [
  { role: 'vocals', label: 'Vocals', kind: 'vocal', pan: 0, gain: 0.84 },
  { role: 'drums', label: 'Drums', kind: 'beat', pan: -0.05, gain: 0.78 },
  { role: 'bass', label: 'Bass', kind: 'stem', pan: 0, gain: 0.72 },
  { role: 'melody', label: 'Melody', kind: 'stem', pan: 0.18, gain: 0.66 },
  { role: 'other', label: 'Other', kind: 'stem', pan: -0.18, gain: 0.52 },
];

const vocalChains = [
  { name: 'Afrobeat Lead Vocal', tone: 'Bright presence, short plate, gentle pitch correction', settings: ['Pitch 38%', 'De-esser 42%', 'Compression 62%', 'Plate reverb 18%'] },
  { name: 'R&B Smooth Stack', tone: 'Warm compression, stereo doubles, silk delay', settings: ['Pitch 24%', 'Compression 70%', 'Doubles 34%', 'Delay 22%'] },
  { name: 'Drill Vocal Cut', tone: 'Tight, dry, aggressive, forward in the mix', settings: ['Pitch 55%', 'Gate 35%', 'Compression 76%', 'Room 8%'] },
  { name: 'Clean Podcast Voice', tone: 'Dialogue-clean voice treatment for spoken sections', settings: ['Noise cleanup 60%', 'EQ presence 46%', 'Limiter 50%', 'De-esser 52%'] },
];

const soundPacks = [
  { name: 'Afrobeat Starter Kit', genreId: 'afrobeat', content: 'Log drums, shakers, guitar chops, warm bass', icon: Disc3 },
  { name: 'R&B Vocal Textures', genreId: 'rnb', content: 'Pads, doubles, reverse verbs, soft percussion', icon: MicVocal },
  { name: 'Trap 808 Kit', genreId: 'trap', content: '808 slides, hard snares, hats, risers', icon: DownloadCloud },
  { name: 'Lo-Fi Tape Room', genreId: 'lofi', content: 'Dusty drums, tape hiss, mellow keys', icon: Guitar },
];

const clonePattern = (pattern: BeatPattern) => ({
  k: [...pattern.k],
  s: [...pattern.s],
  h: [...pattern.h],
  b: pattern.b.map((value) => (value ? 1 : 0)),
});

const waveformBars = Array.from({ length: 22 }, (_, index) => 22 + ((index * 17) % 54));

const splitStemName = (projectName: string, role: string) => `${projectName} · AI Split ${role}`;

export default function CreatorTools({ project, onProjectChange }: CreatorToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolMode>('mixsplit');
  const [selectedGenreId, setSelectedGenreId] = useState(project.selectedGenreId ?? GENRES[3]?.id ?? GENRES[0].id);
  const selectedGenre = useMemo(() => GENRES.find((genre) => genre.id === selectedGenreId) ?? GENRES[0], [selectedGenreId]);
  const [selectedPatternIndex, setSelectedPatternIndex] = useState(0);
  const [pattern, setPattern] = useState(() => clonePattern(selectedGenre.beats[0]));

  const patchWithHistory = (patch: Partial<Project>, message: string) => {
    onProjectChange({
      ...patch,
      sessionHistory: [createHistoryEvent(message, 'System'), ...(project.sessionHistory ?? [])].slice(0, 12),
    });
  };

  const handleMixSplitUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const generatedStems: Stem[] = splitRoles.map((item, index) => ({
      id: id('stem'),
      name: splitStemName(project.trackName, item.label),
      kind: item.kind,
      splitRole: item.role,
      sourceTool: 'AI MixSplit',
      url,
      fileName: `${file.name.replace(/\.[^/.]+$/, '')}-${item.role}.wav`,
      pan: item.pan,
      gain: item.gain,
      muted: false,
      solo: false,
      fadeIn: 0,
      fadeOut: 0,
      trimStart: 0,
      trimEnd: 0,
      position: { x: 95 + index * 82, y: 110 + index * 18 },
      createdAt: nowLabel(),
    }));

    patchWithHistory(
      {
        stems: [...generatedStems, ...project.stems],
        rawMasterUrl: project.rawMasterUrl ?? url,
        aiMasterUrl: project.aiMasterUrl ?? url,
        status: 'Mixing',
        producerNotes: 'AI MixSplit simulated stem separation created vocals, drums, bass, melody, and other stems for engineering.',
      },
      'AI MixSplit created five separated stems for engineering.',
    );

    event.target.value = '';
  };

  const changeGenre = (genreId: string) => {
    const nextGenre = GENRES.find((genre) => genre.id === genreId) ?? GENRES[0];
    setSelectedGenreId(nextGenre.id);
    setSelectedPatternIndex(0);
    setPattern(clonePattern(nextGenre.beats[0]));
    patchWithHistory({ selectedGenreId: nextGenre.id, selectedBeatName: nextGenre.beats[0].name, bpm: nextGenre.bpm, status: 'Producing' }, `Step Sequencer switched to ${nextGenre.name}.`);
  };

  const changeBeatPattern = (index: number) => {
    const nextBeat = selectedGenre.beats[index] ?? selectedGenre.beats[0];
    setSelectedPatternIndex(index);
    setPattern(clonePattern(nextBeat));
    patchWithHistory({ selectedGenreId: selectedGenre.id, selectedBeatName: nextBeat.name, bpm: selectedGenre.bpm, status: 'Producing' }, `Step Sequencer loaded ${nextBeat.name}.`);
  };

  const toggleStep = (row: keyof ReturnType<typeof clonePattern>, index: number) => {
    setPattern((current) => ({
      ...current,
      [row]: current[row].map((value, step) => (step === index ? (value ? 0 : 1) : value)),
    }));
  };

  const saveSequence = () => {
    const activeSteps = pattern.k.filter(Boolean).length + pattern.s.filter(Boolean).length + pattern.h.filter(Boolean).length + pattern.b.filter(Boolean).length;
    patchWithHistory(
      {
        selectedGenreId: selectedGenre.id,
        selectedBeatName: `Custom ${selectedGenre.name} Sequence`,
        bpm: selectedGenre.bpm,
        arrangement: `Custom step sequence · ${activeSteps} active hits · ${selectedGenre.name} at ${selectedGenre.bpm} BPM`,
        status: 'Producing',
      },
      'Custom step sequence saved as producer direction.',
    );
  };

  const applyVocalChain = (chainName: string) => {
    patchWithHistory(
      {
        masterPreset: chainName,
        producerNotes: `${project.producerNotes ?? ''}\nVocal chain selected: ${chainName}`.trim(),
        status: project.status === 'Writing' ? 'Recording' : project.status,
      },
      `Vocal chain preset applied: ${chainName}.`,
    );
  };

  const applySoundPack = (pack: (typeof soundPacks)[number]) => {
    const genre = GENRES.find((item) => item.id === pack.genreId) ?? selectedGenre;
    patchWithHistory(
      {
        selectedGenreId: genre.id,
        selectedBeatName: genre.beats[0].name,
        bpm: genre.bpm,
        producerNotes: `Sound pack selected: ${pack.name}. Includes ${pack.content}.`,
        status: 'Producing',
      },
      `Sound pack loaded: ${pack.name}.`,
    );
  };

  const updateStemSetting = (stem: Stem, patch: Partial<Stem>) => {
    onProjectChange({ stems: updateStem(project.stems, { ...stem, ...patch }) });
  };

  return (
    <section className={panel}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
            <Sparkles className="h-3.5 w-3.5" /> v8 Creator Tools & Stem Intelligence
          </p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl">DAW-inspired tools without losing the guided song cycle</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/50">
            Inspired by professional workstation features: AI stem separation, step sequencing, vocal correction chains, sound packs, and direct audio-part controls.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {tools.map((tool) => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`rounded-3xl border p-4 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 shadow-cyan' : 'border-white/5 bg-black/25 hover:border-cyan/25'}`}
            >
              <tool.icon className={`h-5 w-5 ${active ? 'text-cyan' : 'text-white/40'}`} />
              <p className="mt-3 font-semibold">{tool.label}</p>
              <p className="mt-1 text-xs leading-5 text-white/40">{tool.helper}</p>
            </button>
          );
        })}
      </div>

      {activeTool === 'mixsplit' && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed border-cyan/25 bg-cyan/5 p-6 text-center transition hover:border-cyan/50 hover:bg-cyan/10">
            <UploadCloud className="h-10 w-10 text-cyan" />
            <p className="mt-4 text-xl font-semibold">Upload a full song for AI MixSplit</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/45">This MVP simulates stem separation and creates editable stem lanes for vocals, drums, bass, melody, and other.</p>
            <input type="file" accept="audio/*" className="hidden" onChange={handleMixSplitUpload} />
          </label>
          <div className="rounded-[2rem] border border-white/5 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-magenta">Split targets</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {splitRoles.map((item) => (
                <div key={item.role} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{item.kind} · pan {item.pan} · gain {Math.round(item.gain * 100)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTool === 'sequencer' && (
        <div className="mt-6 rounded-[2rem] border border-white/5 bg-black/25 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-white/50">Genre
              <select className={inputClass} value={selectedGenreId} onChange={(event) => changeGenre(event.target.value)}>
                {GENRES.map((genre) => <option key={genre.id} value={genre.id}>{genre.emoji} {genre.name} · {genre.bpm} BPM</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/50">Pattern
              <select className={inputClass} value={selectedPatternIndex} onChange={(event) => changeBeatPattern(Number(event.target.value))}>
                {selectedGenre.beats.map((beat, index) => <option key={beat.name} value={index}>{beat.name}</option>)}
              </select>
            </label>
            <button type="button" className="self-end rounded-2xl bg-cyan px-4 py-3 font-semibold text-black shadow-cyan" onClick={saveSequence}>
              Save sequence to Producer
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {([
              ['k', 'Kick'],
              ['s', 'Snare'],
              ['h', 'Hat'],
              ['b', 'Bass'],
            ] as Array<[keyof ReturnType<typeof clonePattern>, string]>).map(([row, label]) => (
              <div key={row} className="grid gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 md:grid-cols-[6rem_1fr] md:items-center">
                <p className="font-semibold">{label}</p>
                <div className="grid grid-cols-16 gap-1">
                  {pattern[row].map((value, index) => (
                    <button
                      key={`${row}-${index}`}
                      type="button"
                      onClick={() => toggleStep(row, index)}
                      className={`h-8 rounded-lg border text-[10px] transition ${value ? 'border-cyan/40 bg-cyan text-black shadow-cyan' : 'border-white/5 bg-black/35 text-white/25 hover:border-cyan/20'}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTool === 'vocal-chain' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {vocalChains.map((chain) => (
            <motion.button
              key={chain.name}
              whileHover={{ y: -4 }}
              type="button"
              onClick={() => applyVocalChain(chain.name)}
              className="rounded-[2rem] border border-white/5 bg-black/25 p-5 text-left transition hover:border-magenta/30 hover:bg-magenta/10"
            >
              <MicVocal className="h-6 w-6 text-magenta" />
              <p className="mt-4 text-lg font-semibold">{chain.name}</p>
              <p className="mt-2 text-sm leading-6 text-white/45">{chain.tone}</p>
              <div className="mt-4 space-y-2">
                {chain.settings.map((setting) => <p key={setting} className="text-xs uppercase tracking-[0.18em] text-white/35">{setting}</p>)}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {activeTool === 'packs' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {soundPacks.map((pack) => (
            <button
              key={pack.name}
              type="button"
              onClick={() => applySoundPack(pack)}
              className="rounded-[2rem] border border-white/5 bg-black/25 p-5 text-left transition hover:border-cyan/30 hover:bg-cyan/10"
            >
              <pack.icon className="h-7 w-7 text-cyan" />
              <p className="mt-4 text-lg font-semibold">{pack.name}</p>
              <p className="mt-2 text-sm leading-6 text-white/45">{pack.content}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-cyan/70">Load into Producer</p>
            </button>
          ))}
        </div>
      )}

      {activeTool === 'stem-widgets' && (
        <div className="mt-6 grid gap-4">
          {project.stems.length === 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-black/25 p-8 text-center">
              <Scissors className="mx-auto h-8 w-8 text-white/30" />
              <p className="mt-4 text-lg font-semibold">No stems yet</p>
              <p className="mt-2 text-sm text-white/45">Use AI MixSplit, generate a beat, or upload stems to unlock waveform widgets.</p>
            </div>
          ) : (
            project.stems.map((stem) => (
              <div key={stem.id} className="rounded-[2rem] border border-white/5 bg-black/25 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{stem.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{stem.kind} · {stem.splitRole ?? 'full stem'} · {stem.sourceTool ?? 'session audio'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={`${smallButton} ${stem.muted ? 'border-magenta/40 text-magenta' : ''}`} onClick={() => updateStemSetting(stem, { muted: !stem.muted })}>Mute</button>
                    <button type="button" className={`${smallButton} ${stem.solo ? 'border-cyan/40 text-cyan' : ''}`} onClick={() => updateStemSetting(stem, { solo: !stem.solo })}>Solo</button>
                  </div>
                </div>

                <div className="mt-5 flex h-24 items-end gap-1 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                  {waveformBars.map((height, index) => (
                    <span key={index} className="flex-1 rounded-t bg-cyan/60" style={{ height: `${stem.muted ? 8 : height}%`, opacity: stem.solo ? 1 : 0.65 }} />
                  ))}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/35"><Volume2 className="h-4 w-4 text-cyan" /> Volume
                    <input type="range" min={0} max={1} step={0.01} value={stem.gain} onChange={(event) => updateStemSetting(stem, { gain: Number(event.target.value) })} />
                  </label>
                  <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/35"><SlidersHorizontal className="h-4 w-4 text-cyan" /> Pan
                    <input type="range" min={-1} max={1} step={0.01} value={stem.pan} onChange={(event) => updateStemSetting(stem, { pan: Number(event.target.value) })} />
                  </label>
                  <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/35">Fade in
                    <input type="range" min={0} max={8} step={0.25} value={stem.fadeIn ?? 0} onChange={(event) => updateStemSetting(stem, { fadeIn: Number(event.target.value) })} />
                  </label>
                  <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/35">Fade out
                    <input type="range" min={0} max={8} step={0.25} value={stem.fadeOut ?? 0} onChange={(event) => updateStemSetting(stem, { fadeOut: Number(event.target.value) })} />
                  </label>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-3 text-xs leading-5 text-white/45">
                    <CheckCircle2 className="mb-2 h-4 w-4 text-cyan" /> Audio-part widgets are stored on the stem metadata for later real DSP integration.
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
