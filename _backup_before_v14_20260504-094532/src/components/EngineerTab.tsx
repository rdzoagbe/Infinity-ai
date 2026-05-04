import JSZip from 'jszip';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Download, Gauge, Pause, Play, Radio, SlidersHorizontal, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project, Stem } from '../types';
import { clamp } from '../utils';

interface EngineerTabProps {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
}

interface StemAudioNode {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';
const stageWidth = 640;
const stageHeight = 360;
const tokenSize = 68;

const stemColor = (kind: Stem['kind']) => {
  if (kind === 'vocal') return 'border-cyan/50 bg-cyan/20 text-cyan shadow-cyan';
  if (kind === 'beat') return 'border-magenta/50 bg-magenta/20 text-magenta shadow-magenta';
  return 'border-white/15 bg-white/10 text-white/75';
};

const safeFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'audiomagic';

const fetchBlob = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${url}`);
  return response.blob();
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function EngineerTab({ project, onProjectChange }: EngineerTabProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [compareMode, setCompareMode] = useState<'raw' | 'ai'>('raw');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const masterRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const nodesRef = useRef<Record<string, StemAudioNode>>({});
  const lastPlaybackTimeRef = useRef(0);

  const rawSource = useMemo(() => project.rawMasterUrl ?? project.stems[0]?.url, [project.rawMasterUrl, project.stems]);
  const aiSource = useMemo(
    () => project.aiMasterUrl ?? project.stems.find((stem) => stem.kind === 'beat')?.url ?? rawSource,
    [project.aiMasterUrl, project.stems, rawSource],
  );

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  };

  const wireStemNode = (stem: Stem) => {
    const element = audioElementsRef.current[stem.id];
    if (!element) return;

    if (!nodesRef.current[stem.id]) {
      const context = getAudioContext();
      const source = context.createMediaElementSource(element);
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      source.connect(gain).connect(panner).connect(context.destination);
      nodesRef.current[stem.id] = { source, gain, panner };
    }

    nodesRef.current[stem.id].gain.gain.value = stem.gain;
    nodesRef.current[stem.id].panner.pan.value = stem.pan;
  };

  useEffect(() => {
    project.stems.forEach((stem) => {
      if (nodesRef.current[stem.id]) {
        nodesRef.current[stem.id].gain.gain.value = stem.gain;
        nodesRef.current[stem.id].panner.pan.value = stem.pan;
      }
    });
  }, [project.stems]);

  const pauseAll = () => {
    Object.values(audioElementsRef.current).forEach((element) => element.pause());
    masterRef.current?.pause();
  };

  const seekStemMix = (time: number) => {
    project.stems.forEach((stem) => {
      const element = audioElementsRef.current[stem.id];
      if (element && Number.isFinite(element.duration)) {
        element.currentTime = clamp(time, 0, Math.max(0, element.duration - 0.05));
      }
    });
  };

  const playStemMix = async (time: number) => {
    if (!project.stems.length) return;
    const context = getAudioContext();
    await context.resume();
    seekStemMix(time);
    await Promise.all(
      project.stems.map(async (stem) => {
        const element = audioElementsRef.current[stem.id];
        if (!element) return;
        wireStemNode(stem);
        element.volume = 1;
        try {
          await element.play();
        } catch {
          // The browser may block autoplay if the action was not user initiated.
        }
      }),
    );
  };

  const playMaster = async (src: string | undefined, time: number) => {
    const audio = masterRef.current;
    if (!audio || !src) return;

    if (audio.src !== src) {
      audio.src = src;
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
        audio.load();
      });
    }

    if (Number.isFinite(audio.duration)) {
      audio.currentTime = clamp(time, 0, Math.max(0, audio.duration - 0.05));
    }

    try {
      await audio.play();
    } catch {
      // Browser gesture policies can reject playback; UI state remains recoverable.
    }
  };

  const currentPlaybackTime = () => {
    if (compareMode === 'ai') return masterRef.current?.currentTime ?? lastPlaybackTimeRef.current;
    const firstStem = project.stems[0];
    const firstElement = firstStem ? audioElementsRef.current[firstStem.id] : undefined;
    return firstElement?.currentTime ?? masterRef.current?.currentTime ?? lastPlaybackTimeRef.current;
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      lastPlaybackTimeRef.current = currentPlaybackTime();
      pauseAll();
      setIsPlaying(false);
      return;
    }

    const time = lastPlaybackTimeRef.current;
    if (compareMode === 'raw' && project.stems.length) {
      await playStemMix(time);
    } else {
      await playMaster(compareMode === 'raw' ? rawSource : aiSource, time);
    }
    setIsPlaying(true);
  };

  const switchCompareMode = async (nextMode: 'raw' | 'ai') => {
    if (nextMode === compareMode) return;

    const time = currentPlaybackTime();
    const wasPlaying = isPlaying;
    lastPlaybackTimeRef.current = time;
    pauseAll();
    setCompareMode(nextMode);

    if (wasPlaying) {
      if (nextMode === 'raw' && project.stems.length) {
        await playStemMix(time);
      } else {
        await playMaster(nextMode === 'raw' ? rawSource : aiSource, time);
      }
      setIsPlaying(true);
    }
  };

  const updateStemPosition = (stem: Stem, info: PanInfo) => {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const x = clamp(info.point.x - rect.left - tokenSize / 2, 8, stageWidth - tokenSize - 8);
    const y = clamp(info.point.y - rect.top - tokenSize / 2, 8, stageHeight - tokenSize - 8);
    const centerX = x + tokenSize / 2;
    const centerY = y + tokenSize / 2;
    const pan = clamp((centerX / stageWidth) * 2 - 1, -1, 1);
    const gain = clamp(1.12 - centerY / stageHeight, 0.18, 1);

    const updatedStems = project.stems.map((candidate) =>
      candidate.id === stem.id
        ? {
            ...candidate,
            position: { x, y },
            pan,
            gain,
          }
        : candidate,
    );

    onProjectChange({ stems: updatedStems, status: 'Mixing' });
  };

  const triggerZipDownload = async () => {
    const zip = new JSZip();
    const projectSlug = safeFileName(project.trackName);

    zip.file('lyrics.txt', project.lyrics || 'No lyrics written yet.');
    zip.file(
      'project.json',
      JSON.stringify(
        {
          project: project.trackName,
          exportedAt: new Date().toISOString(),
          stems: project.stems.map((stem) => ({
            name: stem.name,
            fileName: stem.fileName,
            kind: stem.kind,
            pan: stem.pan,
            gain: stem.gain,
            position: stem.position,
          })),
          masters: {
            raw: Boolean(rawSource),
            aiMaster: Boolean(aiSource),
          },
        },
        null,
        2,
      ),
    );

    const stemFolder = zip.folder('stems');
    await Promise.all(
      project.stems.map(async (stem, index) => {
        try {
          const blob = await fetchBlob(stem.url);
          const fallbackExtension = blob.type.includes('webm') ? 'webm' : blob.type.includes('wav') ? 'wav' : 'audio';
          const fileName = safeFileName(stem.fileName ?? `${String(index + 1).padStart(2, '0')}-${stem.name}.${fallbackExtension}`);
          stemFolder?.file(fileName, blob);
        } catch {
          stemFolder?.file(
            `${String(index + 1).padStart(2, '0')}-${safeFileName(stem.name)}.txt`,
            `This stem could not be embedded from its browser object URL.\nStem: ${stem.name}\nKind: ${stem.kind}`,
          );
        }
      }),
    );

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${projectSlug}-audiomagic-export.zip`);
  };

  const vocalCount = project.stems.filter((stem) => stem.kind === 'vocal').length;
  const beatCount = project.stems.filter((stem) => stem.kind === 'beat').length;

  return (
    <div className="grid gap-5">
      <section className="rounded-[2rem] border border-cyan/10 bg-glass/80 p-5 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Producer Handoff</p>
            <h2 className="mt-2 text-2xl font-semibold">Musical visual dashboard for final adjustment</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              The producer handoff arrives here with lyrics, beat direction, stems, and arrangement notes. Drag each sound source in the Sonic Stage to adjust stereo position and depth before export.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2 text-center">
            {[
              ['Vocals', vocalCount],
              ['Beats', beatCount],
              ['Stems', project.stems.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/5 bg-black/25 p-3">
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{label}</p>
              </div>
            ))}
          </div>
        </div>
        {project.arrangement && (
          <div className="mt-5 whitespace-pre-line rounded-3xl border border-magenta/20 bg-magenta/10 p-4 text-sm leading-6 text-white/55">
            <div className="mb-2 flex items-center gap-2 font-semibold text-magenta">
              <Gauge className="h-4 w-4" /> Producer arrangement
            </div>
            {project.arrangement}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className={panel}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Sonic Stage</p>
            <h2 className="mt-2 text-2xl font-semibold">Spatial Mixing Console</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Drag tokens horizontally to pan left/right and vertically to change perceived depth. Each movement writes to StereoPannerNode and GainNode values.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-3 text-sm text-white/45">
            L/R pan · depth gain
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/5 bg-black/30 p-3">
          <div
            ref={stageRef}
            className="relative h-[360px] w-full overflow-hidden rounded-[1.5rem] border border-white/5 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.08),transparent_18rem),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:100%_100%,40px_40px,40px_40px]"
            style={{ maxWidth: stageWidth }}
          >
            <div className="absolute left-1/2 top-0 h-full w-px bg-cyan/20" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-magenta/20" />
            <div className="absolute left-4 top-4 text-xs uppercase tracking-[0.22em] text-white/25">Left</div>
            <div className="absolute right-4 top-4 text-xs uppercase tracking-[0.22em] text-white/25">Right</div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.22em] text-white/25">Deep</div>

            {project.stems.length === 0 && (
              <div className="grid h-full place-items-center text-center text-white/35">
                <div>
                  <Radio className="mx-auto mb-3 h-8 w-8 text-cyan/70" />
                  Add or record stems to unlock spatial mixing.
                </div>
              </div>
            )}

            {project.stems.map((stem) => (
              <motion.div
                key={stem.id}
                drag
                dragMomentum={false}
                dragConstraints={stageRef}
                onDragEnd={(_, info) => updateStemPosition(stem, info)}
                className={`absolute grid h-[68px] w-[68px] cursor-grab place-items-center rounded-3xl border text-center text-[11px] font-semibold active:cursor-grabbing ${stemColor(stem.kind)}`}
                style={{ left: stem.position.x, top: stem.position.y }}
                whileHover={{ scale: 1.06 }}
                whileDrag={{ scale: 1.12 }}
              >
                <span className="line-clamp-2 px-2">{stem.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {project.stems.map((stem) => (
            <div key={stem.id} className="rounded-3xl border border-white/5 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{stem.name}</p>
                  <p className="text-xs text-white/35 capitalize">{stem.kind}</p>
                </div>
                <Volume2 className="h-4 w-4 text-cyan" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/50">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3">Pan: {stem.pan.toFixed(2)}</div>
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3">Gain: {stem.gain.toFixed(2)}</div>
              </div>
              <audio
                ref={(element) => {
                  if (element) audioElementsRef.current[stem.id] = element;
                }}
                src={stem.url}
                preload="auto"
                hidden
              />
            </div>
          ))}
        </div>
      </section>

      <section className={panel}>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan">Master Engine</p>
          <h2 className="mt-2 text-2xl font-semibold">Console & Export</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Compare raw playback with an AI master while preserving currentTime across source swaps.
          </p>
        </div>

        <div className="mt-6 rounded-[2rem] border border-white/5 bg-black/25 p-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="grid h-20 w-20 place-items-center rounded-full border border-cyan/40 bg-cyan text-black shadow-cyan transition hover:shadow-[0_0_60px_rgba(0,229,255,0.45)]"
            >
              {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9 translate-x-0.5" />}
            </button>

            <div className="flex-1">
              <p className="font-semibold">{compareMode === 'raw' ? 'Raw Stem Mix' : 'AI Master Preview'}</p>
              <p className="mt-1 text-sm text-white/40">
                {isPlaying ? 'Playback active' : 'Ready'} · {project.stems.length} linked stem{project.stems.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className={`mt-6 flex h-24 items-end justify-center gap-1.5 rounded-3xl border border-white/5 bg-white/[0.03] p-5 ${isPlaying ? 'wave-active' : ''}`}>
            {Array.from({ length: 28 }).map((_, index) => (
              <span
                key={index}
                className="wave-bar w-1.5 rounded-full bg-cyan shadow-cyan"
                style={{ height: `${18 + ((index * 11) % 54)}px`, animationDelay: `${index * 42}ms` }}
              />
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-white/5 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/75">
              <Gauge className="h-4 w-4 text-magenta" /> Time-Synced A/B Compare
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-white/5 p-1">
              {(['raw', 'ai'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchCompareMode(mode)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    compareMode === mode ? 'bg-magenta text-black shadow-magenta' : 'text-white/45 hover:text-white'
                  }`}
                >
                  {mode === 'raw' ? 'Raw' : 'AI Master'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[2rem] border border-white/5 bg-black/25 p-5">
          <div className="flex items-center gap-2 text-cyan">
            <SlidersHorizontal className="h-4 w-4" />
            <p className="font-semibold">Deliverables</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Export simulation packages stem metadata, mix positions, and master availability into a downloadable ZIP-named blob.
          </p>
          <motion.button
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={triggerZipDownload}
            className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-cyan/45 bg-cyan px-5 py-4 font-black tracking-[0.18em] text-black shadow-cyan transition hover:shadow-[0_0_60px_rgba(0,229,255,0.48)]"
          >
            <Download className="h-5 w-5" /> DOWNLOAD ALL
          </motion.button>
        </div>

        <audio ref={masterRef} hidden onEnded={() => setIsPlaying(false)} />
      </section>
      </div>
    </div>
  );
}
