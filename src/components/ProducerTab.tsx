import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, Bot, FileAudio, Loader2, UploadCloud, WandSparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import type { Project, Stem } from '../types';
import { id, nowLabel } from '../utils';

interface ProducerTabProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';

const audioBufferToWav = (buffer: AudioBuffer) => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const dataSize = samples * numberOfChannels * 2;
  const output = new ArrayBuffer(44 + dataSize);
  const view = new DataView(output);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let sample = 0; sample < samples; sample += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const value = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[sample]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([output], { type: 'audio/wav' });
};

const renderGeneratedBeat = async (prompt: string) => {
  const sampleRate = 44100;
  const duration = 8;
  const context = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
  const master = context.createGain();
  master.gain.value = 0.8;
  master.connect(context.destination);

  const hash = prompt.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const bassFrequency = 48 + (hash % 28);

  for (let beat = 0; beat < duration * 2; beat += 1) {
    const start = beat * 0.5;

    const kick = context.createOscillator();
    const kickGain = context.createGain();
    kick.frequency.setValueAtTime(120, start);
    kick.frequency.exponentialRampToValueAtTime(45, start + 0.18);
    kickGain.gain.setValueAtTime(0.9, start);
    kickGain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    kick.connect(kickGain).connect(master);
    kick.start(start);
    kick.stop(start + 0.23);

    if (beat % 4 === 2) {
      const snare = context.createBufferSource();
      const noise = context.createBuffer(1, sampleRate * 0.16, sampleRate);
      const data = noise.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      const snareGain = context.createGain();
      snareGain.gain.setValueAtTime(0.28, start);
      snareGain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      snare.buffer = noise;
      snare.connect(snareGain).connect(master);
      snare.start(start);
    }

    const hat = context.createOscillator();
    const hatGain = context.createGain();
    hat.type = 'square';
    hat.frequency.value = 8200;
    hatGain.gain.setValueAtTime(0.05, start + 0.25);
    hatGain.gain.exponentialRampToValueAtTime(0.001, start + 0.33);
    hat.connect(hatGain).connect(master);
    hat.start(start + 0.25);
    hat.stop(start + 0.34);
  }

  const bass = context.createOscillator();
  const bassGain = context.createGain();
  bass.type = 'sawtooth';
  bass.frequency.value = bassFrequency;
  bassGain.gain.value = 0.12;
  bass.connect(bassGain).connect(master);
  bass.start(0);
  bass.stop(duration);

  const buffer = await context.startRendering();
  return URL.createObjectURL(audioBufferToWav(buffer));
};

export default function ProducerTab({ project, onProjectChange }: ProducerTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const vocalStems = useMemo(() => project.stems.filter((stem) => stem.kind === 'vocal'), [project.stems]);

  const updatePrompt = (prompt: string) => onProjectChange({ prompt });

  const generateBeat = async () => {
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const url = await renderGeneratedBeat(project.prompt || 'premium neon afro electronic beat');
      const generatedBeat: Stem = {
        id: id('stem'),
        name: 'AI Beat Sketch',
        kind: 'beat',
        url,
        fileName: 'ai-beat-sketch.wav',
        pan: 0,
        gain: 0.78,
        position: { x: 330, y: 160 },
        createdAt: nowLabel(),
      };
      onProjectChange({
        stems: [generatedBeat, ...project.stems],
        aiMasterUrl: url,
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
      onProjectChange({
        stems: [...nextStems, ...project.stems],
        status: 'Producing',
        rawMasterUrl: project.rawMasterUrl ?? nextStems[0].url,
      });
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
            <p className="mt-2 text-sm leading-6 text-white/45">
              Every vocal captured in Artist Mode is immediately playable here and ready to guide beat generation.
            </p>
          </div>
          <AudioLines className="h-7 w-7 text-cyan" />
        </div>

        <div className="mt-6 grid gap-4">
          {vocalStems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-white/40">
              No vocal recorded yet. Jump back to Artist Mode and capture a take.
            </div>
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
          <div className="flex items-center gap-2 text-magenta">
            <Bot className="h-4 w-4" />
            <p className="font-semibold">AI Production Prompt</p>
          </div>
          <textarea
            value={project.prompt}
            onChange={(event) => updatePrompt(event.target.value)}
            placeholder="Describe the beat you want to build around this vocal..."
            className="mt-4 min-h-32 w-full resize-none rounded-2xl border border-white/5 bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-magenta/30"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            disabled={isGenerating}
            onClick={generateBeat}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan/35 bg-cyan px-5 py-3 font-semibold text-black shadow-cyan disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {isGenerating ? 'Generating beat sketch…' : 'Generate Beat'}
          </motion.button>
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Stem Management</p>
            <h2 className="mt-2 text-2xl font-semibold">Upload, preview, and prepare stems</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">
            {project.stems.length} total
          </span>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed p-6 text-center transition ${
            isDragging ? 'border-cyan bg-cyan/10 shadow-cyan' : 'border-white/10 bg-black/25 hover:border-cyan/30'
          }`}
        >
          <UploadCloud className="h-9 w-9 text-cyan" />
          <p className="mt-3 font-semibold">Drag & drop stems here</p>
          <p className="mt-1 text-sm text-white/40">or click to select multiple audio files</p>
          <input
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            onChange={(event) => event.target.files && addFiles(event.target.files)}
          />
        </label>

        <div className="audio-scrollbar mt-6 grid max-h-[520px] gap-3 overflow-auto pr-1">
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
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-white/50">
                    {stem.kind}
                  </span>
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
