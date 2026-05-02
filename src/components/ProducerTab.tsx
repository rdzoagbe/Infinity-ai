import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, AudioLines, Bot, CheckCircle2, FileAudio, Loader2, Music2, UploadCloud, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { GENRES } from '../beatLibrary';
import { renderBeatPatternToWav, slugify } from '../audioEngine';
import type { Project, Stem } from '../types';
import { id, nowLabel } from '../utils';

interface ProducerTabProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
  onSendToEngineer: () => void;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';

const SequencerPreview = ({ values, color }: { values: number[]; color: string }) => (
  <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
    {values.map((value, index) => (
      <span key={`${value}-${index}`} className="h-1.5 rounded-full" style={{ background: value ? color : 'rgba(255,255,255,0.12)' }} />
    ))}
  </div>
);

const buildArrangement = (lyrics: string, beatName: string, genreName: string) => {
  const lines = lyrics.split('\n').map((line) => line.trim()).filter(Boolean);
  const lineCount = lines.length;
  const mood = lineCount > 18 ? 'full song structure' : lineCount > 8 ? 'standard single structure' : 'short demo structure';
  return `${genreName} · ${beatName}\n${mood}: Intro 4 bars → Verse ${Math.max(8, Math.min(16, lineCount || 8))} bars → Hook 8 bars → Verse 2 → Final Hook → Outro.\nProducer cue: keep the first hook spacious, then add percussion and bass movement after the second lyrical section.`;
};

export default function ProducerTab({ project, onProjectChange, onSendToEngineer }: ProducerTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState(project.selectedGenreId ?? GENRES[0].id);

  const selectedGenre = useMemo(() => GENRES.find((genre) => genre.id === selectedGenreId) ?? GENRES[0], [selectedGenreId]);
  const initialBeatIndex = Math.max(0, selectedGenre.beats.findIndex((beat) => beat.name === project.selectedBeatName));
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(initialBeatIndex);
  const selectedBeat = selectedGenre.beats[selectedBeatIndex] ?? selectedGenre.beats[0];

  const vocalStems = useMemo(() => project.stems.filter((stem) => stem.kind === 'vocal'), [project.stems]);
  const beatStems = useMemo(() => project.stems.filter((stem) => stem.kind === 'beat'), [project.stems]);
  const hasLyrics = project.lyrics.trim().length > 0;
  const hasBeat = beatStems.length > 0;

  const selectGenre = (genreId: string) => {
    const nextGenre = GENRES.find((genre) => genre.id === genreId) ?? GENRES[0];
    setSelectedGenreId(nextGenre.id);
    setSelectedBeatIndex(0);
    onProjectChange({ selectedGenreId: nextGenre.id, selectedBeatName: nextGenre.beats[0].name, status: 'Producing' });
  };

  const selectBeat = (index: number) => {
    const beat = selectedGenre.beats[index] ?? selectedGenre.beats[0];
    setSelectedBeatIndex(index);
    onProjectChange({ selectedGenreId: selectedGenre.id, selectedBeatName: beat.name, status: 'Producing' });
  };

  const generateBeat = async () => {
    setIsGenerating(true);
    try {
      const wavBlob = await renderBeatPatternToWav(selectedGenre, selectedBeat);
      const url = URL.createObjectURL(wavBlob);
      const arrangement = buildArrangement(project.lyrics, selectedBeat.name, selectedGenre.name);
      const generatedBeat: Stem = {
        id: id('stem'),
        name: `${selectedGenre.name} · ${selectedBeat.name}`,
        kind: 'beat',
        url,
        fileName: `beat_${slugify(selectedGenre.name)}_${slugify(selectedBeat.name)}_${selectedGenre.bpm}bpm.wav`,
        pan: 0,
        gain: 0.78,
        position: { x: 330, y: 160 },
        createdAt: nowLabel(),
      };

      onProjectChange({
        stems: [generatedBeat, ...project.stems],
        aiMasterUrl: url,
        rawMasterUrl: project.rawMasterUrl ?? url,
        selectedGenreId: selectedGenre.id,
        selectedBeatName: selectedBeat.name,
        arrangement,
        producerNotes: `Rendered ${selectedGenre.name} beat "${selectedBeat.name}" at ${selectedGenre.bpm} BPM. Ready to combine with vocals/stems and send to the engineer.`,
        prompt: project.prompt || `${selectedGenre.name} ${selectedBeat.name} at ${selectedGenre.bpm} BPM based on pasted lyrics.`,
        status: 'Producing',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const nextStems: Stem[] = Array.from(files).map((file, index) => ({
      id: id('stem'),
      name: file.name.replace(/\.[^/.]+$/, ''),
      kind: file.name.toLowerCase().includes('beat') ? 'beat' : file.name.toLowerCase().includes('vocal') ? 'vocal' : 'stem',
      url: URL.createObjectURL(file),
      fileName: file.name,
      pan: 0,
      gain: 0.75,
      position: { x: 140 + index * 70, y: 150 + index * 16 },
      createdAt: nowLabel(),
    }));
    if (nextStems.length) {
      onProjectChange({ stems: [...nextStems, ...project.stems], status: 'Producing', rawMasterUrl: project.rawMasterUrl ?? nextStems[0].url });
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const sendToEngineer = () => {
    const arrangement = project.arrangement || buildArrangement(project.lyrics, selectedBeat.name, selectedGenre.name);
    onProjectChange({
      status: 'Mixing',
      selectedGenreId: selectedGenre.id,
      selectedBeatName: selectedBeat.name,
      arrangement,
      producerNotes: project.producerNotes || 'Producer handoff complete. Engineer can now balance stems visually.',
    });
    onSendToEngineer();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className={panel}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Producer Brief</p>
            <h2 className="mt-2 text-2xl font-semibold">Build the song from lyrics and beat direction</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              The producer reads the lyrics, selects from the beat library, renders a real WAV foundation, then sends the session to the visual engineering dashboard.
            </p>
          </div>
          <Bot className="h-7 w-7 text-cyan" />
        </div>

        <div className="mt-6 grid gap-4">
          <div className="rounded-3xl border border-cyan/15 bg-cyan/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-cyan">
                <CheckCircle2 className="h-4 w-4" />
                <p className="font-semibold">Workflow checklist</p>
              </div>
              <span className="text-xs text-white/35">{hasLyrics ? 'Lyrics ready' : 'Lyrics needed'} · {hasBeat ? 'Beat ready' : 'Beat pending'}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-white/55 md:grid-cols-3">
              <div className={`rounded-2xl border p-3 ${hasLyrics ? 'border-cyan/25 bg-cyan/10 text-cyan' : 'border-white/5 bg-black/20'}`}>1. Lyrics loaded</div>
              <div className={`rounded-2xl border p-3 ${hasBeat ? 'border-cyan/25 bg-cyan/10 text-cyan' : 'border-white/5 bg-black/20'}`}>2. Beat rendered</div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-3">3. Send to Engineer</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold">Lyrics</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/45">{project.lyrics.split('\n').filter(Boolean).length} lines</span>
            </div>
            <textarea
              value={project.lyrics}
              onChange={(event) => onProjectChange({ lyrics: event.target.value, status: 'Producing' })}
              placeholder="Paste lyrics here or use the dashboard Lyrics to Song section..."
              className="min-h-56 w-full resize-none rounded-2xl border border-white/5 bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-cyan/35"
            />
          </div>

          <div className="rounded-3xl border border-magenta/20 bg-magenta/10 p-4">
            <div className="flex items-center gap-2 text-magenta">
              <WandSparkles className="h-4 w-4" />
              <p className="font-semibold">Production Prompt</p>
            </div>
            <textarea
              value={project.prompt}
              onChange={(event) => onProjectChange({ prompt: event.target.value, status: 'Producing' })}
              placeholder="Describe the groove, mood, instruments, and vocal energy..."
              className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/5 bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-magenta/30"
            />
          </div>

          <div className="rounded-3xl border border-white/5 bg-black/25 p-4">
            <div className="flex items-center gap-2 text-cyan">
              <AudioLines className="h-4 w-4" />
              <p className="font-semibold">Vocal takes from Artist Mode</p>
            </div>
            <div className="mt-4 grid gap-3">
              {vocalStems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-white/35">
                  No vocal recorded yet. You can still create the beat, then record or upload vocals later.
                </div>
              ) : (
                vocalStems.map((stem) => (
                  <div key={stem.id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="mb-2 text-sm font-semibold">{stem.name}</p>
                    <audio controls src={stem.url} className="w-full" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Producer Beat Library</p>
            <h2 className="mt-2 text-2xl font-semibold">Pick a beat, render the foundation, then hand off</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              8 genres × 3 patterns. Every selection can be rendered to a real browser-generated WAV stem.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">{selectedGenre.bpm} BPM</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => selectGenre(genre.id)}
              className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                selectedGenre.id === genre.id ? 'border-cyan bg-cyan text-black shadow-cyan' : 'border-white/10 bg-white/5 text-white/60 hover:border-cyan/40 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{genre.emoji}</span>
              {genre.name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {selectedGenre.beats.map((beat, index) => (
            <button
              key={beat.name}
              type="button"
              onClick={() => selectBeat(index)}
              className={`rounded-3xl border p-4 text-left transition ${
                selectedBeatIndex === index ? 'border-magenta/60 bg-magenta/15 shadow-magenta' : 'border-white/5 bg-black/25 hover:border-magenta/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4" style={{ color: selectedGenre.color }} />
                <p className="text-sm font-semibold">{beat.name}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/40">{selectedGenre.desc}</p>
              <SequencerPreview values={beat.k} color={selectedGenre.color} />
              <SequencerPreview values={beat.s} color="#FF00FF" />
              <SequencerPreview values={beat.h} color="#00E5FF" />
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            disabled={isGenerating}
            onClick={generateBeat}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan/35 bg-cyan px-5 py-3 font-semibold text-black shadow-cyan disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {isGenerating ? 'Rendering beat…' : 'Create Song Foundation'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={sendToEngineer}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-magenta/40 bg-magenta px-5 py-3 font-semibold text-black shadow-magenta"
          >
            Send to Engineer <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>

        {project.arrangement && (
          <div className="mt-5 whitespace-pre-line rounded-3xl border border-white/5 bg-black/25 p-4 text-sm leading-6 text-white/55">
            <p className="mb-2 font-semibold text-white">Producer Arrangement</p>
            {project.arrangement}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Stem Management</p>
            <h2 className="mt-2 text-2xl font-semibold">Upload, preview, and prepare stems</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">{project.stems.length} total</span>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed p-6 text-center transition ${
            isDragging ? 'border-cyan bg-cyan/10 shadow-cyan' : 'border-white/10 bg-black/25 hover:border-cyan/30'
          }`}
        >
          <UploadCloud className="h-9 w-9 text-cyan" />
          <p className="mt-3 font-semibold">Drag & drop stems here</p>
          <p className="mt-1 text-sm text-white/40">or click to select multiple audio files</p>
          <input type="file" multiple accept="audio/*" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
        </label>

        <div className="audio-scrollbar mt-6 grid max-h-[420px] gap-3 overflow-auto pr-1">
          <AnimatePresence initial={false}>
            {project.stems.map((stem) => (
              <motion.div
                key={stem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl border border-white/5 bg-black/25 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-cyan">
                      <FileAudio className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{stem.name}</p>
                      <p className="text-xs text-white/35">{stem.fileName ?? 'object-url'} · {stem.createdAt}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-white/50">{stem.kind}</span>
                </div>
                <audio controls src={stem.url} className="w-full" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
