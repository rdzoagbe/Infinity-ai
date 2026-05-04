import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Circle,
  ClipboardCheck,
  Disc3,
  FileAudio,
  FileText,
  Gauge,
  GitBranch,
  Layers3,
  ListChecks,
  Mic2,
  Music2,
  PackageCheck,
  PencilLine,
  RadioTower,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react';
import type { ArrangementSection, LifecycleStageId, Project, ReleaseChecklist, Stem, WorkspaceMode } from '../types';
import { clamp, createHistoryEvent, defaultArrangementSections, defaultReleaseChecklist, updateStem } from '../utils';

interface StudioCycleProps {
  project: Project;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onProjectChange: (patch: Partial<Project>) => void;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl';
const inputClass = 'w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan/35';
const smallButton = 'rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-cyan/30 hover:text-cyan';

const lifecycleSteps: Array<{ id: LifecycleStageId; label: string; owner: string; icon: typeof PencilLine }> = [
  { id: 'idea', label: 'Idea', owner: 'Artist', icon: Sparkles },
  { id: 'lyrics', label: 'Lyrics', owner: 'Artist', icon: FileText },
  { id: 'demo', label: 'Demo Vocal', owner: 'Artist', icon: Mic2 },
  { id: 'beat', label: 'Beat', owner: 'Producer', icon: Music2 },
  { id: 'arrangement', label: 'Arrangement', owner: 'Producer', icon: GitBranch },
  { id: 'recording', label: 'Recording', owner: 'Artist', icon: FileAudio },
  { id: 'mix', label: 'Mix', owner: 'Engineer', icon: SlidersHorizontal },
  { id: 'master', label: 'Master', owner: 'Engineer', icon: Disc3 },
  { id: 'release', label: 'Release', owner: 'System', icon: PackageCheck },
];

const masterPresets = ['Streaming Loud', 'Club Master', 'Radio Ready', 'Warm Analog', 'Clean Vocal', 'Bass Heavy'];
const keyOptions = ['C major', 'D minor', 'E minor', 'F minor', 'F major', 'G minor', 'A minor', 'A-flat minor', 'B-flat major'];
const moodOptions = ['Confident, emotional, radio-ready', 'Warm, intimate, late-night', 'Energetic, club-ready, bright', 'Dark, cinematic, bass-heavy', 'Calm, reflective, night drive'];
const energyOptions: ArrangementSection['energy'][] = ['Low', 'Medium', 'High', 'Peak'];

const completeClass = 'border-cyan/25 bg-cyan/10 text-cyan shadow-cyan';
const pendingClass = 'border-white/5 bg-black/25 text-white/45';

function buildStageState(project: Project): Record<LifecycleStageId, boolean> {
  const hasLyrics = project.lyrics.trim().length > 0;
  const hasVocal = project.stems.some((stem) => stem.kind === 'vocal');
  const hasBeat = project.stems.some((stem) => stem.kind === 'beat') || Boolean(project.selectedBeatName);
  const release = project.releaseChecklist ?? defaultReleaseChecklist();
  const releaseReady = Object.values(release).every(Boolean);

  return {
    idea: true,
    lyrics: hasLyrics,
    demo: hasVocal,
    beat: hasBeat,
    arrangement: Boolean(project.arrangementSections?.length || project.arrangement),
    recording: hasVocal || project.stems.length >= 2,
    mix: project.status === 'Mixing' || project.status === 'Released',
    master: Boolean(project.aiMasterUrl || project.rawMasterUrl || release.master),
    release: releaseReady || project.status === 'Released',
  };
}

function statusForLane(project: Project, lane: 'artist' | 'producer' | 'engineer') {
  const hasLyrics = project.lyrics.trim().length > 0;
  const hasBeat = project.stems.some((stem) => stem.kind === 'beat') || Boolean(project.selectedBeatName);
  const hasVocal = project.stems.some((stem) => stem.kind === 'vocal');
  const release = project.releaseChecklist ?? defaultReleaseChecklist();

  if (lane === 'artist') {
    return [
      { label: 'Lyrics / topline', done: hasLyrics },
      { label: 'Reference direction', done: Boolean(project.referenceTrack?.trim()) },
      { label: 'Demo vocal or upload', done: hasVocal },
    ];
  }
  if (lane === 'producer') {
    return [
      { label: 'Genre + beat selected', done: Boolean(project.selectedGenreId && project.selectedBeatName) },
      { label: 'Beat stem rendered', done: hasBeat },
      { label: 'Arrangement brief', done: Boolean(project.arrangement || project.arrangementSections?.length) },
    ];
  }
  return [
    { label: 'Mix session opened', done: project.status === 'Mixing' || project.status === 'Released' },
    { label: 'Master preset selected', done: Boolean(project.masterPreset) },
    { label: 'Release package', done: Object.values(release).every(Boolean) },
  ];
}

function laneMode(lane: 'artist' | 'producer' | 'engineer'): WorkspaceMode {
  return lane === 'artist' ? 'artist' : lane === 'producer' ? 'producer' : 'engineer';
}

export default function StudioCycle({ project, mode, onModeChange, onProjectChange }: StudioCycleProps) {
  const stages = buildStageState(project);
  const completedStages = lifecycleSteps.filter((step) => stages[step.id]).length;
  const progress = Math.round((completedStages / lifecycleSteps.length) * 100);
  const arrangementSections = project.arrangementSections?.length ? project.arrangementSections : defaultArrangementSections();
  const releaseChecklist = project.releaseChecklist ?? defaultReleaseChecklist({ lyrics: project.lyrics.trim().length > 0, stems: project.stems.length > 0 });
  const history = project.sessionHistory?.length ? project.sessionHistory : [createHistoryEvent('Studio cycle opened.', 'System')];

  const patchWithHistory = (patch: Partial<Project>, message: string, actor: 'Artist' | 'Producer' | 'Engineer' | 'System' = 'System') => {
    onProjectChange({
      ...patch,
      sessionHistory: [createHistoryEvent(message, actor), ...history].slice(0, 10),
    });
  };

  const updateSongDna = (patch: Partial<Project>, message: string) => patchWithHistory(patch, message, 'Producer');

  const updateSection = (sectionId: string, patch: Partial<ArrangementSection>) => {
    const nextSections = arrangementSections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section));
    patchWithHistory({ arrangementSections: nextSections, arrangement: nextSections.map((section) => section.name).join(' · ') }, 'Arrangement map updated.', 'Producer');
  };

  const resetArrangement = () => {
    const nextSections = defaultArrangementSections();
    patchWithHistory({ arrangementSections: nextSections, arrangement: nextSections.map((section) => section.name).join(' · ') }, 'Arrangement rebuilt from default song form.', 'Producer');
  };

  const updateStemSetting = (stem: Stem, patch: Partial<Stem>) => {
    onProjectChange({ stems: updateStem(project.stems, { ...stem, ...patch }) });
  };

  const updateChecklist = (key: keyof ReleaseChecklist) => {
    const next = { ...releaseChecklist, [key]: !releaseChecklist[key] };
    const releaseReady = Object.values(next).every(Boolean);
    patchWithHistory(
      { releaseChecklist: next, status: releaseReady ? 'Released' : project.status },
      releaseReady ? 'Release package checklist completed.' : `Release checklist updated: ${key}.`,
      'System',
    );
  };

  return (
    <section className="grid gap-5">
      <div className={panel}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan">
              <ListChecks className="h-3.5 w-3.5" /> v4 Complete Studio Cycle
            </div>
            <h2 className="text-2xl font-semibold md:text-3xl">Idea → lyrics → producer → engineer → release package</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              A guided lifecycle wraps the three role tabs so each session has clear tasks, owners, musical metadata, arrangement, mix controls, and release readiness.
            </p>
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-right">
            <p className="text-xs uppercase tracking-[0.28em] text-white/35">Song completion</p>
            <p className="mt-1 text-4xl font-semibold text-cyan">{progress}%</p>
            <div className="mt-3 h-2 w-44 overflow-hidden rounded-full bg-white/10">
              <motion.span className="block h-full rounded-full bg-cyan" animate={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {lifecycleSteps.map((step) => {
            const done = stages[step.id];
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onModeChange(step.owner === 'Producer' ? 'producer' : step.owner === 'Engineer' ? 'engineer' : 'artist')}
                className={`rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 ${done ? completeClass : pendingClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <step.icon className="h-4 w-4" />
                  {done ? <BadgeCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <p className="mt-3 text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-55">{step.owner}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-magenta">Session Room</p>
              <h3 className="mt-2 text-xl font-semibold">Role lanes and approvals</h3>
            </div>
            <Users className="h-6 w-6 text-magenta" />
          </div>

          <div className="mt-5 grid gap-3">
            {(['artist', 'producer', 'engineer'] as const).map((lane) => {
              const laneItems = statusForLane(project, lane);
              const laneReady = laneItems.every((item) => item.done);
              return (
                <button
                  type="button"
                  key={lane}
                  onClick={() => onModeChange(laneMode(lane))}
                  className={`rounded-3xl border p-4 text-left transition hover:border-cyan/30 ${mode === laneMode(lane) ? 'border-cyan/25 bg-cyan/10' : 'border-white/5 bg-black/20'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold capitalize">{lane}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/35">{laneReady ? 'Lane ready' : 'Needs attention'}</p>
                    </div>
                    {laneReady ? <BadgeCheck className="h-5 w-5 text-cyan" /> : <ClipboardCheck className="h-5 w-5 text-white/35" />}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {laneItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm text-white/55">
                        {item.done ? <BadgeCheck className="h-4 w-4 text-cyan" /> : <Circle className="h-4 w-4 text-white/25" />}
                        {item.label}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan">Song DNA</p>
              <h3 className="mt-2 text-xl font-semibold">BPM, key, mood and reference direction</h3>
            </div>
            <Gauge className="h-6 w-6 text-cyan" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm text-white/55">
              BPM
              <input
                className={inputClass}
                type="number"
                min={50}
                max={200}
                value={project.bpm ?? 104}
                onChange={(event) => updateSongDna({ bpm: Number(event.target.value) }, `BPM set to ${event.target.value}.`)}
              />
            </label>
            <label className="grid gap-2 text-sm text-white/55">
              Key
              <select className={inputClass} value={project.songKey ?? 'F minor'} onChange={(event) => updateSongDna({ songKey: event.target.value }, `Song key set to ${event.target.value}.`)}>
                {keyOptions.map((key) => <option key={key}>{key}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/55">
              Mood
              <select className={inputClass} value={project.mood ?? moodOptions[0]} onChange={(event) => updateSongDna({ mood: event.target.value }, 'Mood direction updated.')}>
                {moodOptions.map((moodItem) => <option key={moodItem}>{moodItem}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/55">
              Master preset
              <select className={inputClass} value={project.masterPreset ?? masterPresets[0]} onChange={(event) => updateSongDna({ masterPreset: event.target.value }, `Master preset selected: ${event.target.value}.`)}>
                {masterPresets.map((preset) => <option key={preset}>{preset}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm text-white/55">
            Reference track / creative direction
            <input
              className={inputClass}
              value={project.referenceTrack ?? ''}
              onChange={(event) => updateSongDna({ referenceTrack: event.target.value }, 'Reference direction updated.')}
              placeholder="Example: Burna Boy-style percussion, wide backing vocals, vocal upfront"
            />
          </label>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className={panel}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan">Arrangement Builder</p>
              <h3 className="mt-2 text-xl font-semibold">Visual song structure</h3>
            </div>
            <button type="button" className={smallButton} onClick={resetArrangement}>
              <RotateCcw className="mr-2 inline h-3.5 w-3.5" /> Reset structure
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {arrangementSections.map((section, index) => (
              <div key={section.id} className="grid gap-3 rounded-3xl border border-white/5 bg-black/25 p-4 lg:grid-cols-[1.2fr_0.7fr_0.9fr_2fr]">
                <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-white/35">
                  Section {index + 1}
                  <input className={inputClass} value={section.name} onChange={(event) => updateSection(section.id, { name: event.target.value })} />
                </label>
                <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-white/35">
                  Bars
                  <input className={inputClass} type="number" min={1} max={32} value={section.bars} onChange={(event) => updateSection(section.id, { bars: Number(event.target.value) })} />
                </label>
                <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-white/35">
                  Energy
                  <select className={inputClass} value={section.energy} onChange={(event) => updateSection(section.id, { energy: event.target.value as ArrangementSection['energy'] })}>
                    {energyOptions.map((energy) => <option key={energy}>{energy}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-white/35">
                  Producer note
                  <input className={inputClass} value={section.note} onChange={(event) => updateSection(section.id, { note: event.target.value })} />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-magenta">Session History</p>
              <h3 className="mt-2 text-xl font-semibold">What happened in the studio</h3>
            </div>
            <Layers3 className="h-6 w-6 text-magenta" />
          </div>
          <div className="mt-5 max-h-[29rem] space-y-3 overflow-auto pr-1 audio-scrollbar">
            {history.map((event) => (
              <div key={event.id} className="rounded-3xl border border-white/5 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-white/35">
                  <span>{event.actor}</span>
                  <span>{event.timestamp}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/65">{event.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan">Stem Manager + Mix Console</p>
              <h3 className="mt-2 text-xl font-semibold">Organize stems before final engineering</h3>
            </div>
            <SlidersHorizontal className="h-6 w-6 text-cyan" />
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-white/5 bg-black/25">
            {project.stems.length === 0 ? (
              <div className="p-6 text-center text-sm text-white/35">No stems yet. Use Producer Mode to render a beat or upload audio stems.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {project.stems.map((stem) => (
                  <div key={stem.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_0.8fr_0.8fr_1.2fr] lg:items-center">
                    <div>
                      <p className="font-semibold">{stem.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{stem.kind} · {stem.fileName ?? 'browser stem'}</p>
                    </div>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Volume
                      <input className="mt-2 w-full accent-cyan" type="range" min={0} max={1} step={0.01} value={stem.gain} onChange={(event) => updateStemSetting(stem, { gain: clamp(Number(event.target.value), 0, 1) })} />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/35">
                      Pan
                      <input className="mt-2 w-full accent-cyan" type="range" min={-1} max={1} step={0.01} value={stem.pan} onChange={(event) => updateStemSetting(stem, { pan: clamp(Number(event.target.value), -1, 1) })} />
                    </label>
                    <audio controls src={stem.url} className="w-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-magenta">Release Package Builder</p>
              <h3 className="mt-2 text-xl font-semibold">Final delivery checklist</h3>
            </div>
            <RadioTower className="h-6 w-6 text-magenta" />
          </div>
          <div className="mt-5 grid gap-3">
            {(Object.keys(releaseChecklist) as Array<keyof ReleaseChecklist>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => updateChecklist(key)}
                className={`flex items-center justify-between rounded-3xl border p-4 text-left transition hover:border-cyan/30 ${releaseChecklist[key] ? completeClass : pendingClass}`}
              >
                <span className="capitalize">{key}</span>
                {releaseChecklist[key] ? <BadgeCheck className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => patchWithHistory({ releaseChecklist: defaultReleaseChecklist({ lyrics: true, stems: true, mix: true, master: true, artwork: true, metadata: true }), status: 'Released' }, 'Release package marked complete.', 'System')}
            className="mt-5 w-full rounded-3xl bg-cyan px-5 py-4 font-semibold text-black shadow-cyan transition hover:scale-[1.01]"
          >
            <WandSparkles className="mr-2 inline h-4 w-4" /> Mark release package complete
          </button>
        </section>
      </div>
    </section>
  );
}
