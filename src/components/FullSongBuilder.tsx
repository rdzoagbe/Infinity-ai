import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Mic2,
  Music2,
  PlayCircle,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { GENRES } from '../beatLibrary';
import type { GenreDefinition } from '../beatLibrary';
import type { ArrangementSection, Project, WorkspaceMode } from '../types';
import { createHistoryEvent, createVersionRecord, id } from '../utils';

interface FullSongBuilderProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
  onOpenRoom: (mode: WorkspaceMode) => void;
}

type DurationPreset = 170 | 180;

const durationOptions: Array<{ seconds: DurationPreset; label: string; helper: string }> = [
  { seconds: 170, label: '2:50', helper: 'Streaming single length' },
  { seconds: 180, label: '3:00', helper: 'Classic radio-ready length' },
];

const structureTemplate = [
  { name: 'Intro', weight: 0.08, energy: 'Low', note: 'Set atmosphere, hook motif, or beat tag.' },
  { name: 'Verse 1', weight: 0.22, energy: 'Medium', note: 'Main story and first vocal performance.' },
  { name: 'Pre-Hook', weight: 0.1, energy: 'Medium', note: 'Lift tension and prepare the hook.' },
  { name: 'Hook', weight: 0.15, energy: 'High', note: 'Most memorable melodic section.' },
  { name: 'Verse 2', weight: 0.2, energy: 'Medium', note: 'Second story section with production variation.' },
  { name: 'Bridge', weight: 0.1, energy: 'High', note: 'Contrast section, breakdown, or vocal stack.' },
  { name: 'Final Hook', weight: 0.12, energy: 'Peak', note: 'Full production, adlibs, doubles, and lift.' },
  { name: 'Outro', weight: 0.03, energy: 'Low', note: 'Clean ending or fade concept.' },
] as const;

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const estimateBars = (seconds: number, bpm: number) => Math.max(2, Math.round(seconds / (240 / bpm)));

const buildSongSections = (duration: number, genre: GenreDefinition): ArrangementSection[] =>
  structureTemplate.map((section) => {
    const seconds = Math.max(8, Math.round(duration * section.weight));
    return {
      id: id('section'),
      name: section.name,
      bars: estimateBars(seconds, genre.bpm),
      energy: section.energy,
      note: `${section.note} Target: ${formatTime(seconds)}.`,
    };
  });

const lyricStats = (lyrics: string) => {
  const words = lyrics.trim().split(/\s+/).filter(Boolean);
  const lines = lyrics.split('\n').map((line) => line.trim()).filter(Boolean);
  const hookLikely = lines.find((line) => /hook|chorus|refrain/i.test(line)) || lines[Math.min(1, lines.length - 1)] || '';
  return {
    words: words.length,
    lines: lines.length,
    hookLikely,
    density: words.length > 180 ? 'Dense lyric — use a 3:00 structure or faster delivery.' : words.length > 90 ? 'Balanced lyric — fits a 2:50 to 3:00 arrangement.' : 'Light lyric — repeat hook, add adlibs, or write another verse.',
  };
};

export default function FullSongBuilder({ project, onProjectChange, onOpenRoom }: FullSongBuilderProps) {
  const [lyrics, setLyrics] = useState(project.lyrics);
  const [duration, setDuration] = useState<DurationPreset>(180);
  const [genreId, setGenreId] = useState(project.selectedGenreId ?? 'afrobeat');
  const [title, setTitle] = useState(project.trackName.startsWith('Untitled Session') ? '' : project.trackName);
  const [generated, setGenerated] = useState(false);

  const genre = useMemo(() => GENRES.find((item) => item.id === genreId) ?? GENRES[0], [genreId]);
  const stats = useMemo(() => lyricStats(lyrics), [lyrics]);
  const sections = useMemo(() => buildSongSections(duration, genre), [duration, genre]);
  const totalBars = sections.reduce((sum, section) => sum + section.bars, 0);
  const selectedBeat = genre.beats[0];
  const hasLyrics = lyrics.trim().length > 0;

  const producerBrief = useMemo(() => {
    const cleanTitle = title.trim() || project.trackName || 'Untitled Song';
    return [
      `Full song generated: ${cleanTitle}`,
      `Target duration: ${formatTime(duration)} at ${genre.bpm} BPM in ${genre.name}.`,
      `Beat direction: ${selectedBeat.name}.`,
      `Estimated arrangement: ${sections.map((section) => `${section.name} ${section.bars} bars`).join(' · ')}.`,
      `Lyric density: ${stats.density}`,
      stats.hookLikely ? `Potential hook line: “${stats.hookLikely.slice(0, 120)}”` : 'Hook needs to be written or selected.',
      'Next: record/clone vocal, generate beat, split stems, then move to Mix Room.',
    ].join('\n');
  }, [duration, genre, project.trackName, sections, selectedBeat.name, stats.density, stats.hookLikely, title]);

  const generateFullSong = () => {
    const cleanTitle = title.trim() || project.trackName || `AI Song ${Date.now()}`;
    const historyEvent = createHistoryEvent(`Full ${formatTime(duration)} song blueprint generated from lyrics.`, 'System');

    onProjectChange({
      trackName: cleanTitle,
      lyrics,
      selectedGenreId: genre.id,
      selectedBeatName: selectedBeat.name,
      bpm: genre.bpm,
      songKey: project.songKey || 'F minor',
      mood: project.mood && project.mood !== 'Unassigned' ? project.mood : `${genre.name}, polished, radio-ready`,
      status: 'Producing',
      arrangement: sections.map((section) => `${section.name} (${section.bars} bars)`).join(' · '),
      arrangementSections: sections,
      producerNotes: producerBrief,
      releaseChecklist: { ...(project.releaseChecklist ?? { stems: false, mix: false, master: false, artwork: false, metadata: false }), lyrics: hasLyrics },
      sessionHistory: [historyEvent, ...(project.sessionHistory ?? [])].slice(0, 12),
      versionHistory: [
        createVersionRecord(`Full song blueprint ${formatTime(duration)}`, 'demo', 'System', `Generated ${formatTime(duration)} arrangement and producer brief.`, project.stems.length),
        ...(project.versionHistory ?? []),
      ].slice(0, 12),
    });

    setGenerated(true);
  };

  return (
    <section className="rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
            <WandSparkles className="h-3.5 w-3.5" /> Full Song Builder
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Turn lyrics into a 2:50 or 3:00 song plan.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
            This creates the complete song blueprint on the page: duration, genre, structure, bars, beat direction, vocal plan, and producer handoff. Real AI audio rendering can be connected later with a backend music-generation API.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-white/50">
              Song title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give this song a name"
                className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan/35"
              />
            </label>

            <label className="grid gap-2 text-sm text-white/50">
              Genre / beat direction
              <select
                value={genreId}
                onChange={(event) => setGenreId(event.target.value)}
                className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan/35"
              >
                {GENRES.map((item) => (
                  <option key={item.id} value={item.id}>{item.emoji} {item.name} · {item.bpm} BPM</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {durationOptions.map((option) => {
              const active = duration === option.seconds;
              return (
                <button
                  key={option.seconds}
                  type="button"
                  onClick={() => setDuration(option.seconds)}
                  className={`rounded-2xl border p-4 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 shadow-cyan' : 'border-white/5 bg-black/25 hover:border-cyan/25'}`}
                >
                  <Clock3 className={active ? 'h-5 w-5 text-cyan' : 'h-5 w-5 text-white/35'} />
                  <p className="mt-3 text-2xl font-semibold">{option.label}</p>
                  <p className="text-sm text-white/45">{option.helper}</p>
                </button>
              );
            })}
          </div>

          <label className="mt-5 grid gap-2 text-sm text-white/50">
            Lyrics
            <textarea
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="Paste or write the lyrics here. Then generate the full song blueprint."
              rows={12}
              className="resize-none rounded-[1.5rem] border border-white/5 bg-black/30 px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-cyan/35"
            />
          </label>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={generateFullSong}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasLyrics}
            >
              <Sparkles className="h-4 w-4" /> Generate full {formatTime(duration)} song
            </button>
            <button
              type="button"
              onClick={() => onOpenRoom('producer')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white/70 transition hover:border-cyan/30 hover:text-cyan"
            >
              Send to Producer <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/5 bg-black/25 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-magenta">Song target</p>
                <h3 className="mt-2 text-2xl font-semibold">{formatTime(duration)} · {genre.name}</h3>
                <p className="mt-1 text-sm text-white/45">{selectedBeat.name} · {genre.bpm} BPM · {totalBars} estimated bars</p>
              </div>
              <div className="rounded-2xl border border-cyan/20 bg-cyan/10 px-3 py-2 text-sm text-cyan">{generated ? 'Generated' : 'Ready'}</div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <FileText className="h-4 w-4 text-cyan" />
                <p className="mt-2 text-xl font-semibold">{stats.words}</p>
                <p className="text-xs text-white/40">words</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <Mic2 className="h-4 w-4 text-cyan" />
                <p className="mt-2 text-xl font-semibold">{stats.lines}</p>
                <p className="text-xs text-white/40">lyric lines</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <Gauge className="h-4 w-4 text-cyan" />
                <p className="mt-2 text-xl font-semibold">{genre.bpm}</p>
                <p className="text-xs text-white/40">BPM</p>
              </div>
            </div>

            <p className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm leading-6 text-white/55">{stats.density}</p>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan">Generated arrangement</p>
            <div className="mt-4 space-y-2">
              {sections.map((section, index) => (
                <motion.div
                  key={section.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{section.name}</p>
                    <p className="text-xs text-white/40">{section.note}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-sm font-semibold text-cyan">{section.bars} bars</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-magenta">After generation</p>
            <div className="mt-4 grid gap-3">
              {[
                ['Producer brief saved', 'The arrangement and beat direction are written into project notes.'],
                ['Song cycle updated', 'Sections are created for the Studio Cycle view.'],
                ['Ready for vocal + beat', 'Open Producer or Recording to continue.'],
              ].map(([label, helper]) => (
                <div key={label} className="flex gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 text-sm text-white/45">{helper}</p>
                  </div>
                </div>
              ))}
            </div>

            {generated && (
              <button
                type="button"
                onClick={() => onOpenRoom('producer')}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-5 py-3 font-semibold text-cyan transition hover:bg-cyan hover:text-black"
              >
                <Bot className="h-4 w-4" /> Continue in Producer Lab
              </button>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Audio rendering status</p>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-white/40" />
              <p className="text-sm leading-6 text-white/50">
                This MVP creates the complete song blueprint and handoff inside the page. To output a real 2:50 or 3:00 mastered audio file with sung vocals, the next layer needs a backend connection to a licensed music-generation/vocal-rendering engine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
