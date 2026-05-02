import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, Bot, FileAudio, Loader2, Music2, UploadCloud, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { GENRES } from '../beatLibrary';
import { renderBeatPatternToWav, slugify } from '../audioEngine';
import type { Project, Stem } from '../types';
import { id, nowLabel } from '../utils';

interface ProducerTabProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';

const SequencerPreview = ({ values, color }: { values: number[]; color: string }) => (
  <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
    {values.map((value, index) => (
      <span
        key={`${value}-${index}`}
        className="h-1.5 rounded-full"
        style={{ background: value ? color : 'rgba(255,255,255,0.12)' }}
      />
    ))}
  </div>
);

export default function ProducerTab({ project, onProjectChange }: ProducerTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState(GENRES[0].id);
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);

  const selectedGenre = useMemo(() => GENRES.find((genre) => genre.id === selectedGenreId) ?? GENRES[0], [selectedGenreId]);
  const selectedBeat = selectedGenre.beats[selectedBeatIndex] ?? selectedGenre.beats[0];
  const vocalStems = useMemo(() => project.stems.filter((stem) => stem.kind === 'vocal'), [project.stems]);

  const generateBeat = async () => {
    setIsGenerating(true);
    try {
      const wavBlob = await renderBeatPatternToWav(selectedGenre, selectedBeat);
      const url = URL.createObjectURL(wavBlob);
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
        prompt: project.prompt || `${selectedGenre.name} ${selectedBeat.name} at ${selectedGenre.bpm} BPM`,
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
      kind: file.name.toLowerCase().includes('beat') ? 'beat' : 'stem',
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

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className={panel}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Recorded Vocal</p>
            <h2 className="mt-2 text-2xl font-semibold">Artist audio available in the Lab</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">Every vocal captured in Artist Mode is immediately playable here and ready to guide beat generation.</p>
          </div>
          <AudioLines className="h-7 w-7 text-cyan" />
        </div>

        <div className="mt-6 grid gap-4">
          {vocalStems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-white/40">No vocal recorded yet. Jump back to Artist Mode and capture a take.</div>
          ) : (
            vocalStems.map((stem) => (
              <div key={stem.id} className="rounded-3xl border border-white/5 bg-black/25 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{stem.name}</p>
                    <p className="text-xs text-white/35">{stem.fileName} · {stem.createdAt}</p>
                  </div>
                  <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs text-cyan">Vocal</span>
                </div>
                <audio controls src={stem.url} className="w-full" />
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-magenta/20 bg-magenta/10 p-4">
          <div className="flex items-center gap-2 text-magenta"><Bot className="h-4 w-4" /><p className="font-semibold">AI Production Prompt</p></div>
          <textarea
            value={project.prompt}
            onChange={(event) => onProjectChange({ prompt: event.target.value })}
            placeholder="Describe the beat you want to build around this vocal..."
            className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/5 bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-magenta/30"
          />
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Producer Beat Library</p>
            <h2 className="mt-2 text-2xl font-semibold">8 genres × 3 generated patterns</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">Pick a genre and pattern. The beat is rendered in-browser to WAV with OfflineAudioContext and added as a real playable stem.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">{selectedGenre.bpm} BPM</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => { setSelectedGenreId(genre.id); setSelectedBeatIndex(0); }}
              className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${selectedGenre.id === genre.id ? 'border-cyan bg-cyan text-black shadow-cyan' : 'border-white/10 bg-white/5 text-white/60 hover:border-cyan/40 hover:text-white'}`}
            >
              <span className="mr-1.5">{genre.emoji}</span>{genre.name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {selectedGenre.beats.map((beat, index) => (
            <button
              key={beat.name}
              type="button"
              onClick={() => setSelectedBeatIndex(index)}
              className={`rounded-3xl border p-4 text-left transition ${selectedBeatIndex === index ? 'border-magenta/60 bg-magenta/15 shadow-magenta' : 'border-white/5 bg-black/25 hover:border-magenta/30'}`}
            >
              <div className="flex items-center gap-2"><Music2 className="h-4 w-4" style={{ color: selectedGenre.color }} /><p className="text-sm font-semibold">{beat.name}</p></div>
              <p className="mt-2 text-xs leading-5 text-white/40">{selectedGenre.desc}</p>
              <SequencerPreview values={beat.k} color={selectedGenre.color} />
              <SequencerPreview values={beat.s} color="#FF00FF" />
              <SequencerPreview values={beat.h} color="#00E5FF" />
            </button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          disabled={isGenerating}
          onClick={generateBeat}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan/35 bg-cyan px-5 py-3 font-semibold text-black shadow-cyan disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
          {isGenerating ? 'Rendering WAV beat…' : `Generate ${selectedGenre.name} Beat`}
        </motion.button>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><p className="text-xs uppercase tracking-[0.28em] text-cyan">Stem Management</p><h2 className="mt-2 text-2xl font-semibold">Upload, preview, and prepare stems</h2></div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">{project.stems.length} total</span>
        </div>

        <label
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed p-6 text-center transition ${isDragging ? 'border-cyan bg-cyan/10 shadow-cyan' : 'border-white/10 bg-black/25 hover:border-cyan/30'}`}
        >
          <UploadCloud className="h-9 w-9 text-cyan" />
          <p className="mt-3 font-semibold">Drag & drop stems here</p>
          <p className="mt-1 text-sm text-white/40">or click to select multiple audio files</p>
          <input type="file" multiple accept="audio/*" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
        </label>

        <div className="audio-scrollbar mt-6 grid max-h-[420px] gap-3 overflow-auto pr-1">
          <AnimatePresence initial={false}>
            {project.stems.map((stem) => (
              <motion.div key={stem.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-3xl border border-white/5 bg-black/25 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3"><div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-cyan"><FileAudio className="h-5 w-5" /></div><div><p className="font-semibold">{stem.name}</p><p className="text-xs text-white/35">{stem.fileName ?? 'object-url'} · {stem.createdAt}</p></div></div>
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
