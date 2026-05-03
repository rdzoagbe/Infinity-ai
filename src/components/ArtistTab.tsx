import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, Bot, Copy, FileAudio, Mic, MicOff, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Project, Stem } from '../types';
import { createHistoryEvent, createRecordingTake, id, nowLabel } from '../utils';

interface ArtistTabProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';
const sectionOptions = ['Verse 1', 'Hook', 'Verse 2', 'Bridge', 'Final Hook', 'Full Song'];

const buildSuggestions = (lyrics: string) => {
  const cleanWords = lyrics
    .toLowerCase()
    .replace(/[^a-z0-9\s']/gi, '')
    .split(/\s+/)
    .filter(Boolean);
  const lastWord = cleanWords.at(-1) ?? 'night';

  return [
    `Rhyme cloud for “${lastWord}”: light, flight, ignite, satellite, appetite`,
    `Next line idea: “I turn the silence into something that can breathe.”`,
    `Chorus seed: “I feel the magic in the frequency / every scar becomes a melody.”`,
  ];
};

export default function ArtistTab({ project, onProjectChange }: ArtistTabProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [voiceCloneEnabled, setVoiceCloneEnabled] = useState(false);
  const [countInEnabled, setCountInEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [targetSection, setTargetSection] = useState(sectionOptions[1]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const metronomeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording || !metronomeEnabled) {
      if (metronomeRef.current) window.clearInterval(metronomeRef.current);
      metronomeRef.current = null;
      return;
    }

    metronomeRef.current = window.setInterval(() => {
      // This is intentionally visual-first for the MVP; the actual click can be added with Web Audio later.
    }, Math.max(250, Math.round(60000 / (project.bpm ?? 104))));

    return () => {
      if (metronomeRef.current) window.clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    };
  }, [isRecording, metronomeEnabled, project.bpm]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      void startRecordingNow();
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 750);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const updateLyrics = (lyrics: string) => {
    onProjectChange({ lyrics, status: lyrics.trim() ? 'Writing' : project.status });
  };

  const requestSuggestions = () => {
    onProjectChange({ coWriterSuggestions: buildSuggestions(project.lyrics), status: 'Writing' });
  };

  const startRecordingNow = async () => {
    setRecordingError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('This browser does not support MediaRecorder. Use Chrome, Edge, or another compatible browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const takeNumber = (project.recordingTakes ?? []).filter((take) => take.section === targetSection).length + 1;
        const vocalStem: Stem = {
          id: id('stem'),
          name: `${targetSection} Take ${takeNumber}`,
          kind: 'vocal',
          url,
          fileName: `${targetSection.toLowerCase().replace(/\s+/g, '-')}-take-${takeNumber}.webm`,
          pan: 0,
          gain: 0.92,
          position: { x: 240, y: 105 },
          createdAt: nowLabel(),
        };
        const take = createRecordingTake(vocalStem.name, targetSection, vocalStem.id, 'Captured in v5 Recording Booth with count-in and session metadata.');

        stream.getTracks().forEach((track) => track.stop());
        onProjectChange({
          stems: [vocalStem, ...project.stems],
          recordingTakes: [{ ...take, selected: (project.recordingTakes ?? []).length === 0 }, ...(project.recordingTakes ?? [])],
          activeTakeId: take.id,
          status: 'Recording',
          rawMasterUrl: project.rawMasterUrl ?? url,
          sessionHistory: [createHistoryEvent(`${vocalStem.name} recorded in Artist Booth.`, 'Artist'), ...(project.sessionHistory ?? [])].slice(0, 14),
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Unable to start recording.');
    }
  };

  const startRecording = () => {
    if (countInEnabled) {
      setCountdown(4);
      return;
    }
    void startRecordingNow();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelCountdown = () => setCountdown(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className={panel}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Smart Notepad</p>
            <h2 className="mt-2 text-2xl font-semibold">Lyrics and co-writing</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={requestSuggestions}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-magenta/35 bg-magenta/10 px-4 py-3 text-sm font-semibold text-magenta shadow-magenta transition hover:bg-magenta hover:text-black"
          >
            <Wand2 className="h-4 w-4" /> AI Co-Writer
          </motion.button>
        </div>

        <textarea
          value={project.lyrics}
          onChange={(event) => updateLyrics(event.target.value)}
          placeholder="Write the verse, hook, topline ideas, ad-libs, or emotional references..."
          className="audio-scrollbar mt-5 min-h-[420px] w-full resize-none rounded-3xl border border-white/5 bg-black/30 p-5 text-base leading-8 text-white outline-none transition placeholder:text-white/25 focus:border-cyan/30 focus:shadow-cyan"
        />

        <AnimatePresence>
          {project.coWriterSuggestions.length > 0 && (
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="mt-5 rounded-3xl border border-magenta/20 bg-magenta/10 p-4"
            >
              <div className="flex items-center gap-2 text-magenta">
                <Bot className="h-4 w-4" />
                <p className="text-sm font-semibold">AI Co-Writer Suggestions</p>
              </div>
              <div className="mt-3 grid gap-3">
                {project.coWriterSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => updateLyrics(`${project.lyrics}${project.lyrics.endsWith('\n') || !project.lyrics ? '' : '\n'}${suggestion.replace(/^.*?:\s*/, '')}`)}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 p-3 text-left text-sm text-white/75 transition hover:border-magenta/30 hover:text-white"
                  >
                    <span>{suggestion}</span>
                    <Copy className="mt-0.5 h-4 w-4 shrink-0 text-white/30 group-hover:text-magenta" />
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </section>

      <section className={panel}>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan">v5 Recording Booth</p>
          <h2 className="mt-2 text-2xl font-semibold">Countdown, metronome, takes</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Capture takes by song section. Each recording becomes a vocal stem and a take record for selection, notes, and approvals.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-white/50">
            Recording section
            <select value={targetSection} onChange={(event) => setTargetSection(event.target.value)} className="rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan/35">
              {sectionOptions.map((section) => <option key={section}>{section}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCountInEnabled((value) => !value)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${countInEnabled ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/5 text-white/45'}`}>
              4-count in
            </button>
            <button type="button" onClick={() => setMetronomeEnabled((value) => !value)} className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${metronomeEnabled ? 'border-magenta/30 bg-magenta/10 text-magenta' : 'border-white/10 bg-white/5 text-white/45'}`}>
              Metronome {project.bpm ?? 104}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center rounded-[2rem] border border-white/5 bg-black/25 p-8">
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-6 grid h-24 w-24 place-items-center rounded-full border border-cyan/40 bg-cyan/10 text-5xl font-black text-cyan shadow-cyan"
              >
                {countdown || 'GO'}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={countdown !== null ? cancelCountdown : isRecording ? stopRecording : startRecording}
            whileTap={{ scale: 0.94 }}
            animate={{
              boxShadow: isRecording
                ? '0 0 70px rgba(255,0,255,0.42)'
                : countdown !== null
                  ? '0 0 70px rgba(0,229,255,0.45)'
                  : '0 0 60px rgba(0,229,255,0.30)',
            }}
            className={`grid h-44 w-44 place-items-center rounded-full border text-black transition ${
              isRecording
                ? 'border-magenta/60 bg-magenta shadow-magenta'
                : 'border-cyan/60 bg-cyan shadow-cyan hover:shadow-[0_0_82px_rgba(0,229,255,0.45)]'
            }`}
            aria-label={isRecording ? 'Stop recording' : countdown !== null ? 'Cancel countdown' : 'Start recording'}
          >
            {isRecording ? <MicOff className="h-16 w-16" /> : <Mic className="h-16 w-16" />}
          </motion.button>
          <p className="mt-6 text-lg font-semibold">{countdown !== null ? `Count-in for ${targetSection}` : isRecording ? `Recording ${targetSection}…` : `Record ${targetSection}`}</p>
          <p className="mt-2 max-w-sm text-center text-sm text-white/40">
            Browser permission is required. Stop recording to publish the vocal take to the shared session state.
          </p>
          {recordingError && <p className="mt-4 text-center text-sm text-red-300">{recordingError}</p>}
        </div>

        <div className="mt-5 rounded-3xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-cyan">
            <AudioLines className="h-4 w-4" />
            <p className="font-semibold">Take log</p>
          </div>
          <div className="mt-4 grid gap-3">
            {(project.recordingTakes ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-white/35">
                No takes yet. Record one to populate the v5 take manager.
              </div>
            ) : (
              (project.recordingTakes ?? []).slice(0, 4).map((take) => (
                <div key={take.id} className={`rounded-2xl border p-3 ${take.selected ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-white/5'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{take.name}</p>
                      <p className="mt-1 text-xs text-white/35">{take.section} · {take.createdAt}</p>
                    </div>
                    <FileAudio className="h-4 w-4 text-cyan" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Voice Cloning Consent Mode</p>
              <p className="mt-1 text-sm text-white/40">A safe placeholder for future model-training consent UX.</p>
            </div>
            <button
              type="button"
              onClick={() => setVoiceCloneEnabled((value) => !value)}
              className={`h-8 w-14 rounded-full border p-1 transition ${
                voiceCloneEnabled ? 'border-cyan/50 bg-cyan/20' : 'border-white/10 bg-white/5'
              }`}
              aria-label="Toggle voice cloning consent mode"
            >
              <span
                className={`block h-5 w-5 rounded-full transition ${
                  voiceCloneEnabled ? 'translate-x-6 bg-cyan shadow-cyan' : 'bg-white/50'
                }`}
              />
            </button>
          </div>

          {voiceCloneEnabled && (
            <div className="mt-4 rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm leading-6 text-white/70">
              <div className="mb-2 flex items-center gap-2 font-semibold text-cyan">
                <Sparkles className="h-4 w-4" /> Consent Script
              </div>
              “I confirm this is my voice. I grant AudioMagic.ai permission to create a private voice model for this project only. I can revoke this consent at any time.”
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
