import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  DownloadCloud,
  FileAudio,
  Headphones,
  ListChecks,
  Loader2,
  Mic2,
  Music2,
  PackageCheck,
  Pause,
  Play,
  RadioTower,
  SlidersHorizontal,
  Sparkles,
  Square,
  UploadCloud,
  Volume2,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project, ReleaseChecklist, Stem, StemKind, StemSplitRole, WorkspaceMode } from '../types';
import {
  createHistoryEvent,
  createRecordingTake,
  createVersionRecord,
  defaultArrangementSections,
  defaultReleaseChecklist,
  id,
  nowLabel,
} from '../utils';

interface StudioCoreV12Props {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
  onOpenRoom: (mode: WorkspaceMode) => void;
}

type StudioRole = 'artist' | 'producer' | 'engineer';
type GenerateStepId = 'idle' | 'lyrics' | 'arrangement' | 'beat' | 'voice' | 'stems' | 'master' | 'done';

type RoleConfig = {
  id: StudioRole;
  label: string;
  headline: string;
  helper: string;
  icon: typeof Mic2;
};

const roleConfigs: RoleConfig[] = [
  {
    id: 'artist',
    label: 'Artist',
    headline: 'Write, record, generate, and play the song draft.',
    helper: 'Simple workflow: lyrics, voice, style, generate song, send to producer.',
    icon: Mic2,
  },
  {
    id: 'producer',
    label: 'Producer',
    headline: 'Shape the arrangement, beat, harmony, and handoff.',
    helper: 'Work on song sections, beat direction, chord ideas, stems, and producer notes.',
    icon: Music2,
  },
  {
    id: 'engineer',
    label: 'Sound Engineer',
    headline: 'Mix stems, master preview, and prepare exports.',
    helper: 'Control gain, pan, mute, solo, master preset, release checklist, and deliverables.',
    icon: SlidersHorizontal,
  },
];

const generateSteps: Array<{ id: GenerateStepId; label: string; helper: string }> = [
  { id: 'lyrics', label: 'Analyzing lyrics', helper: 'Mood, density, hook, and song intention.' },
  { id: 'arrangement', label: 'Building arrangement', helper: 'Intro, verses, hooks, bridge, and outro.' },
  { id: 'beat', label: 'Creating beat direction', helper: 'Drums, bass, chord bed, and groove.' },
  { id: 'voice', label: 'Preparing vocal guide', helper: 'Lead vocal guide and cloned-voice placeholder.' },
  { id: 'stems', label: 'Generating stems', helper: 'Vocal, drums, bass, chords, melody, FX.' },
  { id: 'master', label: 'Creating master preview', helper: 'Rough master for playback and engineering.' },
  { id: 'done', label: 'Done', helper: 'Ready for producer and engineer review.' },
];

const masterPresets = [
  { name: 'Vocal Forward', helper: 'Lead vocal clear, controlled bass, bright hook.', frequency: 260 },
  { name: 'Streaming Loud', helper: 'Balanced loudness for modern streaming.', frequency: 330 },
  { name: 'Club Master', helper: 'Punchier low end and stronger transients.', frequency: 196 },
  { name: 'Warm Analog', helper: 'Smoother top end with warm body.', frequency: 220 },
];

const sectionColors: Record<string, string> = {
  Low: 'border-white/10 bg-white/[0.04]',
  Medium: 'border-cyan/20 bg-cyan/10',
  High: 'border-magenta/20 bg-magenta/10',
  Peak: 'border-cyan/40 bg-cyan/15 shadow-cyan',
};

const writeString = (view: DataView, offset: number, text: string) => {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
};

const createDemoWavUrl = (frequency = 220, durationSeconds = 5) => {
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
    const kick = index % 22050 < 2200 ? Math.sin((2 * Math.PI * 56 * index) / sampleRate) * 0.22 : 0;
    const tone = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.12 * envelope;
    const harmony = Math.sin((2 * Math.PI * frequency * 1.5 * index) / sampleRate) * 0.06 * envelope;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, kick + tone + harmony)) * 32767, true);
  }

  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
};

const safeChecklist = (project: Project): ReleaseChecklist => project.releaseChecklist ?? defaultReleaseChecklist();

const createStem = (
  trackName: string,
  label: string,
  kind: StemKind,
  role: StemSplitRole | undefined,
  sourceTool: string,
  frequency: number,
  gain: number,
  pan: number,
): Stem => {
  const url = createDemoWavUrl(frequency);
  return {
    id: id('stem'),
    name: `${trackName} · ${label}`,
    kind,
    url,
    fileName: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`,
    pan,
    gain,
    muted: false,
    solo: false,
    sourceTool,
    splitRole: role,
    position: { x: 160 + Math.round(Math.random() * 220), y: 120 + Math.round(Math.random() * 220) },
    createdAt: nowLabel(),
  };
};

const buildStudioStems = (trackName: string) => [
  createStem(trackName, 'Lead Vocal Guide', 'vocal', 'vocals', 'v12 Song Generator', 260, 0.92, 0),
  createStem(trackName, 'Backing Vocal Stack', 'vocal', 'vocals', 'v12 Song Generator', 330, 0.72, 0.12),
  createStem(trackName, 'Drum Groove', 'beat', 'drums', 'v12 Song Generator', 146, 0.82, -0.08),
  createStem(trackName, 'Bass Foundation', 'stem', 'bass', 'v12 Song Generator', 82, 0.78, 0),
  createStem(trackName, 'Chord Bed', 'stem', 'melody', 'v12 Song Generator', 220, 0.68, 0.16),
  createStem(trackName, 'Melody Hook', 'stem', 'melody', 'v12 Song Generator', 392, 0.66, -0.14),
  createStem(trackName, 'FX Transitions', 'stem', 'other', 'v12 Song Generator', 520, 0.48, 0.2),
  createStem(trackName, 'Master Preview', 'master', undefined, 'v12 Song Generator', 196, 0.86, 0),
];

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function StudioCoreV12({ project, onProjectChange, onOpenRoom }: StudioCoreV12Props) {
  const [role, setRole] = useState<StudioRole>('artist');
  const [draftLyrics, setDraftLyrics] = useState(project.lyrics);
  const [style, setStyle] = useState(project.mood || 'Afrobeat, emotional, radio-ready');
  const [voiceMode, setVoiceMode] = useState<'record' | 'clone'>('clone');
  const [generateStep, setGenerateStep] = useState<GenerateStepId>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState(project.aiMasterUrl || project.rawMasterUrl || project.stems[0]?.url || '');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeRole = roleConfigs.find((item) => item.id === role) ?? roleConfigs[0];
  const sections = project.arrangementSections?.length ? project.arrangementSections : defaultArrangementSections();
  const checklist = safeChecklist(project);
  const masterStem = project.stems.find((stem) => stem.kind === 'master') ?? project.stems[0];
  const selectedStepIndex = generateSteps.findIndex((step) => step.id === generateStep);
  const selectedSection = sections[Math.min(Math.floor((currentTime / 180) * sections.length), Math.max(0, sections.length - 1))];

  const readiness = useMemo(() => {
    const checks = [
      draftLyrics.trim().length > 0 || project.lyrics.trim().length > 0,
      project.stems.some((stem) => stem.kind === 'vocal'),
      project.stems.some((stem) => stem.kind === 'beat' || stem.splitRole === 'drums'),
      project.stems.some((stem) => stem.splitRole === 'bass'),
      Boolean(project.aiMasterUrl || project.stems.some((stem) => stem.kind === 'master')),
      Object.values(checklist).filter(Boolean).length >= 4,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [checklist, draftLyrics, project.aiMasterUrl, project.lyrics, project.stems]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setCurrentTime((value) => (value >= 180 ? 0 : value + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const patchWithHistory = (patch: Partial<Project>, message: string, owner: 'Artist' | 'Producer' | 'Engineer' | 'System' = 'System') => {
    onProjectChange({
      ...patch,
      sessionHistory: [createHistoryEvent(message, owner), ...(project.sessionHistory ?? [])].slice(0, 16),
    });
  };

  const playUrl = async (url?: string) => {
    const nextUrl = url || selectedAudioUrl || masterStem?.url;
    if (!nextUrl) return;
    setSelectedAudioUrl(nextUrl);
    setIsPlaying(true);
    window.setTimeout(() => {
      void audioRef.current?.play().catch(() => undefined);
    }, 50);
  };

  const pauseTransport = () => {
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  const stopTransport = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const generateSong = async () => {
    if (!draftLyrics.trim()) {
      setGenerationMessage('Paste lyrics first. v12 needs words before building the record.');
      return;
    }

    setIsGenerating(true);
    setGenerationMessage('Starting v12 working studio generation...');

    for (const step of generateSteps) {
      setGenerateStep(step.id);
      setGenerationMessage(step.label);
      await new Promise((resolve) => window.setTimeout(resolve, step.id === 'done' ? 220 : 520));
    }

    const cleanTitle = project.trackName.startsWith('Untitled') ? 'AudioMagic v12 Song Draft' : project.trackName;
    const generatedStems = buildStudioStems(cleanTitle);
    const masterUrl = generatedStems.find((stem) => stem.kind === 'master')?.url ?? generatedStems[0].url;
    const take = createRecordingTake('v12 Full Song Vocal Guide', 'Full Song', generatedStems[0].id, `${voiceMode === 'clone' ? 'Cloned voice' : 'Recorded voice'} draft prepared from artist lyrics.`);
    const nextSections = project.arrangementSections?.length ? project.arrangementSections : defaultArrangementSections();

    onProjectChange({
      trackName: cleanTitle,
      lyrics: draftLyrics,
      mood: style,
      status: 'Producing',
      selectedBeatName: project.selectedBeatName || 'v12 Generated Beat Direction',
      arrangementSections: nextSections,
      arrangement: nextSections.map((section) => `${section.name} (${section.bars} bars)`).join(' · '),
      producerNotes: [
        `v12 ARTIST BRIEF: ${style}. Voice mode: ${voiceMode}.`,
        `Song structure: ${nextSections.map((section) => section.name).join(' → ')}.`,
        'Producer task: refine drums, chords, bass, melody, vocal pocket, and handoff clean stems to engineer.',
        project.producerNotes,
      ].filter(Boolean).join('\n'),
      stems: [...generatedStems, ...project.stems],
      rawMasterUrl: project.rawMasterUrl ?? masterUrl,
      aiMasterUrl: masterUrl,
      releaseChecklist: { ...checklist, lyrics: true, stems: true },
      recordingTakes: [{ ...take, selected: true, rating: 4 }, ...(project.recordingTakes ?? [])],
      activeTakeId: take.id,
      sessionHistory: [
        createHistoryEvent('v12 generated working song core: lyrics, vocal guide, stems, arrangement, master preview.', 'System'),
        ...(project.sessionHistory ?? []),
      ].slice(0, 16),
      versionHistory: [
        createVersionRecord('v12 working song draft', 'demo', 'System', 'Generated playable stem placeholders, vocal guide, producer brief, and master preview.', generatedStems.length),
        ...(project.versionHistory ?? []),
      ].slice(0, 14),
    });

    setSelectedAudioUrl(masterUrl);
    setGenerationMessage('Done — the artist draft is now ready for producer and engineer review.');
    setGenerateStep('done');
    setIsGenerating(false);
  };

  const updateStem = (stemId: string, patch: Partial<Stem>) => {
    onProjectChange({ stems: project.stems.map((stem) => (stem.id === stemId ? { ...stem, ...patch } : stem)) });
  };

  const addProducerStem = (label: string, role: StemSplitRole, frequency: number) => {
    const stem = createStem(project.trackName, label, role === 'drums' ? 'beat' : 'stem', role, 'v12 Producer Core', frequency, 0.74, role === 'melody' ? 0.14 : 0);
    patchWithHistory(
      {
        stems: [stem, ...project.stems],
        status: 'Producing',
        releaseChecklist: { ...checklist, stems: true },
        versionHistory: [createVersionRecord(`Producer ${label}`, 'beat', 'Producer', `${label} added to the production session.`, project.stems.length + 1), ...(project.versionHistory ?? [])].slice(0, 14),
      },
      `Producer added ${label}.`,
      'Producer',
    );
  };

  const applyMasterPreset = (preset: (typeof masterPresets)[number]) => {
    const masterUrl = project.aiMasterUrl || createDemoWavUrl(preset.frequency, 5);
    patchWithHistory(
      {
        aiMasterUrl: masterUrl,
        masterPreset: preset.name,
        status: 'Mixing',
        releaseChecklist: { ...checklist, mix: true, master: true },
        versionHistory: [createVersionRecord(`v12 ${preset.name} master`, 'master', 'Engineer', preset.helper, project.stems.length), ...(project.versionHistory ?? [])].slice(0, 14),
      },
      `Engineer applied ${preset.name} mastering preset.`,
      'Engineer',
    );
    setSelectedAudioUrl(masterUrl);
  };

  const toggleChecklist = (key: keyof ReleaseChecklist) => {
    patchWithHistory({ releaseChecklist: { ...checklist, [key]: !checklist[key] } }, `${key} release checklist ${checklist[key] ? 'cleared' : 'completed'}.`, 'System');
  };

  const sendToProducer = () => {
    patchWithHistory({ status: 'Producing', producerNotes: project.producerNotes || `Artist handoff: ${style}` }, 'Artist sent the song draft to Producer Core.', 'Artist');
    setRole('producer');
  };

  const sendToEngineer = () => {
    patchWithHistory({ status: 'Mixing' }, 'Producer sent the session to Engineer Core.', 'Producer');
    setRole('engineer');
  };

  const completeRelease = () => {
    patchWithHistory(
      { status: 'Released', releaseChecklist: defaultReleaseChecklist({ lyrics: true, stems: true, mix: true, master: true, artwork: true, metadata: true }) },
      'Release package completed in v12 core.',
      'System',
    );
  };

  return (
    <section className="space-y-5">
      <audio ref={audioRef} src={selectedAudioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />

      <div className="rounded-[2rem] border border-cyan/10 bg-glass/85 p-5 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
              <Sparkles className="h-3.5 w-3.5" /> AudioMagic v12 · Working Studio Core
            </p>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">One clear workflow for artist, producer, and sound engineer.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
              v12 reduces confusion: choose the role, generate the song with progress, press play, inspect stems, mix, master, and export.
            </p>
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 xl:min-w-[20rem]">
            <div className="flex items-center justify-between text-sm"><span className="text-white/45">Studio readiness</span><span className="font-semibold text-cyan">{readiness}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan shadow-cyan" style={{ width: `${readiness}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-white/40">{project.status} · {project.stems.length} stems · {project.recordingTakes?.length ?? 0} takes</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {roleConfigs.map((config) => {
            const active = role === config.id;
            return (
              <button key={config.id} type="button" onClick={() => setRole(config.id)} className={`rounded-3xl border p-5 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 shadow-cyan' : 'border-white/5 bg-black/25 text-white/60 hover:border-cyan/25 hover:text-white'}`}>
                <config.icon className={active ? 'h-6 w-6 text-cyan' : 'h-6 w-6 text-white/35'} />
                <p className="mt-4 text-xl font-semibold">{config.label}</p>
                <p className="mt-2 text-sm leading-6 text-white/45">{config.helper}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-black/35 p-4 shadow-panel backdrop-blur-xl">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-magenta">Global transport</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => playUrl()} disabled={!selectedAudioUrl && !masterStem} className="inline-flex items-center gap-2 rounded-2xl bg-cyan px-4 py-3 font-semibold text-black shadow-cyan disabled:cursor-not-allowed disabled:opacity-45"><Play className="h-4 w-4" /> Play</button>
              <button type="button" onClick={pauseTransport} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white/60"><Pause className="h-4 w-4" /> Pause</button>
              <button type="button" onClick={stopTransport} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white/60"><Square className="h-4 w-4" /> Stop</button>
              <span className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white/55">{formatTime(currentTime)} / 3:00</span>
              <span className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white/55">{project.bpm ?? 104} BPM</span>
              <span className="rounded-2xl border border-cyan/20 bg-cyan/10 px-4 py-3 text-sm text-cyan">{isPlaying ? 'Playing' : 'Stopped'} · {selectedSection?.name ?? 'No section'}</span>
            </div>
          </div>
          <div className="min-w-[18rem]">
            <div className="h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-magenta" style={{ width: `${Math.min(100, (currentTime / 180) * 100)}%` }} /></div>
            <p className="mt-2 text-xs text-white/35">Loop section: {selectedSection?.name ?? 'Intro'} · Active source: {masterStem?.name ?? 'No audio yet'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan">{activeRole.label} workspace</p>
            <h3 className="mt-2 text-2xl font-semibold">{activeRole.headline}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">{activeRole.helper}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onOpenRoom('artist')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60 hover:border-cyan/30 hover:text-cyan">Classic Artist Room</button>
            <button type="button" onClick={() => onOpenRoom('producer')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60 hover:border-cyan/30 hover:text-cyan">Classic Producer Lab</button>
            <button type="button" onClick={() => onOpenRoom('engineer')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60 hover:border-cyan/30 hover:text-cyan">Classic Mix Room</button>
          </div>
        </div>
      </div>

      {role === 'artist' && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Artist flow</p><h3 className="mt-2 text-2xl font-semibold">Lyrics → voice → song draft</h3></div>
              <Mic2 className="h-7 w-7 text-cyan" />
            </div>
            <label className="mt-5 grid gap-2 text-sm text-white/50">Lyrics<textarea value={draftLyrics} onChange={(event) => setDraftLyrics(event.target.value)} rows={12} placeholder="Paste your lyrics here. v12 will create stems, a master preview, and a studio handoff." className="resize-none rounded-[1.5rem] border border-white/5 bg-black/30 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-cyan/35" /></label>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-white/50">Style / mood<input value={style} onChange={(event) => setStyle(event.target.value)} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan/35" /></label>
              <label className="grid gap-2 text-sm text-white/50">Voice mode<select value={voiceMode} onChange={(event) => setVoiceMode(event.target.value as 'record' | 'clone')} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan/35"><option value="clone">Cloned voice draft</option><option value="record">Recorded voice guide</option></select></label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={generateSong} disabled={isGenerating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan disabled:cursor-not-allowed disabled:opacity-50">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate working song draft</button>
              <button type="button" onClick={sendToProducer} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-magenta/30 bg-magenta/10 px-5 py-3 font-semibold text-magenta hover:bg-magenta hover:text-black">Send to Producer <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-black/30 p-5 shadow-panel backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-magenta">Generation status</p>
            <div className="mt-5 space-y-3">
              {generateSteps.map((step, index) => {
                const complete = generateStep === 'done' || (selectedStepIndex >= 0 && index < selectedStepIndex);
                const active = step.id === generateStep && generateStep !== 'done';
                return <div key={step.id} className={`rounded-2xl border p-4 ${active ? 'border-cyan/40 bg-cyan/10' : complete ? 'border-cyan/20 bg-cyan/[0.06]' : 'border-white/5 bg-white/[0.03]'}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{step.label}</p>{active ? <Loader2 className="h-4 w-4 animate-spin text-cyan" /> : complete ? <CheckCircle2 className="h-4 w-4 text-cyan" /> : <span className="h-4 w-4 rounded-full border border-white/15" />}</div><p className="mt-1 text-sm text-white/40">{step.helper}</p></div>;
              })}
            </div>
            {generationMessage && <p className="mt-4 rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm leading-6 text-cyan">{generationMessage}</p>}
          </div>
        </div>
      )}

      {role === 'producer' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Producer core</p><h3 className="mt-2 text-2xl font-semibold">Arrangement and production handoff</h3><p className="mt-2 text-sm text-white/45">Sections, beat, chords, bass, melody, stems, and engineer notes.</p></div><button type="button" onClick={sendToEngineer} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan">Send to Engineer <ArrowRight className="h-4 w-4" /></button></div>
            <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-white/5 bg-black/25 p-4"><div className="flex min-w-[760px] gap-2">{sections.map((section) => <div key={section.id} className={`rounded-2xl border p-4 ${sectionColors[section.energy] ?? 'border-white/5 bg-white/[0.03]'}`} style={{ width: `${Math.max(11, section.bars * 2.4)}rem` }}><p className="font-semibold">{section.name}</p><p className="mt-1 text-xs text-white/40">{section.bars} bars · {section.energy}</p><p className="mt-3 text-xs leading-5 text-white/45">{section.note}</p></div>)}</div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3"><button type="button" onClick={() => addProducerStem('Producer Drum Beat', 'drums', 146)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left hover:border-cyan/30"><Music2 className="h-5 w-5 text-cyan" /><p className="mt-4 font-semibold">Create beat stem</p><p className="mt-2 text-sm text-white/40">Adds a drum/beat stem.</p></button><button type="button" onClick={() => addProducerStem('Bass Line', 'bass', 82)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left hover:border-cyan/30"><Volume2 className="h-5 w-5 text-cyan" /><p className="mt-4 font-semibold">Create bass stem</p><p className="mt-2 text-sm text-white/40">Adds low-end foundation.</p></button><button type="button" onClick={() => addProducerStem('Chord Melody Bed', 'melody', 240)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left hover:border-cyan/30"><WandSparkles className="h-5 w-5 text-cyan" /><p className="mt-4 font-semibold">Create chord stem</p><p className="mt-2 text-sm text-white/40">Adds harmony/melody guide.</p></button></div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-black/30 p-5 shadow-panel backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-magenta">Producer notes</p>
            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm leading-6 text-white/60 whitespace-pre-wrap">{project.producerNotes || 'No producer notes yet. Generate the song draft or add production stems.'}</div>
            <div className="mt-5 rounded-2xl border border-cyan/20 bg-cyan/10 p-4"><p className="font-semibold text-cyan">Producer checklist</p><div className="mt-3 grid gap-2 text-sm text-white/60"><span>Lyrics: {project.lyrics.trim() ? 'ready' : 'missing'}</span><span>Beat/stems: {project.stems.length > 0 ? `${project.stems.length} stems` : 'missing'}</span><span>Vocal guide: {project.stems.some((stem) => stem.kind === 'vocal') ? 'ready' : 'missing'}</span><span>Handoff: {project.status === 'Mixing' ? 'sent to engineer' : 'pending'}</span></div></div>
          </div>
        </div>
      )}

      {role === 'engineer' && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Engineer core</p><h3 className="mt-2 text-2xl font-semibold">Stem mixer</h3><p className="mt-2 text-sm text-white/45">Every stem has play, gain, pan, mute, solo, and download.</p></div><button type="button" onClick={() => applyMasterPreset(masterPresets[0])} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan"><Headphones className="h-4 w-4" /> Quick master</button></div>
            <div className="mt-6 grid gap-3">{project.stems.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-8 text-center text-white/40">No stems yet. Go to Artist and generate a working song draft.</div> : project.stems.map((stem) => <div key={stem.id} className="rounded-3xl border border-white/5 bg-black/25 p-4"><div className="grid gap-4 xl:grid-cols-[1fr_11rem_11rem_12rem]"><div><p className="font-semibold">{stem.name}</p><p className="mt-1 text-xs text-white/35">{stem.kind} · {stem.splitRole ?? 'master'} · {stem.createdAt}</p><div className="mt-3 flex h-10 items-end gap-1">{Array.from({ length: 28 }).map((_, index) => <span key={index} className="w-full rounded-t bg-cyan/40" style={{ height: `${24 + ((index * 17) % 52)}%` }} />)}</div></div><label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-white/35">Volume<input type="range" min="0" max="1.2" step="0.01" value={stem.gain} onChange={(event) => updateStem(stem.id, { gain: Number(event.target.value) })} /></label><label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-white/35">Pan<input type="range" min="-1" max="1" step="0.01" value={stem.pan} onChange={(event) => updateStem(stem.id, { pan: Number(event.target.value) })} /></label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => playUrl(stem.url)} className="rounded-2xl border border-cyan/25 bg-cyan/10 px-3 py-2 text-sm font-semibold text-cyan"><Play className="mr-1 inline h-4 w-4" /> Play</button><a href={stem.url} download={stem.fileName || `${stem.name}.wav`} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white/55"><DownloadCloud className="mr-1 inline h-4 w-4" /> File</a><button type="button" onClick={() => updateStem(stem.id, { muted: !stem.muted })} className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${stem.muted ? 'border-magenta/35 bg-magenta/10 text-magenta' : 'border-white/5 bg-white/[0.03] text-white/50'}`}>Mute</button><button type="button" onClick={() => updateStem(stem.id, { solo: !stem.solo })} className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${stem.solo ? 'border-cyan/35 bg-cyan/10 text-cyan' : 'border-white/5 bg-white/[0.03] text-white/50'}`}>Solo</button></div></div></div>)}</div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/5 bg-black/30 p-5 shadow-panel backdrop-blur-xl"><p className="text-xs uppercase tracking-[0.24em] text-magenta">Mastering</p><div className="mt-4 grid gap-3">{masterPresets.map((preset) => <button key={preset.name} type="button" onClick={() => applyMasterPreset(preset)} className={`rounded-2xl border p-4 text-left transition ${project.masterPreset === preset.name ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-white/[0.03] hover:border-cyan/25'}`}><p className="font-semibold">{preset.name}</p><p className="mt-1 text-sm text-white/45">{preset.helper}</p></button>)}</div></div>
            <div className="rounded-[2rem] border border-white/5 bg-black/30 p-5 shadow-panel backdrop-blur-xl"><p className="text-xs uppercase tracking-[0.24em] text-cyan">Release/export</p><div className="mt-4 grid gap-2">{(Object.keys(checklist) as Array<keyof ReleaseChecklist>).map((key) => <button key={key} type="button" onClick={() => toggleChecklist(key)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${checklist[key] ? 'border-cyan/25 bg-cyan/10 text-cyan' : 'border-white/5 bg-white/[0.03] text-white/55'}`}><span className="capitalize">{key}</span><CheckCircle2 className="h-4 w-4" /></button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(project, null, 2))}`} download={`${project.trackName.replace(/[^a-z0-9]+/gi, '-')}-session.json`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60"><DownloadCloud className="h-4 w-4" /> Session JSON</a><button type="button" onClick={completeRelease} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black shadow-cyan"><RadioTower className="h-4 w-4" /> Mark released</button></div></div>
          </div>
        </div>
      )}
    </section>
  );
}
