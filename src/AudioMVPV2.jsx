import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, CloudUpload, Copy, Download, RefreshCw, Share2, Sparkles, X } from 'lucide-react';
import {
  API_BASE,
  analyzeAudioOnBackend,
  backendUrl,
  checkBackendHealth,
  cleanFullMixOnBackend,
  enhanceMixOnBackend,
  masterAudioOnBackend,
  pollUntilComplete,
  previewStyleOnBackend,
  separateStemsOnBackend,
  analyzeAiOnBackend,
  fetchFileInfo,
  transformStyleOnBackend,
  uploadAudioToBackend,
  uploadAndMeasureLufsOnBackend,
} from './api/infinityBackend.js';
import { exportPackageOnBackend } from './api/infinityBackend.js';
import VocalBeatMixer from './studio/VocalBeatMixer.jsx';
import AnalysisPanel, { QcComparison } from './studio/AnalysisPanel.jsx';
import ABPlayer from './studio/ABPlayer.jsx';

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Shape' },
  { id: 3, label: 'Master' },
];

const PLATFORMS = [
  { id: 'spotify',    label: 'Spotify',     lufs: '-14 LUFS' },
  { id: 'apple',      label: 'Apple Music', lufs: '-16 LUFS' },
  { id: 'youtube',    label: 'YouTube',     lufs: '-14 LUFS' },
  { id: 'soundcloud', label: 'SoundCloud',  lufs: '-10 LUFS' },
  { id: 'tidal',      label: 'Tidal',       lufs: '-14 LUFS' },
];

const MODES = ['Custom AI adaptive', 'Trap', 'Afrobeat', 'Drill', 'House', 'Gospel', 'Cinematic', 'Soul', 'Experimental'];

const MODE_DESCRIPTIONS = {
  'Custom AI adaptive': { color: '#55e9ff', tags: ['Balanced EQ', '2.4:1 compression', 'Wide stereo'],       detail: 'All-rounder — works for any genre. Gentle presence lift, balanced low end, cohesive glue compression.' },
  'Trap':               { color: '#b78aff', tags: ['Sub punch +65Hz', 'Bright highs +10kHz', '4:1 glue'],    detail: 'Heavy sub at 65 Hz, mud cut at 200 Hz, airy 10 kHz sparkle. Aggressive 4:1 compression.' },
  'Afrobeat':           { color: '#57f09c', tags: ['Groove +280Hz', 'Kick punch +80Hz', 'Vocal +4kHz'],      detail: 'Warm low-mids for groove, kick punch, vocal cut-through. Musical 2.5:1 with natural transients.' },
  'Drill':              { color: '#ff6b6b', tags: ['Deep sub +55Hz', 'Dark top-end', '5:1 hard'],            detail: 'Deep 55 Hz sub, 3 kHz harshness cut, dark top. Hardest compression (5:1) — punchy and unforgiving.' },
  'House':              { color: '#ffcf66', tags: ['Kick +85Hz', 'Energy +3.5kHz', '3.5:1 pumping'],         detail: 'Kick-focused low end, boxiness cut, driving 3.5 kHz. Pumping 3.5:1 for that club-ready feel.' },
  'Gospel':             { color: '#ffa8f0', tags: ['Vocal warmth +200Hz', 'Choir +4kHz', 'Gentle 2:1'],      detail: 'Warm vocal body, choir presence and air. Gentlest dynamics (2:1) — full range, emotion preserved.' },
  'Cinematic':          { color: '#a8d8ff', tags: ['Widest stereo', 'Air +12kHz', 'Soft 1.6:1'],             detail: 'Tightest sub, maximum stereo width, orchestral air shelf. Most dynamic range of all styles.' },
  'Soul':               { color: '#ffb347', tags: ['Vintage +350Hz', 'Silky +4.5kHz', 'Smooth 2.2:1'],       detail: 'Vintage low-mid warmth, silky upper-mids. Transparent 2.2:1 — polished, not processed.' },
  'Experimental':       { color: '#c8ff66', tags: ['Wide dynamics', 'Extra stereo', 'Creative space'],        detail: 'Balanced foundation with extra width and air. Less predictable, more open sonic character.' },
};

const HIT_HARDER_TIPS = [
  'Presence lift (+1.5 dB at 3.5 kHz) — vocals cut through without raising volume.',
  'Room depth (aecho reverb) — sits the mix in a space instead of sounding flat.',
  'Stereo widening — beat feels bigger, more immersive.',
  'Bus compression + limiter — glues everything into one cohesive sound.',
  'Sibilance control (−1.5 dB at 8 kHz) — removes harshness on the master.',
  'Stereo width on master scales with strength — wider as you push harder.',
];

const HISTORY_KEY = 'infinity_master_history';
const TEMPLATES_KEY = 'infinity_mix_templates';
const SESSION_KEY = 'infinity_studio_session_v1';
const RECENT_FILES_KEY = 'infinity_recent_files_v1';

function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
function saveSession(data) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {} }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch {} }

function loadRecentFiles() { try { return JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || '[]'); } catch { return []; } }
function addRecentFile(entry) {
  try {
    const list = loadRecentFiles().filter(f => f.file_id !== entry.file_id);
    list.unshift(entry);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {}
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveToHistory(entry) {
  try {
    const h = loadHistory();
    h.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 8)));
  } catch {}
}

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '{}'); } catch { return {}; }
}
function saveTemplate(genre, settings) {
  try {
    const t = loadTemplates();
    t[genre] = { ...settings, savedAt: new Date().toISOString() };
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t));
  } catch {}
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 520);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 520);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

function Waveform({ src, color = '#55e9ff' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!src || !canvasRef.current) return;
    let cancelled = false;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => ac.decodeAudioData(buf))
      .then(decoded => {
        if (cancelled || !canvasRef.current) return;
        const data = decoded.getChannelData(0);
        const canvas = canvasRef.current;
        const W = canvas.offsetWidth || 560;
        const H = 52;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const step = Math.ceil(data.length / W);
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, color + 'aa');
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, color + 'aa');
        ctx.fillStyle = grad;
        for (let i = 0; i < W; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0);
          const amp = Math.max(2, (sum / step) * H * 2.2);
          ctx.fillRect(i, (H - amp) / 2, 1, amp);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; ac.close().catch(() => {}); };
  }, [src, color]);
  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 52, borderRadius: 8, display: 'block', background: 'rgba(255,255,255,.03)' }}
    />
  );
}

function SpectrumAnalyzer({ src, color = '#b78aff' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!src || !canvasRef.current) return;
    let cancelled = false;
    let animId = null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    let sourceNode = null;
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => ac.decodeAudioData(buf))
      .then(decoded => {
        if (cancelled || !canvasRef.current) return;
        sourceNode = ac.createBufferSource();
        sourceNode.buffer = decoded;
        sourceNode.loop = true;
        const analyser = ac.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.82;
        const gain = ac.createGain();
        gain.gain.value = 0;
        sourceNode.connect(analyser);
        analyser.connect(gain);
        gain.connect(ac.destination);
        sourceNode.start(0, decoded.duration * 0.12);
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const canvas = canvasRef.current;
        const BARS = 64;
        const draw = () => {
          if (cancelled || !canvasRef.current) return;
          animId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(freqData);
          const W = canvas.offsetWidth || 560;
          const H = 72;
          if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, W, H);
          const nyquist = ac.sampleRate / 2;
          const logMin = Math.log10(30);
          const logMax = Math.log10(nyquist);
          for (let i = 0; i < BARS; i++) {
            const logFreq = logMin + (i / BARS) * (logMax - logMin);
            const freq = Math.pow(10, logFreq);
            const binIdx = Math.min(Math.round((freq / nyquist) * freqData.length), freqData.length - 1);
            const val = freqData[binIdx] / 255;
            const bH = Math.max(2, val * H * 0.96);
            const bW = Math.max(1, W / BARS - 1);
            const grad = ctx.createLinearGradient(0, H - bH, 0, H);
            grad.addColorStop(0, color);
            grad.addColorStop(1, color + '33');
            ctx.fillStyle = grad;
            ctx.fillRect(i * (W / BARS), H - bH, bW, bH);
          }
        };
        draw();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (sourceNode) { try { sourceNode.stop(); } catch {} }
      ac.close().catch(() => {});
    };
  }, [src, color]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: 72, borderRadius: 8, display: 'block', background: 'rgba(255,255,255,.03)', marginBottom: 8 }} />;
}

// Plays audio via Web Audio API with an optional gain offset (dB) for loudness matching.
// gainDb < 0 attenuates — used to bring the louder master down to the original's level.
function LoudnessMatchedPlayer({ src, gainDb = 0, color = '#b78aff' }) {
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);
  const acRef = useRef(null);
  const sourceConnectedRef = useRef(false);

  // Build/rebuild the Web Audio graph whenever src changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    // Tear down previous context
    if (acRef.current) { acRef.current.close().catch(() => {}); }
    sourceConnectedRef.current = false;

    const ac = new Ctx();
    acRef.current = ac;
    const gainNode = ac.createGain();
    gainNode.gain.value = Math.pow(10, gainDb / 20);
    gainNode.connect(ac.destination);
    gainNodeRef.current = gainNode;

    const mediaSource = ac.createMediaElementSource(audio);
    mediaSource.connect(gainNode);
    sourceConnectedRef.current = true;

    // Resume context on first play (browser autoplay policy)
    const resume = () => { if (ac.state === 'suspended') ac.resume().catch(() => {}); };
    audio.addEventListener('play', resume);
    return () => {
      audio.removeEventListener('play', resume);
      ac.close().catch(() => {});
    };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply gain change without rebuilding the graph
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.pow(10, gainDb / 20);
    }
  }, [gainDb]);

  return (
    <audio
      ref={audioRef}
      key={src}
      controls
      src={src}
      style={{ width: '100%', marginTop: 8 }}
    />
  );
}

function ProgressBar({ progress, label, color = '#55e9ff' }) {
  if (progress == null) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13 }}>
        <span style={{ color: 'rgba(245,248,255,.72)', lineHeight: 1.4 }}>{label || 'Processing…'}</span>
        <b style={{ color, flexShrink: 0, marginLeft: 10 }}>{progress}%</b>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${color}aa,${color})`, borderRadius: 99, transition: 'width 0.4s ease-out' }} />
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(6,8,18,.93)', overflowY: 'auto', padding: '12px 8px' };
const card = { border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 18 };
const cardGreen = { ...card, border: '1px solid rgba(87,240,156,.28)', background: 'rgba(87,240,156,.06)' };

function safeError(e) { return e?.message || String(e || 'Unknown error'); }
function _lufsLabel(platform) {
  return { spotify: '-14', apple: '-16', youtube: '-14', soundcloud: '-10', tidal: '-14' }[platform] ?? '-14';
}
function formatBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

const STEP_LABELS = { 1: 'Upload', 2: 'Shape your sound', 3: 'Master & Download' };

function StepBar({ current, isMobile }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.18)', padding: isMobile ? '10px 16px' : '12px 28px', alignItems: 'center', gap: 0 }}>
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        const color = done ? '#57f09c' : active ? '#55e9ff' : 'rgba(245,248,255,.28)';
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${color}`, background: done ? '#57f09c22' : active ? '#55e9ff18' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>
                {done ? <CheckCircle2 size={12} /> : s.id}
              </div>
              <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: active ? 800 : 500, color, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? '#57f09c44' : 'rgba(255,255,255,.08)', margin: '0 10px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBox({ message, error, busy }) {
  if (!message && !error) return null;
  const isErr = Boolean(error);
  return (
    <div style={{ border: `1px solid ${isErr ? 'rgba(255,90,90,.35)' : busy ? 'rgba(85,233,255,.28)' : 'rgba(87,240,156,.28)'}`, background: isErr ? 'rgba(255,90,90,.09)' : busy ? 'rgba(85,233,255,.06)' : 'rgba(87,240,156,.06)', color: isErr ? '#ffd8d8' : '#f5f8ff', borderRadius: 14, padding: '11px 14px', marginTop: 14, fontSize: 14, lineHeight: 1.6 }}>
      {error || message}
    </div>
  );
}

function NavRow({ onBack, nextLabel, onNext, nextDisabled, secondaryLabel, onSecondary }) {
  return (
    <div className="actions" style={{ marginTop: 22 }}>
      {onBack && <button className="secondary" onClick={onBack}>← Back</button>}
      {onSecondary && <button className="secondary" onClick={onSecondary}>{secondaryLabel}</button>}
      {onNext && <button className="primary" onClick={onNext} disabled={nextDisabled}>{nextLabel || 'Next →'}</button>}
    </div>
  );
}

export default function AudioMVPV2({ open, onClose, embedded = false, projectId = null }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [backendOnline, setBackendOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState('');

  // project
  const [projectName, setProjectName] = useState('');

  // upload
  const [songFile, setSongFile] = useState(null);
  const [songBackend, setSongBackend] = useState(null);
  const [songUrl, setSongUrl] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [recentFiles, setRecentFiles] = useState(() => loadRecentFiles());

  // clean
  const [cleanJob, setCleanJob] = useState(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState('');

  // mix
  const [presenceBoost, setPresenceBoost] = useState(true);
  const [reverbAmount, setReverbAmount] = useState(0.2);
  const [stereoWidth, setStereoWidth] = useState(1.3);
  const [busCompress, setBusCompress] = useState(true);
  const [enhanceJob, setEnhanceJob] = useState(null);
  const [enhancedFileId, setEnhancedFileId] = useState(null);
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState('');

  // master
  const [platform, setPlatform] = useState('spotify');
  const [mode, setMode] = useState('Custom AI adaptive');
  const [strength, setStrength] = useState(72);
  const [warmth, setWarmth] = useState(30);   // 0–100 displayed, sent as 0.0–1.0
  const [lowEq, setLowEq] = useState(0);
  const [midEq, setMidEq] = useState(0);
  const [highEq, setHighEq] = useState(0);
  const [masterTargetLufs, setMasterTargetLufs] = useState(null);  // null = automatic platform/genre blend
  const [masterTpCeiling, setMasterTpCeiling] = useState(null);    // null = automatic (-1 dBTP)

  // style preview (Step 3)
  const [stylePreviewUrl, setStylePreviewUrl] = useState('');
  const [stylePreviewBusy, setStylePreviewBusy] = useState(false);

  // reference track
  const [refLufs, setRefLufs] = useState(null);
  const [refBusy, setRefBusy] = useState(false);

  // import mode: 'song' (finished recording) | 'vocalbeat' (separate vocal + beat)
  const [uploadMode, setUploadMode] = useState('song');

  // mix templates (learn from past masters)
  const [templates, setTemplates] = useState(() => loadTemplates());

  // real-time job progress
  const [cleanProgress, setCleanProgress] = useState(null);
  const [cleanProgressMsg, setCleanProgressMsg] = useState('');
  const [enhanceProgress, setEnhanceProgress] = useState(null);
  const [enhanceProgressMsg, setEnhanceProgressMsg] = useState('');
  const [masterProgress, setMasterProgress] = useState(null);
  const [masterProgressMsg, setMasterProgressMsg] = useState('');
  const [styleProgress, setStyleProgress] = useState(null);
  const [styleProgressMsg, setStyleProgressMsg] = useState('');

  const [masterJob, setMasterJob] = useState(null);
  const [stemJob, setStemJob] = useState(null);
  const [stemBusy, setStemBusy] = useState(false);
  const [stemProgress, setStemProgress] = useState(null);
  const [stemProgressMsg, setStemProgressMsg] = useState('');
  const [masterCacheBust, setMasterCacheBust] = useState(0);
  const [abMode, setAbMode] = useState('master'); // 'original' | 'master'

  // history
  const [history, setHistory] = useState(() => loadHistory());

  // UI state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [transformJob, setTransformJob] = useState(null);
  const [transformProgress, setTransformProgress] = useState(null);
  const [transformProgressMsg, setTransformProgressMsg] = useState('');

  const [aiAnalysisJob, setAiAnalysisJob] = useState(null);
  const [aiAnalysisBusy, setAiAnalysisBusy] = useState(false);
  const [aiAnalysisProgress, setAiAnalysisProgress] = useState(null);

  const [restoredName, setRestoredName] = useState('');
  const [exportPack, setExportPack] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const songUrlRef = useRef('');

  // Save session whenever key state changes
  useEffect(() => {
    if (!songBackend?.file_id) return;
    saveSession({ songBackend, projectName, mode, platform, strength, warmth, savedAt: new Date().toISOString() });
  }, [songBackend, projectName, mode, platform, strength, warmth]);

  // Restore session when studio opens
  useEffect(() => {
    if (!open) return;
    checkBackendHealth().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false));
    if (songBackend?.file_id) return; // already has a song loaded
    // Restore master settings saved from a version's "restore settings"
    try {
      const restored = JSON.parse(localStorage.getItem('infinity_restored_master_params_v1') || 'null');
      if (restored) {
        if (restored.mode) setMode(restored.mode);
        if (restored.platform) setPlatform(restored.platform);
        if (restored.strength != null) setStrength(restored.strength);
        if (restored.warmth != null) setWarmth(Math.round(restored.warmth * 100));
        if (restored.lowEq != null) setLowEq(restored.lowEq);
        if (restored.midEq != null) setMidEq(restored.midEq);
        if (restored.highEq != null) setHighEq(restored.highEq);
        if (restored.targetLufs !== undefined) setMasterTargetLufs(restored.targetLufs);
        if (restored.tpCeiling !== undefined) setMasterTpCeiling(restored.tpCeiling);
        localStorage.removeItem('infinity_restored_master_params_v1');
      }
    } catch {}
    const saved = loadSession();
    if (!saved?.songBackend?.file_id) return;
    setSongBackend(saved.songBackend);
    if (saved.projectName) setProjectName(saved.projectName);
    if (saved.mode) setMode(saved.mode);
    if (saved.platform) setPlatform(saved.platform);
    if (saved.strength != null) setStrength(saved.strength);
    if (saved.warmth != null) setWarmth(saved.warmth);
    const name = saved.songBackend.filename || saved.songBackend.name || saved.projectName || 'previous track';
    setRestoredName(name);
  }, [open]);

  useEffect(() => () => {
    if (songUrlRef.current) URL.revokeObjectURL(songUrlRef.current);
  }, []);

  if (!open) return null;

  const expireSession = (badFileId) => {
    clearSession();
    if (badFileId) {
      try {
        const updated = loadRecentFiles().filter(f => f.file_id !== badFileId);
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
        setRecentFiles(updated);
      } catch {}
    }
    setSongBackend(null); setSongFile(null); setSongUrl(''); setRestoredName('');
    setStep(1);
    setError('Session expired — the server restarted. Please re-upload your track.');
  };

  const go = async (n) => {
    setError(''); setStatus('');
    if (n === 2 && songBackend?.file_id && !songFile) {
      // Validate the restored file still exists on the backend
      setBusy(true); setStatus('Checking session…');
      try {
        await fetchFileInfo(songBackend.file_id);
        setBusy(false); setStatus('');
        setStep(n);
      } catch {
        setBusy(false);
        expireSession(songBackend.file_id);
      }
      return;
    }
    setStep(n);
  };

  const handleShare = async (url, label) => {
    if (!url) return;
    if (navigator.share) {
      try { await navigator.share({ title: `${label} — Infinity Studio`, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(label);
      setTimeout(() => setCopied(''), 2200);
    } catch {}
  };

  const handleSongFile = async (file) => {
    setBusy(true); setError(''); setStatus('Uploading song...');
    setSongFile(file);
    const url = URL.createObjectURL(file);
    songUrlRef.current = url;
    setSongUrl(url);
    try {
      const res = await uploadAudioToBackend(file);
      setSongBackend(res.file);
      const fileRecord = {
        file_id: res.file.file_id,
        filename: file.name,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      addRecentFile(fileRecord);
      setRecentFiles(loadRecentFiles());
      window.dispatchEvent(new CustomEvent('infinity:project-file', {
        detail: {
          id: res.file.file_id,
          file_id: res.file.file_id,
          name: file.name,
          filename: file.name,
          size: file.size,
          size_bytes: file.size,
        },
      }));
      setStatus('Analysing loudness and track info…');
      try {
        const analysis = await analyzeAudioOnBackend(res.file.file_id);
        setAnalysisData(analysis?.result || analysis);
      } catch {}
      setStatus('Song uploaded — analysing done.');
      // Auto-clean in background so it's ready when user previews
      cleanFullMixOnBackend(res.file.file_id).then(init => {
        const jobId = init?.job_id;
        if (!jobId) { setCleanJob(init); return; }
        setCleanProgress(0); setCleanProgressMsg('Cleaning in background…');
        pollUntilComplete(jobId, (p, msg) => { setCleanProgress(p); setCleanProgressMsg(msg); })
          .then(done => { setCleanJob(done); setCleanProgress(null); })
          .catch(() => { setCleanProgress(null); });
      }).catch(() => {});
    } catch (err) {
      setError(`Upload failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRefFile = async (file) => {
    if (!file) return;
    setRefBusy(true); setRefLufs(null);
    try {
      const lufs = await uploadAndMeasureLufsOnBackend(file);
      setRefLufs(lufs);
    } catch {}
    finally { setRefBusy(false); }
  };


  const runClean = async () => {
    if (!songBackend?.file_id) return;
    setBusy(true); setError(''); setCleanProgress(0); setCleanProgressMsg('Starting…');
    try {
      const init = await cleanFullMixOnBackend(songBackend.file_id);
      const jobId = init?.job_id;
      if (jobId) {
        const done = await pollUntilComplete(jobId, (p, msg) => { setCleanProgress(p); setCleanProgressMsg(msg); });
        setCleanJob(done);
        const preview = done?.result?.downloads?.cleaned_mp3 || done?.result?.downloads?.cleaned_wav;
        if (preview) setCleanedPreviewUrl(backendUrl(preview));
      } else {
        setCleanJob(init);
        const preview = init?.result?.downloads?.cleaned_mp3 || init?.result?.downloads?.cleaned_wav;
        if (preview) setCleanedPreviewUrl(backendUrl(preview));
      }
      setStatus('Clean complete. Preview the result, then continue to mix.');
    } catch (err) {
      setError(`Cleaning failed: ${safeError(err)}`);
    } finally {
      setBusy(false); setCleanProgress(null);
    }
  };

  const runEnhance = async () => {
    if (!songBackend?.file_id) return;
    setBusy(true); setError(''); setEnhanceProgress(0); setEnhanceProgressMsg('Starting…');
    try {
      const init = await enhanceMixOnBackend(songBackend.file_id, presenceBoost, reverbAmount, stereoWidth, busCompress);
      const jobId = init?.job_id;
      let job = init;
      if (jobId) {
        job = await pollUntilComplete(jobId, (p, msg) => { setEnhanceProgress(p); setEnhanceProgressMsg(msg); });
      }
      setEnhanceJob(job);
      const mid = job?.result?.enhanced_file_id;
      if (mid) {
        setEnhancedFileId(mid);
        setEnhancedPreviewUrl(backendUrl(`/api/v1/files/${mid}/download/original`));
      }
      setStatus('Mix enhanced — listen to the preview below, then hit Next to master.');
    } catch (err) {
      setError(`Mix enhancement failed: ${safeError(err)}`);
    } finally {
      setBusy(false); setEnhanceProgress(null);
    }
  };

  const runStylePreview = async () => {
    const targetId = enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    setStylePreviewBusy(true); setError(''); setStyleProgress(0); setStyleProgressMsg('Starting…');
    try {
      const init = await previewStyleOnBackend(targetId, mode, strength, warmth / 100);
      const jobId = init?.job_id;
      let job = init;
      if (jobId) {
        job = await pollUntilComplete(jobId, (p, msg) => { setStyleProgress(p); setStyleProgressMsg(msg); });
      }
      const previewPath = job?.result?.downloads?.style_preview;
      if (previewPath) setStylePreviewUrl(`${backendUrl(previewPath)}?t=${Date.now()}`);
      setStatus('Style preview ready. Switch styles to compare, then proceed to master.');
    } catch (err) {
      setError(`Style preview failed: ${safeError(err)}`);
    } finally {
      setStylePreviewBusy(false); setStyleProgress(null);
    }
  };

  const runTransform = async () => {
    if (!songBackend?.file_id) return;
    setStylePreviewBusy(true); setStyleProgress(0); setStyleProgressMsg(`Transforming to ${mode}…`);
    setError(''); setTransformProgress(0);
    const MAX_RETRIES = 3;
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          setStyleProgressMsg(`Backend waking up — retry ${attempt}/${MAX_RETRIES}…`);
          await new Promise(r => setTimeout(r, 5000 * (attempt - 1)));
        }
        const init = await transformStyleOnBackend(songBackend.file_id, mode, strength);
        const jobId = init?.job_id;
        let job = init;
        if (jobId) job = await pollUntilComplete(jobId, (p, msg) => {
          setStyleProgress(p); setStyleProgressMsg(msg);
          setTransformProgress(p);
        });
        setTransformJob(job);
        const previewPath = job?.result?.downloads?.style_preview;
        if (previewPath) setStylePreviewUrl(`${backendUrl(previewPath)}?t=${Date.now()}`);
        setStatus(`${mode} transform ready — sounds right? Hit "Master it →"`);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        const msg = safeError(err);
        if (msg.toLowerCase().includes('file not found')) {
          expireSession(songBackend?.file_id);
          return;
        }
        const isNetwork = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror');
        if (!isNetwork || attempt === MAX_RETRIES) break;
      }
    }
    if (lastErr) {
      const msg = safeError(lastErr);
      const isNetwork = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror');
      setError(isNetwork
        ? 'Cannot reach the backend — it may be starting up. Please wait 30 seconds and try again.'
        : `Transform failed: ${msg}`);
    }
    setStylePreviewBusy(false); setStyleProgress(null); setTransformProgress(null);
  };

  const runAiAnalysis = async () => {
    if (!songBackend?.file_id) return;
    setAiAnalysisBusy(true); setAiAnalysisProgress(0); setError('');
    try {
      const init = await analyzeAiOnBackend(songBackend.file_id, mode);
      const jobId = init?.job_id;
      if (jobId) {
        const job = await pollUntilComplete(jobId, (p) => setAiAnalysisProgress(p));
        setAiAnalysisJob(job);
      }
    } catch (err) {
      const msg = safeError(err);
      if (msg.toLowerCase().includes('file not found')) {
        expireSession(songBackend?.file_id);
      } else {
        setError(`AI analysis failed: ${msg}`);
      }
    } finally {
      setAiAnalysisBusy(false); setAiAnalysisProgress(null);
    }
  };

  const runShapePreview = async () => {
    if (!songBackend?.file_id) return;
    let previewTargetId = enhancedFileId;
    // Enhance if needed (or if settings changed)
    if (!previewTargetId) {
      setBusy(true); setError(''); setEnhanceProgress(0); setEnhanceProgressMsg('Applying mix settings…');
      try {
        const init = await enhanceMixOnBackend(songBackend.file_id, presenceBoost, reverbAmount, stereoWidth, busCompress);
        const jobId = init?.job_id;
        let job = init;
        if (jobId) job = await pollUntilComplete(jobId, (p, msg) => { setEnhanceProgress(p); setEnhanceProgressMsg(msg); });
        setEnhanceJob(job);
        const mid = job?.result?.enhanced_file_id;
        if (mid) { previewTargetId = mid; setEnhancedFileId(mid); setEnhancedPreviewUrl(backendUrl(`/api/v1/files/${mid}/download/original`)); }
      } catch (err) {
        setError(`Mix failed: ${safeError(err)}`); setBusy(false); setEnhanceProgress(null); return;
      }
      setBusy(false); setEnhanceProgress(null);
    }
    // Style preview
    const targetId = previewTargetId || songBackend.file_id;
    setStylePreviewBusy(true); setStyleProgress(0); setStyleProgressMsg('Generating style preview…');
    try {
      const init = await previewStyleOnBackend(targetId, mode, strength, warmth / 100);
      const jobId = init?.job_id;
      let job = init;
      if (jobId) job = await pollUntilComplete(jobId, (p, msg) => { setStyleProgress(p); setStyleProgressMsg(msg); });
      const previewPath = job?.result?.downloads?.style_preview;
      if (previewPath) setStylePreviewUrl(`${backendUrl(previewPath)}?t=${Date.now()}`);
      setStatus('Preview ready — sounds right? Hit "Master it →"');
    } catch (err) {
      setError(`Preview failed: ${safeError(err)}`);
    } finally {
      setStylePreviewBusy(false); setStyleProgress(null);
    }
  };

  const runMaster = async ({ overrideStrength, airBoost = false } = {}) => {
    const targetId = enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    const s = overrideStrength ?? strength;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform;
    setBusy(true); setError(''); setMasterProgress(0); setMasterProgressMsg('Queuing master…');
    setStatus(`Mastering for ${platformLabel} · ${mode}${airBoost ? ' + air boost' : ''}${overrideStrength ? ` · ${s}% intensity` : ''}…`);
    try {
      const init = await masterAudioOnBackend(targetId, mode, s, platform, airBoost, warmth / 100, lowEq, midEq, highEq, masterTargetLufs, masterTpCeiling);
      const jobId = init?.job_id;
      let job = init;
      if (jobId) {
        job = await pollUntilComplete(jobId, (p, msg) => { setMasterProgress(p); setMasterProgressMsg(msg); });
      }
      setMasterJob(job);
      const bust2 = Date.now();
      setMasterCacheBust(bust2);
      // save to history
      const downloads = job?.result?.downloads || {};
      const entry = {
        id: bust2,
        date: new Date().toISOString(),
        filename: projectName || songFile?.name || 'unknown',
        platform,
        genre: mode,
        strength: s,
        originalLufs: analysisData?.integrated_lufs ?? null,
        wavUrl: downloads.master_wav ? backendUrl(downloads.master_wav) : '',
        mp3Url: downloads.master_mp3 ? backendUrl(downloads.master_mp3) : '',
      };
      saveToHistory(entry);
      setHistory(loadHistory());
      saveTemplate(mode, { strength: s, warmth, lowEq, midEq, highEq });
      setTemplates(loadTemplates());
      // emit to project library
      const dl = job?.result?.downloads || {};
      const previewUrl = dl.master_preview ? backendUrl(dl.master_preview) : '';
      const mp3Url = dl.master_mp3 ? backendUrl(dl.master_mp3) : '';
      const wavUrl = dl.master_wav ? backendUrl(dl.master_wav) : '';
      window.dispatchEvent(new CustomEvent('infinity:project-sound', {
        detail: {
          id: `master_${bust2}`,
          type: 'master',
          source: 'infinity-studio',
          name: `Master — ${projectName || songFile?.name || 'track'}`,
          platform,
          mode,
          strength: s,
          target_lufs: job?.result?.target_lufs,
          parameters: {
            mode, strength: s, platform, warmth: warmth / 100,
            lowEq, midEq, highEq, airBoost,
            targetLufs: masterTargetLufs, tpCeiling: masterTpCeiling,
          },
          input_file_id: targetId,
          qc: job?.result?.qc || null,
          preview_url: previewUrl,
          download_url: mp3Url,
          assets: [
            wavUrl && { type: 'WAV', name: 'Master WAV', download_url: wavUrl },
            mp3Url && { type: 'MP3', name: 'MP3 320k', download_url: mp3Url },
            previewUrl && { type: 'Preview', name: '30s Preview', download_url: previewUrl },
          ].filter(Boolean),
          created_at: new Date().toISOString(),
        },
      }));
      setStatus('Mastering complete. Your files are ready to download.');
    } catch (err) {
      setError(`Mastering failed: ${safeError(err)}`);
    } finally {
      setBusy(false); setMasterProgress(null);
    }
  };


  const runExportPackage = async () => {
    const targetId = masterJob?.result?.file_id || enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    setExportBusy(true); setError('');
    try {
      const res = await exportPackageOnBackend(targetId);
      const result = res?.result || res;
      setExportPack(result);
      window.dispatchEvent(new CustomEvent('infinity:project-sound', {
        detail: {
          id: `export_${Date.now()}`, type: 'export-package', source: 'infinity-studio',
          name: `Export — ${projectName || songFile?.name || 'track'}`,
          assets: Object.entries(result?.downloads || {}).map(([k, u]) => ({ type: k, name: k.replace(/_/g, ' '), download_url: u })),
          created_at: new Date().toISOString(),
        },
      }));
      setStatus('Release package ready — download WAV, MP3 and the QC report below.');
    } catch (err) {
      setError(`Export failed: ${safeError(err)}`);
    } finally { setExportBusy(false); }
  };

  const runStemSeparation = async () => {
    const targetId = masterJob?.result?.file_id || enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    setStemBusy(true); setStemProgress(0); setStemProgressMsg('Starting…');
    try {
      const init = await separateStemsOnBackend(targetId);
      const jobId = init?.job_id;
      let job = init;
      if (jobId) {
        job = await pollUntilComplete(jobId, (p, msg) => { setStemProgress(p); setStemProgressMsg(msg); });
      }
      setStemJob(job);
    } catch (err) {
      setError(`Stem separation failed: ${safeError(err)}`);
    } finally {
      setStemBusy(false); setStemProgress(null);
    }
  };

  const loadRecentFile = (f) => {
    setSongBackend({ file_id: f.file_id, filename: f.filename || f.name });
    setRestoredName(f.filename || f.name || 'track');
    setSongFile(null); setSongUrl('');
    setProjectName(prev => prev || (f.filename || f.name || '').replace(/\.[^.]+$/, ''));
    saveSession({ songBackend: { file_id: f.file_id, filename: f.filename || f.name }, savedAt: new Date().toISOString() });
    setError(''); setStatus('');
  };

  const resetAll = () => {
    clearSession();
    setStep(1);
    setProjectName('');
    setRestoredName('');
    setSongFile(null); setSongBackend(null); setSongUrl(''); setAnalysisData(null);
    setCleanJob(null); setCleanedPreviewUrl('');
    setEnhanceJob(null); setEnhancedFileId(null); setEnhancedPreviewUrl('');
    setMasterJob(null); setMasterCacheBust(0); setAbMode('master'); setError(''); setStatus('');
    setStemJob(null); setStemBusy(false); setStemProgress(null);
    setPresenceBoost(true); setReverbAmount(0.2); setStereoWidth(1.3); setBusCompress(true); setWarmth(30);
    setLowEq(0); setMidEq(0); setHighEq(0); setRefLufs(null); setStylePreviewUrl(''); setStylePreviewBusy(false);
    setUploadMode('song');
    setAdvancedOpen(false);
  };

  const masterDownloads = masterJob?.result?.downloads || {};
  const bust = masterCacheBust ? `?t=${masterCacheBust}` : '';
  const masterWavUrl = masterDownloads.master_wav ? backendUrl(masterDownloads.master_wav) : '';
  const masterMp3Url = masterDownloads.master_mp3 ? backendUrl(masterDownloads.master_mp3) : '';
  const masterPreviewUrl = masterDownloads.master_preview ? `${backendUrl(masterDownloads.master_preview)}${bust}` : '';
  const originalDownloadUrl = songBackend?.downloads?.original
    ? backendUrl(songBackend.downloads.original)
    : (songBackend?.file_id ? backendUrl(`/api/v1/files/${songBackend.file_id}/download/original`) : '');
  const masterRender = masterJob?.result?.render || {};
  const abAudioUrl = abMode === 'original' ? originalDownloadUrl : masterPreviewUrl;
  const targetLufs = masterJob?.result?.target_lufs ?? _lufsLabel(platform);

  const reverbLabel = reverbAmount < 0.06 ? 'Dry' : reverbAmount < 0.35 ? 'Room' : reverbAmount < 0.65 ? 'Studio' : reverbAmount < 0.85 ? 'Hall' : 'Cathedral';

  const shell = {
    maxWidth: isMobile ? '100%' : 960,
    margin: isMobile ? '0' : '12px auto',
    borderRadius: isMobile ? 0 : 24,
    padding: 0,
    color: '#f5f8ff',
    background: 'rgba(12,14,26,.99)',
    border: isMobile ? 'none' : '1px solid rgba(255,255,255,.07)',
    borderTop: '2px solid rgba(85,233,255,.45)',
    boxShadow: '0 28px 100px rgba(0,0,0,.6),0 0 64px rgba(85,233,255,.08)',
    minHeight: isMobile ? '100dvh' : undefined,
  };

  const renderStep = () => {
    switch (step) {

      case 1: return ( // ─── UPLOAD ───
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 1 — Import</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 14, lineHeight: 1.6 }}>
            Start from a finished recording, or bring a separate vocal and beat to mix here.
          </p>
          {/* Import mode switch */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              data-infinity-local-action="true"
              className={uploadMode === 'song' ? 'primary' : 'secondary'}
              onClick={() => setUploadMode('song')}
              style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
            >Full song</button>
            <button
              data-infinity-local-action="true"
              className={uploadMode === 'vocalbeat' ? 'primary' : 'secondary'}
              onClick={() => setUploadMode('vocalbeat')}
              style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
            >Vocal + Beat</button>
          </div>
          {uploadMode === 'vocalbeat' ? (
            <div>
              <VocalBeatMixer
                projectKey={projectId || 'studio'}
                onMixed={({ mixedFileId, previewUrl }) => {
                  setEnhancedFileId(mixedFileId);
                  if (previewUrl) setEnhancedPreviewUrl(previewUrl);
                  setSongBackend((current) => current || { file_id: mixedFileId, filename: 'mixed.wav' });
                  setStatus('Mix rendered — continue to shape or master it.');
                }}
              />
              <NavRow nextLabel="Shape my sound →" onNext={() => go(2)} nextDisabled={!enhancedFileId || busy} />
            </div>
          ) : (
          <div>
          {/* Recent files list — shown when no file is loaded yet */}
          {!songFile && !songBackend && recentFiles.length > 0 && (
            <div style={{ marginBottom: 16, border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,.03)', fontSize: 12, fontWeight: 700, color: 'rgba(245,248,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Your uploaded songs
              </div>
              {recentFiles.map((f, i) => (
                <div key={f.file_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename || f.name || 'Audio file'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,248,255,.38)', marginTop: 2 }}>{formatBytes(f.size)} · {f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                  </div>
                  <button type="button" className="primary" data-infinity-local-action="true"
                    onClick={() => loadRecentFile(f)}
                    style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}>
                    Load →
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Restored session banner */}
          {restoredName && !songFile && (
            <div style={{ ...cardGreen, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 4 }}>↩ Loaded: {restoredName}</div>
                <div style={{ color: 'rgba(245,248,255,.5)', fontSize: 12 }}>Ready to continue — go straight to Step 2, or pick a different song above.</div>
              </div>
              <button
                type="button" data-infinity-local-action="true"
                onClick={() => { setSongBackend(null); setRestoredName(''); clearSession(); }}
                style={{ background: 'none', border: 'none', color: 'rgba(245,248,255,.38)', cursor: 'pointer', padding: 0, flexShrink: 0, fontSize: 20, lineHeight: 1 }}
                title="Clear loaded song"
              >×</button>
            </div>
          )}
          {songFile && (
            <div style={{ ...cardGreen, marginBottom: 12 }}>
              <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 4 }}>✓ {songFile.name}</div>
              <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13, marginBottom: 10 }}>{formatBytes(songFile.size)}</div>
              {songUrl && <Waveform src={songUrl} color="#55e9ff" />}
              {songUrl && <audio controls src={songUrl} style={{ width: '100%', marginTop: 10 }} />}
              <AnalysisPanel analysis={analysisData} />
            </div>
          )}
          <label
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px dashed rgba(85,233,255,.32)', background: 'rgba(85,233,255,.05)', borderRadius: 18, padding: isMobile ? 20 : 28, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (!busy && e.dataTransfer.files[0]) handleSongFile(e.dataTransfer.files[0]); }}
          >
            <input type="file" accept="audio/*,.mp3,.wav,.flac,.webm,.ogg,.m4a,.aac" style={{ display: 'none' }} disabled={busy} onChange={e => { if (e.target.files[0]) handleSongFile(e.target.files[0]); }} />
            <CloudUpload size={28} color="#55e9ff" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop your song here or click to browse</div>
              <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13 }}>MP3 · WAV · FLAC · M4A · up to 250 MB</div>
            </div>
          </label>
          {/* Auto-clean hint */}
          {!songFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '9px 14px', borderRadius: 10, background: 'rgba(87,240,156,.05)', border: '1px solid rgba(87,240,156,.12)' }}>
              <span style={{ color: '#57f09c', fontSize: 13 }}>✦</span>
              <span style={{ fontSize: 12, color: 'rgba(245,248,255,.5)', lineHeight: 1.5 }}>Your mix gets cleaned automatically in the background — noise removal, de-essing, and levelling happen while you choose your style.</span>
            </div>
          )}
          {/* Project name */}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(245,248,255,.55)', marginBottom: 6 }}>Song / project name (optional)</label>
            <input
              type="text"
              placeholder={songFile?.name?.replace(/\.[^.]+$/, '') || 'e.g. Summer Anthem'}
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 14px', color: '#f5f8ff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <StatusBox message={status} error={error} busy={busy} />
          {cleanProgress != null && <ProgressBar progress={cleanProgress} label={cleanProgressMsg} color="#57f09c" />}

          {/* AI Song Analysis */}
          {songBackend?.file_id && (
            <div style={{ marginTop: 16 }}>
              <button
                data-infinity-local-action="true"
                disabled={aiAnalysisBusy}
                onClick={runAiAnalysis}
                style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: '1px solid rgba(85,233,255,.25)', background: 'rgba(85,233,255,.06)', color: '#55e9ff', fontSize: 14, fontWeight: 700, cursor: aiAnalysisBusy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Sparkles size={15} /> {aiAnalysisBusy ? 'Analyzing…' : aiAnalysisJob ? 'Re-analyze with AI' : 'Get AI Producer Feedback'}
              </button>
              {aiAnalysisBusy && <ProgressBar progress={aiAnalysisProgress} label="AI is analyzing your track…" color="#55e9ff" />}
              {aiAnalysisJob?.result?.analysis && (
                <div style={{ marginTop: 12, background: 'rgba(10,12,26,.7)', border: '1px solid rgba(85,233,255,.15)', borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: '#55e9ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>AI Producer Feedback</div>
                  {aiAnalysisJob.result.measurements && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                      {[
                        aiAnalysisJob.result.measurements.integrated_lufs != null && ['LUFS', `${aiAnalysisJob.result.measurements.integrated_lufs}`],
                        aiAnalysisJob.result.measurements.true_peak_dbtp != null && ['True Peak', `${aiAnalysisJob.result.measurements.true_peak_dbtp} dBTP`],
                        aiAnalysisJob.result.measurements.lra != null && ['LRA', `${aiAnalysisJob.result.measurements.lra} LU`],
                        aiAnalysisJob.result.measurements.duration && ['Duration', aiAnalysisJob.result.measurements.duration],
                      ].filter(Boolean).map(([k, v]) => (
                        <div key={k} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(245,248,255,.38)', textTransform: 'uppercase', letterSpacing: 1 }}>{k}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#55e9ff' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(245,248,255,.82)', whiteSpace: 'pre-wrap' }}>
                    {aiAnalysisJob.result.analysis}
                  </div>
                </div>
              )}
            </div>
          )}

          <NavRow nextLabel="Shape my sound →" onNext={() => go(2)} nextDisabled={!songBackend || busy} />
          </div>
          )}
        </div>
      );

      case 2: return ( // ─── SHAPE YOUR SOUND ───
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Shape your sound</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 20, lineHeight: 1.6 }}>
            Pick a style, set your vibe, and preview. When it sounds right — master it.
          </p>

          {/* Clean status pill */}
          {cleanJob && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: 'rgba(87,240,156,.06)', border: '1px solid rgba(87,240,156,.18)', marginBottom: 16 }}>
              <span style={{ color: '#57f09c', fontWeight: 700, fontSize: 13 }}>✓ Mix cleaned</span>
              <span style={{ color: 'rgba(245,248,255,.42)', fontSize: 12 }}>— noise and echo removed in the background</span>
            </div>
          )}
          {cleanProgress != null && <ProgressBar progress={cleanProgress} label={cleanProgressMsg} color="#57f09c" />}

          {/* Style chips */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Pick your sound style</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MODES.map(m => {
                const desc = MODE_DESCRIPTIONS[m];
                const active = mode === m;
                return (
                  <button
                    key={m}
                    data-infinity-local-action="true"
                    onClick={() => { setMode(m); setStylePreviewUrl(''); setEnhancedFileId(null); }}
                    style={{ padding: '9px 18px', borderRadius: 99, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: `1.5px solid ${active ? (desc?.color || '#55e9ff') : 'rgba(255,255,255,.1)'}`, background: active ? `${desc?.color || '#55e9ff'}18` : 'rgba(255,255,255,.03)', color: active ? (desc?.color || '#55e9ff') : 'rgba(245,248,255,.7)', transition: 'all .15s' }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            {/* Style description card */}
            {(() => {
              const desc = MODE_DESCRIPTIONS[mode];
              if (!desc) return null;
              return (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: `${desc.color}0e`, border: `1px solid ${desc.color}28` }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {desc.tags.map(t => <span key={t} style={{ fontSize: 11, fontWeight: 700, color: desc.color, background: `${desc.color}18`, borderRadius: 99, padding: '3px 9px' }}>{t}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.55)', lineHeight: 1.5 }}>{desc.detail}</div>
                </div>
              );
            })()}
          </div>

          {/* Template recall */}
          {templates[mode] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,207,102,.08)', border: '1px solid rgba(255,207,102,.28)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, fontSize: 12, color: 'rgba(245,248,255,.7)', lineHeight: 1.5 }}>
                <b style={{ color: '#ffcf66' }}>Saved from last time:</b>{' '}
                {mode} · Intensity {templates[mode].strength}% · Warmth {templates[mode].warmth}%
              </div>
              <button data-infinity-local-action="true" className="secondary"
                style={{ fontSize: 12, padding: '6px 12px', border: '1px solid rgba(255,207,102,.4)', color: '#ffcf66', whiteSpace: 'nowrap' }}
                onClick={() => { setStrength(templates[mode].strength); setWarmth(templates[mode].warmth); setLowEq(templates[mode].lowEq); setMidEq(templates[mode].midEq); setHighEq(templates[mode].highEq); setStylePreviewUrl(''); }}>
                Use these →
              </button>
            </div>
          )}

          {/* Intensity slider */}
          <label className="range" style={{ marginBottom: 20 }}>
            <span>Style intensity <b>{strength}%</b></span>
            <input type="range" min="0" max="100" value={strength} onChange={e => { setStrength(Number(e.target.value)); setStylePreviewUrl(''); }} />
          </label>

          {/* Preview player */}
          {stylePreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 6 }}>30s preview — {mode}</div>
              <audio key={stylePreviewUrl} controls src={stylePreviewUrl} style={{ width: '100%' }} />
              <div style={{ fontSize: 12, color: 'rgba(245,248,255,.38)', marginTop: 6 }}>Sounding right? Hit "Master it →" below.</div>
            </div>
          )}

          {/* Transform button */}
          <button className="primary" data-infinity-local-action="true"
            disabled={stylePreviewBusy || busy || !songBackend}
            onClick={runTransform}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 0', marginBottom: 12 }}>
            <Sparkles size={15} /> {stylePreviewBusy ? `Transforming to ${mode}…` : `Transform my sound to ${mode}`}
          </button>
          <div style={{ fontSize: 11, color: 'rgba(245,248,255,.35)', textAlign: 'center', marginBottom: 12 }}>
            AI generates a new version of your track in {mode} style — same melody, new sound
          </div>

          <ProgressBar progress={enhanceProgress ?? styleProgress} label={enhanceProgress != null ? enhanceProgressMsg : styleProgressMsg} color="#b78aff" />
          <StatusBox message={status} error={error} busy={busy || stylePreviewBusy} />

          {/* Advanced settings */}
          <div style={{ marginTop: 8 }}>
            <button data-infinity-local-action="true" className="secondary"
              style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setAdvancedOpen(v => !v)}>
              {advancedOpen ? '▲' : '▼'} Advanced settings
            </button>
            {advancedOpen && (
              <div style={{ ...card, marginTop: 10 }}>
                <label className="range" style={{ marginBottom: 14 }}>
                  <span>Warmth / Analog saturation <b>{warmth}%</b></span>
                  <input type="range" min="0" max="100" value={warmth} onChange={e => { setWarmth(Number(e.target.value)); setStylePreviewUrl(''); setEnhancedFileId(null); }} />
                </label>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span>Reverb / room depth</span>
                    <b style={{ color: '#b78aff' }}>{reverbLabel} ({Math.round(reverbAmount * 100)}%)</b>
                  </div>
                  <input type="range" min="0" max="100" value={Math.round(reverbAmount * 100)} onChange={e => { setReverbAmount(Number(e.target.value) / 100); setStylePreviewUrl(''); setEnhancedFileId(null); }} style={{ width: '100%' }} />
                </label>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span>Stereo width</span>
                    <b style={{ color: '#ff4de1' }}>{stereoWidth.toFixed(1)}×</b>
                  </div>
                  <input type="range" min="100" max="200" value={Math.round(stereoWidth * 100)} onChange={e => { setStereoWidth(Number(e.target.value) / 100); setStylePreviewUrl(''); setEnhancedFileId(null); }} style={{ width: '100%' }} />
                </label>
                {[
                  { label: 'Presence boost', sub: '+1.5 dB at 3.5 kHz + air shelf — vocals cut through', val: presenceBoost, set: setPresenceBoost, color: '#55e9ff' },
                  { label: 'Bus compression', sub: 'Glue compressor + true-peak limiter — radio-ready feel', val: busCompress, set: setBusCompress, color: '#57f09c' },
                ].map(({ label, sub, val, set, color }) => (
                  <div key={label} data-infinity-local-action="true" onClick={() => { set(!val); setStylePreviewUrl(''); setEnhancedFileId(null); }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${val ? color : 'rgba(255,255,255,.2)'}`, background: val ? `${color}22` : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color }}>
                      {val ? '✓' : ''}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: val ? color : '#f5f8ff' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Tone balance</div>
                  {[
                    { label: 'Low', freq: '<200 Hz', val: lowEq, set: setLowEq, color: '#b78aff' },
                    { label: 'Mid', freq: '200 Hz–4 kHz', val: midEq, set: setMidEq, color: '#55e9ff' },
                    { label: 'High', freq: '>4 kHz', val: highEq, set: setHighEq, color: '#57f09c' },
                  ].map(({ label, freq, val, set, color }) => (
                    <label key={label} className="range" style={{ marginBottom: 10 }}>
                      <span>
                        <b style={{ color }}>{label}</b>
                        <span style={{ color: 'rgba(245,248,255,.42)', fontSize: 12, marginLeft: 6 }}>{freq}</span>
                        <b style={{ marginLeft: 8, color: val > 0 ? '#57f09c' : val < 0 ? '#ff6b6b' : 'rgba(245,248,255,.5)' }}>
                          {val > 0 ? `+${val}` : val} dB
                        </b>
                      </span>
                      <input type="range" min="-6" max="6" step="0.5" value={val} data-infinity-local-action="true"
                        onChange={e => { set(Number(e.target.value)); setStylePreviewUrl(''); setEnhancedFileId(null); }} />
                    </label>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button data-infinity-local-action="true" className="secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => { setLowEq(0); setMidEq(0); setHighEq(0); }}>Reset EQ</button>
                  </div>
                </div>
                {/* Mastering target overrides */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Mastering target</div>
                  <div data-infinity-local-action="true" onClick={() => { setMasterTargetLufs(masterTargetLufs == null ? -14 : null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10, userSelect: 'none' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${masterTargetLufs == null ? '#57f09c' : 'rgba(255,255,255,.2)'}`, background: masterTargetLufs == null ? '#57f09c22' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#57f09c' }}>{masterTargetLufs == null ? '✓' : ''}</div>
                    <span style={{ fontSize: 13 }}>Automatic loudness (platform + genre blend)</span>
                  </div>
                  {masterTargetLufs != null && (
                    <>
                      <label className="range" style={{ marginBottom: 10 }}>
                        <span>Target loudness <b style={{ color: '#55e9ff' }}>{masterTargetLufs} LUFS</b></span>
                        <input type="range" min="-24" max="-6" step="0.5" value={masterTargetLufs} data-infinity-local-action="true"
                          onChange={e => setMasterTargetLufs(Number(e.target.value))} />
                      </label>
                      <label className="range" style={{ marginBottom: 10 }}>
                        <span>True-peak ceiling <b style={{ color: '#ffcf66' }}>{masterTpCeiling ?? -1} dBTP</b></span>
                        <input type="range" min="-3" max="-0.1" step="0.1" value={masterTpCeiling ?? -1} data-infinity-local-action="true"
                          onChange={e => setMasterTpCeiling(Number(e.target.value))} />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <NavRow onBack={() => go(1)} nextLabel="Master it →" onNext={() => go(3)} nextDisabled={busy || stylePreviewBusy} />
        </div>
      );

      case 3: return ( // ─── MASTER & DOWNLOAD ───
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Master & Download</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Pick your platform — Infinity hits the exact loudness target automatically.
          </p>

          {/* Style preview confirm */}
          {stylePreviewUrl && !masterJob && (() => {
            const desc = MODE_DESCRIPTIONS[mode];
            return (
              <div style={{ ...card, marginBottom: 16, border: `1px solid ${desc?.color || '#55e9ff'}28`, background: `${desc?.color || '#55e9ff'}08` }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: desc?.color || '#55e9ff' }}>Your {mode} preview — ready to master</div>
                <Waveform src={stylePreviewUrl} color={desc?.color || '#55e9ff'} />
                <audio key={stylePreviewUrl} controls src={stylePreviewUrl} style={{ width: '100%', marginTop: 8 }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.38)' }}>Happy with the sound? Set your platform below and hit Master.</div>
                  <button data-infinity-local-action="true" className="secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => go(2)}>← Change style</button>
                </div>
              </div>
            );
          })()}

          {/* Platform grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            {PLATFORMS.map(p => (
              <button key={p.id} data-infinity-local-action="true" onClick={() => setPlatform(p.id)}
                style={{ border: `1px solid ${platform === p.id ? 'rgba(85,233,255,.55)' : 'rgba(255,255,255,.08)'}`, background: platform === p.id ? 'rgba(85,233,255,.12)' : 'rgba(255,255,255,.04)', color: platform === p.id ? '#55e9ff' : '#f5f8ff', borderRadius: 12, padding: isMobile ? '10px 6px' : '13px 10px', fontWeight: 800, cursor: 'pointer', textAlign: 'center', fontSize: isMobile ? 11 : 13 }}>
                <div>{p.label}</div>
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4, fontWeight: 400 }}>{p.lufs}</div>
              </button>
            ))}
          </div>

          {/* Reference track */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Reference track <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(245,248,255,.42)' }}>optional</span></div>
            <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 10, lineHeight: 1.5 }}>
              Upload a song you want to sound like. We'll measure its loudness so you can compare.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleRefFile(e.target.files[0]); }} />
              <span className="secondary" style={{ fontSize: 13, padding: '8px 14px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, background: 'rgba(255,255,255,.05)', color: '#f5f8ff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {refBusy ? 'Measuring...' : '↑ Upload reference'}
              </span>
              {refLufs != null && (
                <span style={{ fontSize: 13 }}>
                  Reference: <b style={{ color: '#ffcf66' }}>{refLufs} LUFS</b>
                  {' '}→ your master will be{' '}
                  <b style={{ color: '#57f09c' }}>{masterJob?.result?.target_lufs ?? _lufsLabel(platform)} LUFS</b>
                </span>
              )}
            </label>
          </div>

          {/* Master button */}
          <button className="primary" onClick={() => runMaster()} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px 0', marginBottom: 12 }}>
            <Sparkles size={17} /> {busy ? 'Mastering…' : masterJob ? `Re-master for ${PLATFORMS.find(p => p.id === platform)?.label}` : `Master for ${PLATFORMS.find(p => p.id === platform)?.label}`}
          </button>
          <ProgressBar progress={masterProgress} label={masterProgressMsg} color="#b78aff" />
          <StatusBox message={status} error={error} busy={busy} />

          {/* Results — shown after mastering */}
          {masterJob?.result && (
            <>
              <div style={{ ...cardGreen, marginTop: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>✓ {projectName || songFile?.name?.replace(/\.[^.]+$/, '') || 'Master'} — complete</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['Platform', PLATFORMS.find(p => p.id === platform)?.label],
                    ['Style', mode],
                    ['Intensity', `${strength}%`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '6px 0' }}>
                      <div style={{ fontSize: 11, color: 'rgba(245,248,255,.44)' }}>{k}</div>
                      <div style={{ fontWeight: 700, marginTop: 3 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(245,248,255,.44)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Loudness</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'rgba(245,248,255,.4)', marginBottom: 2 }}>Your upload</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: analysisData?.integrated_lufs != null ? '#ffcf66' : 'rgba(245,248,255,.3)' }}>
                        {analysisData?.integrated_lufs != null ? `${analysisData.integrated_lufs} LUFS` : '— LUFS'}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, color: '#57f09c', fontWeight: 800 }}>→</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'rgba(245,248,255,.4)', marginBottom: 2 }}>After master</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#57f09c' }}>{targetLufs} LUFS</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(245,248,255,.35)', marginLeft: 'auto' }}>
                      {PLATFORMS.find(p => p.id === platform)?.label} target
                    </div>
                  </div>
                </div>
              </div>

              {masterRender?.adaptive_corrections?.length > 0 && (
                <div style={{ ...card, marginBottom: 16, border: '1px solid rgba(85,233,255,.15)', background: 'rgba(85,233,255,.04)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#55e9ff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Adaptive corrections applied to your mix</div>
                  {masterRender.adaptive_corrections.map((note, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                      <span style={{ color: '#55e9ff', fontSize: 13, flexShrink: 0 }}>✦</span>
                      <span style={{ fontSize: 12, color: 'rgba(245,248,255,.78)', lineHeight: 1.5 }}>{note}</span>
                    </div>
                  ))}
                </div>
              )}

              {masterRender?.mix_notes && (
                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.44)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Mix notes</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(245,248,255,.85)' }}>{masterRender.mix_notes}</div>
                  {masterRender.loudness_report?.integrated_lufs != null && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                      {[
                        ['Integrated', `${masterRender.loudness_report.integrated_lufs} LUFS`],
                        ['True peak', `${masterRender.loudness_report.true_peak_dbtp} dBTP`],
                        ['Dynamic range', `${masterRender.loudness_report.lra} LU`],
                      ].map(([k, v]) => (
                        <div key={k} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(245,248,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{k}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#57f09c' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {masterRender.frequency_balance && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(masterRender.frequency_balance).map(([band, desc]) => (
                        <div key={band} style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                          <span style={{ color: '#b78aff', fontWeight: 700, minWidth: 140 }}>{band}</span>
                          <span style={{ color: 'rgba(245,248,255,.65)' }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Processing chain — what we applied and why */}
              {analysisData?.processing_decisions?.decisions?.length > 0 && masterJob?.result && (
                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#b78aff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Processing chain applied</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {analysisData.processing_decisions.decisions.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: i < analysisData.processing_decisions.decisions.length - 1 ? 10 : 0, borderBottom: i < analysisData.processing_decisions.decisions.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(183,138,255,.15)', border: '1px solid rgba(183,138,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#b78aff', flexShrink: 0 }}>{i + 1}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f8ff', marginBottom: 2 }}>{d.processor}{d.value ? <span style={{ color: '#b78aff', fontWeight: 400 }}> · {d.value}</span> : ''}</div>
                          <div style={{ fontSize: 11, color: 'rgba(245,248,255,.52)', lineHeight: 1.5 }}>{d.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {masterPreviewUrl && (
                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.44)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Compare — loudness matched
                  </div>
                  <ABPlayer
                    key={masterPreviewUrl}
                    sources={[
                      { id: 'original', label: 'Original', url: originalDownloadUrl, lufs: analysisData?.integrated_lufs ?? null, color: '#ffcf66' },
                      ...(enhancedPreviewUrl ? [{ id: 'mix', label: 'Mix', url: enhancedPreviewUrl, lufs: null, color: '#55e9ff' }] : []),
                      { id: 'master', label: 'Master', url: masterPreviewUrl, lufs: masterRender.loudness_report?.integrated_lufs ?? (isNaN(parseFloat(targetLufs)) ? null : parseFloat(targetLufs)), color: '#b78aff' },
                    ]}
                  />
                </div>
              )}

              {masterJob?.result?.qc && <QcComparison qc={masterJob.result.qc} />}

              {masterPreviewUrl && (
                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.44)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Frequency spectrum</div>
                  <SpectrumAnalyzer src={masterPreviewUrl} color="#b78aff" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(245,248,255,.28)', marginTop: 4 }}>
                    <span>30 Hz</span><span>100 Hz</span><span>1 kHz</span><span>5 kHz</span><span>20 kHz</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {masterWavUrl && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a className="primary" href={masterWavUrl} download style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
                      <Download size={15} /> Master WAV
                    </a>
                    <button data-infinity-local-action="true" onClick={() => handleShare(masterWavUrl, 'Master WAV')}
                      style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: copied === 'Master WAV' ? '#57f09c' : '#f5f8ff', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {copied === 'Master WAV' ? <><Copy size={13} /> Copied!</> : <><Share2 size={13} /> Share</>}
                    </button>
                  </div>
                )}
                {masterMp3Url && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a className="secondary" href={masterMp3Url} download style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
                      <Download size={15} /> MP3 320k
                    </a>
                    <button data-infinity-local-action="true" onClick={() => handleShare(masterMp3Url, 'MP3 320k')}
                      style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: copied === 'MP3 320k' ? '#57f09c' : '#f5f8ff', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {copied === 'MP3 320k' ? <><Copy size={13} /> Copied!</> : <><Share2 size={13} /> Share</>}
                    </button>
                  </div>
                )}
                {masterPreviewUrl && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a className="secondary" href={masterPreviewUrl} download style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
                      <Download size={15} /> 30s preview
                    </a>
                    <button data-infinity-local-action="true" onClick={() => handleShare(masterPreviewUrl, '30s preview')}
                      style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: copied === '30s preview' ? '#57f09c' : '#f5f8ff', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {copied === '30s preview' ? <><Copy size={13} /> Copied!</> : <><Share2 size={13} /> Share</>}
                    </button>
                  </div>
                )}
              </div>

              {/* Release package export: WAV + MP3 + QC report */}
              {masterJob?.result && (
                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Release package</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 12, lineHeight: 1.5 }}>
                    Bundle everything for delivery: master WAV, MP3, and a QC report with the
                    measured loudness, true peak and release checks of the finished master.
                  </div>
                  {!exportPack && (
                    <button className="secondary" data-infinity-local-action="true" disabled={exportBusy} onClick={runExportPackage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Download size={14} /> {exportBusy ? 'Building package…' : 'Build release package'}
                    </button>
                  )}
                  {exportPack?.downloads && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {Object.entries(exportPack.downloads).map(([key, url]) => (
                        <a key={key} className="secondary" href={backendUrl(url)} download
                          style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Download size={12} /> {key.replace(/_/g, ' ')}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ ...card, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Separate stems</div>
                <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 12, lineHeight: 1.5 }}>
                  Uses <b>Demucs AI separation</b> when installed on the server. Without it, a
                  mid/side approximation runs instead (vocals ≈ centre channel) — useful, but
                  <b> not real AI stem separation</b>; expect bleed between stems.
                </div>
                {!stemJob && (
                  <button className="secondary" data-infinity-local-action="true" disabled={stemBusy || !songBackend} onClick={runStemSeparation} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={14} /> {stemBusy ? 'Separating…' : 'Separate stems'}
                  </button>
                )}
                <ProgressBar progress={stemProgress} label={stemProgressMsg} color="#ffcf66" />
                {stemJob?.result && (
                  <div style={{ fontSize: 11, color: stemJob.result.method === 'demucs' ? '#57f09c' : '#ffcf66', marginTop: 10 }}>
                    Method used: {stemJob.result.method === 'demucs' ? 'Demucs (AI separation)' : 'mid/side approximation — not AI separation'}
                    {stemJob.result.note ? ` · ${stemJob.result.note}` : ''}
                  </div>
                )}
                {stemJob?.result?.downloads && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {Object.entries(stemJob.result.downloads).map(([key, url]) => (
                      <a key={key} href={backendUrl(url)} download className="secondary" style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={12} /> {key.charAt(0).toUpperCase() + key.slice(1)} WAV
                      </a>
                    ))}
                  </div>
                )}
                {stemJob && <div style={{ fontSize: 11, color: 'rgba(245,248,255,.35)', marginTop: 8 }}>{stemJob?.result?.note || 'Mid/Side extraction complete.'}</div>}
              </div>

              <div style={{ ...card, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 4, color: '#55e9ff' }}>Make it hit harder</div>
                <div style={{ color: 'rgba(245,248,255,.45)', fontSize: 13, marginBottom: 14 }}>Re-master with enhanced settings — overwrites current master.</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button className="primary" data-infinity-local-action="true" disabled={busy} onClick={() => runMaster({ overrideStrength: Math.min(100, strength + 15) })} style={{ fontSize: 13, padding: '10px 18px' }}>
                    {busy ? '⏳ Re-mastering...' : `⚡ More punch — ${Math.min(100, strength + 15)}%`}
                  </button>
                  <button className="secondary" data-infinity-local-action="true" disabled={busy} onClick={() => runMaster({ airBoost: true })} style={{ fontSize: 13, padding: '10px 18px' }}>
                    {busy ? '⏳' : '✨ More air'}
                  </button>
                  <button className="secondary" data-infinity-local-action="true" disabled={busy} onClick={() => runMaster({ overrideStrength: Math.min(100, strength + 15), airBoost: true })} style={{ fontSize: 13, padding: '10px 18px' }}>
                    {busy ? '⏳' : '🔥 Both'}
                  </button>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.38)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Already applied</div>
                  {HIT_HARDER_TIPS.map((tip, i) => (
                    <div key={i} style={{ color: 'rgba(245,248,255,.55)', fontSize: 13, padding: '6px 0', borderBottom: i < HIT_HARDER_TIPS.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', lineHeight: 1.5 }}>
                      <span style={{ color: '#57f09c', marginRight: 8 }}>✓</span>{tip}
                    </div>
                  ))}
                </div>
              </div>

              {history.length > 0 && (
                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 12, color: 'rgba(245,248,255,.7)' }}>Recent masters</div>
                  {history.map((h, i) => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.filename}</div>
                        <div style={{ fontSize: 11, color: 'rgba(245,248,255,.4)', marginTop: 2 }}>
                          {h.genre} · {PLATFORMS.find(p => p.id === h.platform)?.label} · {h.strength}% · {fmtDate(h.date)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {h.wavUrl && <a href={h.wavUrl} download style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', display: 'flex', alignItems: 'center', gap: 4 }}><Download size={11} /> WAV</a>}
                        {h.mp3Url && <a href={h.mp3Url} download style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', display: 'flex', alignItems: 'center', gap: 4 }}><Download size={11} /> MP3</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <NavRow onBack={() => go(2)} secondaryLabel="Start new project" onSecondary={resetAll} />
        </div>
      );

      default: return null;
    }
  };

  // Embedded mode renders the studio inline as routed page content; overlay
  // mode keeps the legacy full-screen behaviour.
  const wrapper = embedded ? { width: '100%' } : overlay;
  const shellStyle = embedded ? { ...shell, margin: 0, maxWidth: 'none', minHeight: 'auto' } : shell;

  return (
    <div style={wrapper}>
      <div style={shellStyle}>
        {/* Studio header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '14px 16px 12px' : '18px 28px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, letterSpacing: -0.3, background: 'linear-gradient(90deg,#55e9ff,#b78aff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Infinity Studio</span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: backendOnline ? '#57f09c' : '#ffcf66', display: 'inline-block', flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(245,248,255,.38)', marginTop: 2 }}>
                {backendOnline ? 'Clean · Shape · Master' : 'Studio connecting — please wait a moment'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', borderRadius: 12, padding: '8px 10px', cursor: 'pointer', flexShrink: 0 }}><X size={17} /></button>
        </div>
        {/* Step tabs */}
        <StepBar current={step} isMobile={isMobile} />
        {/* Step content */}
        <div style={{ padding: isMobile ? '18px 16px' : '24px 28px', maxHeight: isMobile ? undefined : 'calc(100dvh - 180px)', overflowY: 'auto' }}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
