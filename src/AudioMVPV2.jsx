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
  previewStyleOnBackend,
  uploadAudioToBackend,
  uploadAndMeasureLufsOnBackend,
} from './api/infinityBackend.js';

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Clean' },
  { id: 3, label: 'Mix' },
  { id: 4, label: 'Master' },
  { id: 5, label: 'Download' },
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

const overlay = { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.74)', overflowY: 'auto', padding: '12px 8px' };
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

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', margin: '18px 0 26px', flexWrap: 'wrap' }}>
      {STEPS.map((s, index) => {
        const done = s.id < current;
        const active = s.id === current;
        const color = done ? '#57f09c' : active ? '#55e9ff' : 'rgba(245,248,255,.28)';
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${color}55`, background: `${color}14`, borderRadius: 999, padding: '6px 12px', fontWeight: 800, fontSize: 12, color }}>
              {done
                ? <CheckCircle2 size={13} />
                : <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${color}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{s.id}</span>}
              {s.label}
            </div>
            {index < STEPS.length - 1 && <ChevronRight size={13} color="rgba(245,248,255,.2)" />}
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

export default function AudioMVPV2({ open, onClose }) {
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

  // style preview (Step 3)
  const [stylePreviewUrl, setStylePreviewUrl] = useState('');
  const [stylePreviewBusy, setStylePreviewBusy] = useState(false);

  // reference track
  const [refLufs, setRefLufs] = useState(null);
  const [refBusy, setRefBusy] = useState(false);

  const [masterJob, setMasterJob] = useState(null);
  const [masterCacheBust, setMasterCacheBust] = useState(0);
  const [abMode, setAbMode] = useState('master'); // 'original' | 'master'

  // history
  const [history, setHistory] = useState(() => loadHistory());

  const songUrlRef = useRef('');

  useEffect(() => {
    if (!open) return;
    checkBackendHealth().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false));
  }, [open]);

  useEffect(() => () => {
    if (songUrlRef.current) URL.revokeObjectURL(songUrlRef.current);
  }, []);

  if (!open) return null;

  const go = (n) => { setError(''); setStatus(''); setStep(n); };

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
        setAnalysisData(analysis);
      } catch {}
      setStatus('Song uploaded. Ready to clean.');
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
    setBusy(true); setError('');
    setStatus('Cleaning mix — noise reduction, de-essing, normalizing levels...');
    try {
      const job = await cleanFullMixOnBackend(songBackend.file_id);
      setCleanJob(job);
      const preview = job?.result?.downloads?.cleaned_mp3 || job?.result?.downloads?.cleaned_wav;
      if (preview) setCleanedPreviewUrl(backendUrl(preview));
      setStatus('Clean complete. Preview the result, then continue to mix.');
    } catch (err) {
      setError(`Cleaning failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runEnhance = async () => {
    if (!songBackend?.file_id) return;
    setBusy(true); setError('');
    setStatus('Applying mix enhancements — EQ, room depth, stereo, compression...');
    try {
      const job = await enhanceMixOnBackend(songBackend.file_id, presenceBoost, reverbAmount, stereoWidth, busCompress);
      setEnhanceJob(job);
      const mid = job?.result?.enhanced_file_id;
      if (mid) {
        setEnhancedFileId(mid);
        setEnhancedPreviewUrl(backendUrl(`/api/v1/files/${mid}/download/original`));
      }
      setStatus('Mix enhanced. Preview and then master for your platform.');
      go(4);
    } catch (err) {
      setError(`Mix enhancement failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runStylePreview = async () => {
    const targetId = enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    setStylePreviewBusy(true); setError('');
    setStatus(`Generating ${mode} style preview — 30 seconds…`);
    try {
      const job = await previewStyleOnBackend(targetId, mode, strength, warmth / 100);
      const previewPath = job?.result?.downloads?.style_preview;
      if (previewPath) setStylePreviewUrl(`${backendUrl(previewPath)}?t=${Date.now()}`);
      setStatus('Style preview ready. Switch styles to compare, then proceed to master.');
    } catch (err) {
      setError(`Style preview failed: ${safeError(err)}`);
    } finally {
      setStylePreviewBusy(false);
    }
  };

  const runMaster = async ({ overrideStrength, airBoost = false } = {}) => {
    const targetId = enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    const s = overrideStrength ?? strength;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform;
    setBusy(true); setError('');
    setStatus(`Mastering for ${platformLabel} · ${mode}${airBoost ? ' + air boost' : ''}${overrideStrength ? ` · ${s}% intensity` : ''}…`);
    try {
      const job = await masterAudioOnBackend(targetId, mode, s, platform, airBoost, warmth / 100, lowEq, midEq, highEq);
      setMasterJob(job);
      const bust = Date.now();
      setMasterCacheBust(bust);
      setStatus('Mastering complete. Your files are ready to download.');
      // save to history
      const downloads = job?.result?.downloads || {};
      const entry = {
        id: bust,
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
      // emit to project library
      const dl = job?.result?.downloads || {};
      const previewUrl = dl.master_preview ? backendUrl(dl.master_preview) : '';
      const mp3Url = dl.master_mp3 ? backendUrl(dl.master_mp3) : '';
      const wavUrl = dl.master_wav ? backendUrl(dl.master_wav) : '';
      window.dispatchEvent(new CustomEvent('infinity:project-sound', {
        detail: {
          id: `master_${bust}`,
          type: 'master',
          source: 'infinity-studio',
          name: `Master — ${projectName || songFile?.name || 'track'}`,
          platform,
          mode,
          strength: s,
          target_lufs: job?.result?.target_lufs,
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
      if (step !== 5) go(5);
    } catch (err) {
      setError(`Mastering failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setProjectName('');
    setSongFile(null); setSongBackend(null); setSongUrl(''); setAnalysisData(null);
    setCleanJob(null); setCleanedPreviewUrl('');
    setEnhanceJob(null); setEnhancedFileId(null); setEnhancedPreviewUrl('');
    setMasterJob(null); setMasterCacheBust(0); setAbMode('master'); setError(''); setStatus('');
    setPresenceBoost(true); setReverbAmount(0.2); setStereoWidth(1.3); setBusCompress(true); setWarmth(30);
    setLowEq(0); setMidEq(0); setHighEq(0); setRefLufs(null); setStylePreviewUrl(''); setStylePreviewBusy(false);
  };

  const masterDownloads = masterJob?.result?.downloads || {};
  const bust = masterCacheBust ? `?t=${masterCacheBust}` : '';
  const masterWavUrl = masterDownloads.master_wav ? backendUrl(masterDownloads.master_wav) : '';
  const masterMp3Url = masterDownloads.master_mp3 ? backendUrl(masterDownloads.master_mp3) : '';
  const masterPreviewUrl = masterDownloads.master_preview ? `${backendUrl(masterDownloads.master_preview)}${bust}` : '';
  const originalDownloadUrl = songBackend?.file_id ? backendUrl(`/api/v1/files/${songBackend.file_id}/download/original`) : '';
  const masterRender = masterJob?.result?.render || {};
  const abAudioUrl = abMode === 'original' ? originalDownloadUrl : masterPreviewUrl;
  const targetLufs = masterJob?.result?.target_lufs ?? _lufsLabel(platform);

  const reverbLabel = reverbAmount < 0.06 ? 'Dry' : reverbAmount < 0.35 ? 'Room' : reverbAmount < 0.65 ? 'Studio' : reverbAmount < 0.85 ? 'Hall' : 'Cathedral';

  const shell = {
    maxWidth: 820,
    margin: '16px auto',
    borderRadius: isMobile ? 20 : 28,
    padding: isMobile ? 16 : 26,
    color: '#f5f8ff',
    background: 'rgba(17,20,33,.97)',
    border: '1px solid rgba(255,255,255,.08)',
    boxShadow: '0 22px 80px rgba(0,0,0,.45),0 0 48px rgba(85,233,255,.10)',
  };

  const renderStep = () => {
    switch (step) {

      case 1: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 1 — Upload your song</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Upload your finished recording — beat and vocals already together. MP3 or WAV recommended.
          </p>
          {songFile && (
            <div style={{ ...cardGreen, marginBottom: 12 }}>
              <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 4 }}>✓ {songFile.name}</div>
              <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13, marginBottom: 10 }}>{formatBytes(songFile.size)}</div>
              {songUrl && <Waveform src={songUrl} color="#55e9ff" />}
              {songUrl && <audio controls src={songUrl} style={{ width: '100%', marginTop: 10 }} />}
              {/* Analysis pill row */}
              {analysisData && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {[
                    ['BPM', analysisData.estimated_bpm],
                    ['Key', analysisData.estimated_key],
                    analysisData.integrated_lufs != null && ['Loudness', `${analysisData.integrated_lufs} LUFS`],
                    analysisData.lra != null && ['LRA', `${analysisData.lra} LU`],
                    analysisData.duration_seconds && ['Duration', `${Math.floor(analysisData.duration_seconds / 60)}:${String(Math.round(analysisData.duration_seconds % 60)).padStart(2, '0')}`],
                  ].filter(Boolean).map(([k, v]) => (
                    <span key={k} style={{ fontSize: 11, fontWeight: 700, background: 'rgba(85,233,255,.12)', color: '#55e9ff', borderRadius: 99, padding: '3px 10px' }}>{k}: {v}</span>
                  ))}
                </div>
              )}
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
          <NavRow nextLabel="Next — Clean →" onNext={() => go(2)} nextDisabled={!songBackend || busy} />
        </div>
      );

      case 2: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 2 — Clean your mix</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Remove recording noise, tame harsh frequencies and normalize the level — one click.
          </p>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Cleaning chain</div>
            {[
              'Rumble removal (80 Hz high-pass — removes room boom)',
              'Gentle top-end rolloff (18 kHz low-pass)',
              'Strong noise reduction (afftdn −25 dB, 15 dB NR)',
              'Room reverb gate — cuts echo tails between phrases',
              'Room resonance cuts at 200 Hz (−3 dB) and 400 Hz (−2 dB)',
              'De-essing at 7 kHz (−2 dB)',
              'Gentle mix compression (1.8:1 ratio)',
              'Loudness normalization (−16 LUFS / −1.5 dBTP)',
            ].map((item, i) => (
              <div key={i} style={{ color: 'rgba(245,248,255,.65)', fontSize: 13, padding: '5px 0', borderBottom: i < 7 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                → {item}
              </div>
            ))}
          </div>
          {!cleanJob && (
            <button className="primary" onClick={runClean} disabled={busy} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} /> {busy ? 'Cleaning...' : 'Clean my mix'}
            </button>
          )}
          {cleanedPreviewUrl && (
            <div style={{ ...cardGreen, marginTop: 16 }}>
              <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 8 }}>✓ Mix cleaned — preview:</div>
              <Waveform src={cleanedPreviewUrl} color="#57f09c" />
              <audio controls src={cleanedPreviewUrl} style={{ width: '100%', marginTop: 8 }} />
            </div>
          )}
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow
            onBack={() => go(1)}
            secondaryLabel="Skip — go to mix"
            onSecondary={() => go(3)}
            nextLabel="Next — Mix →"
            onNext={() => go(3)}
            nextDisabled={!cleanJob || busy}
          />
        </div>
      );

      case 3: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 3 — Mix</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Shape your sound before mastering. These controls add presence, space, width and glue.
          </p>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Room & space</div>
            <label style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span>Reverb / room depth</span>
                <b style={{ color: '#b78aff' }}>{reverbLabel} ({Math.round(reverbAmount * 100)}%)</b>
              </div>
              <input type="range" min="0" max="100" value={Math.round(reverbAmount * 100)} onChange={e => setReverbAmount(Number(e.target.value) / 100)} style={{ width: '100%' }} />
              <div style={{ color: 'rgba(245,248,255,.38)', fontSize: 12, marginTop: 5 }}>Dry = no reverb · Room = subtle · Hall = spacious · Cathedral = lush</div>
            </label>
          </div>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Stereo & tone</div>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span>Stereo width</span>
                <b style={{ color: '#ff4de1' }}>{stereoWidth.toFixed(1)}×</b>
              </div>
              <input type="range" min="100" max="200" value={Math.round(stereoWidth * 100)} onChange={e => setStereoWidth(Number(e.target.value) / 100)} style={{ width: '100%' }} />
              <div style={{ color: 'rgba(245,248,255,.38)', fontSize: 12, marginTop: 5 }}>1.0× = original · 1.3× = wider · 2.0× = very wide</div>
            </label>
            {[
              { label: 'Presence boost', sub: '+1.5 dB at 3.5 kHz + air shelf at 12 kHz — vocals and instruments cut through', val: presenceBoost, set: setPresenceBoost, color: '#55e9ff' },
              { label: 'Bus compression', sub: 'Glue compressor + true-peak limiter — cohesive, radio-ready feel', val: busCompress, set: setBusCompress, color: '#57f09c' },
            ].map(({ label, sub, val, set, color }) => (
              <div key={label} data-infinity-local-action="true" onClick={() => set(!val)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${val ? color : 'rgba(255,255,255,.2)'}`, background: val ? `${color}22` : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color }}>
                  {val ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: val ? color : '#f5f8ff' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
          {enhancedPreviewUrl && (
            <div style={{ ...cardGreen, marginTop: 14 }}>
              <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 8 }}>✓ Mix enhanced — preview:</div>
              <audio controls src={enhancedPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <button className="primary" onClick={runEnhance} disabled={busy || stylePreviewBusy} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> {busy ? 'Enhancing...' : enhanceJob ? 'Re-mix with new settings' : 'Apply mix settings'}
          </button>

          {/* Genre style selection moved here from Master step */}
          <div style={{ ...card, marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Choose your sound style</div>
            <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 12, lineHeight: 1.5 }}>
              Pick a style and preview how your song sounds in it. Compare styles before you commit to mastering.
            </div>
            <div className="chips">
              {MODES.map(m => (
                <button key={m} className={mode === m ? 'chip active' : 'chip'} data-infinity-local-action="true" onClick={() => { setMode(m); setStylePreviewUrl(''); }}>{m}</button>
              ))}
            </div>
            {(() => {
              const desc = MODE_DESCRIPTIONS[mode];
              if (!desc) return null;
              return (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: `${desc.color}10`, border: `1px solid ${desc.color}28` }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {desc.tags.map(t => <span key={t} style={{ fontSize: 11, fontWeight: 700, color: desc.color, background: `${desc.color}18`, borderRadius: 99, padding: '3px 9px' }}>{t}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(245,248,255,.55)', lineHeight: 1.5 }}>{desc.detail}</div>
                </div>
              );
            })()}
            <label className="range" style={{ marginTop: 14 }}>
              <span>Style intensity <b>{strength}%</b></span>
              <input type="range" min="0" max="100" value={strength} onChange={e => { setStrength(Number(e.target.value)); setStylePreviewUrl(''); }} />
            </label>
            <button
              className="primary"
              data-infinity-local-action="true"
              disabled={stylePreviewBusy || busy || !songBackend}
              onClick={runStylePreview}
              style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Sparkles size={15} /> {stylePreviewBusy ? `Generating ${mode} preview…` : `Preview my song in ${mode}`}
            </button>
            {stylePreviewUrl && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 6 }}>30s preview — {mode}</div>
                <audio key={stylePreviewUrl} controls src={stylePreviewUrl} style={{ width: '100%' }} />
                <div style={{ fontSize: 12, color: 'rgba(245,248,255,.38)', marginTop: 6 }}>
                  Happy with the sound? Hit Next to choose your release platform.
                </div>
              </div>
            )}
          </div>

          <StatusBox message={status} error={error} busy={busy || stylePreviewBusy} />
          <NavRow onBack={() => go(2)} nextLabel="Next — Master →" onNext={() => go(4)} nextDisabled={busy || stylePreviewBusy} />
        </div>
      );

      case 4: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 4 — Master for your platform</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 14, lineHeight: 1.6 }}>
            Where are you releasing? Infinity hits the exact loudness target for that platform automatically.
          </p>
          {/* Selected style summary */}
          {(() => {
            const desc = MODE_DESCRIPTIONS[mode];
            return desc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: `${desc.color}0e`, border: `1px solid ${desc.color}28` }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'rgba(245,248,255,.45)' }}>Sound style from Step 3: </span>
                  <b style={{ color: desc.color }}>{mode}</b>
                  {stylePreviewUrl && <span style={{ fontSize: 12, color: '#57f09c', marginLeft: 8 }}>✓ previewed</span>}
                </div>
                <button data-infinity-local-action="true" className="secondary" style={{ fontSize: 12, padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={() => go(3)}>Change ↩</button>
              </div>
            ) : null;
          })()}
          {/* Platform selection */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            {PLATFORMS.map(p => (
              <button key={p.id} data-infinity-local-action="true" onClick={() => setPlatform(p.id)}
                style={{ border: `1px solid ${platform === p.id ? 'rgba(85,233,255,.55)' : 'rgba(255,255,255,.08)'}`, background: platform === p.id ? 'rgba(85,233,255,.12)' : 'rgba(255,255,255,.04)', color: platform === p.id ? '#55e9ff' : '#f5f8ff', borderRadius: 12, padding: isMobile ? '10px 6px' : '13px 10px', fontWeight: 800, cursor: 'pointer', textAlign: 'center', fontSize: isMobile ? 11 : 13 }}>
                <div>{p.label}</div>
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4, fontWeight: 400 }}>{p.lufs}</div>
              </button>
            ))}
          </div>
          {/* Warmth + EQ fine-tune */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Final polish</div>
            <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 12, lineHeight: 1.5 }}>Fine-tune the master before it goes out. These stack on top of your style choice.</div>
            <label className="range">
              <span>
                Warmth / Analog saturation <b>{warmth}%</b>
                <span style={{ fontWeight: 400, fontSize: 11, color: 'rgba(245,248,255,.42)', marginLeft: 6 }}>
                  {warmth === 0 ? '— clean digital' : warmth < 35 ? '— subtle tape' : warmth < 65 ? '— analog warmth' : '— tube drive'}
                </span>
              </span>
              <input type="range" min="0" max="100" value={warmth} onChange={e => setWarmth(Number(e.target.value))} />
            </label>
          </div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Tone balance</div>
            <div style={{ fontSize: 12, color: 'rgba(245,248,255,.45)', marginBottom: 14, lineHeight: 1.5 }}>
              Fine-tune the frequency balance of the master. 0 = neutral — these add on top of the genre style.
            </div>
            {[
              { label: 'Low', freq: '<200 Hz — bass & sub', val: lowEq, set: setLowEq, color: '#b78aff' },
              { label: 'Mid', freq: '200 Hz–4 kHz — warmth & presence', val: midEq, set: setMidEq, color: '#55e9ff' },
              { label: 'High', freq: '>4 kHz — air & brightness', val: highEq, set: setHighEq, color: '#57f09c' },
            ].map(({ label, freq, val, set, color }) => (
              <label key={label} className="range" style={{ marginBottom: 10 }}>
                <span>
                  <b style={{ color }}>{label}</b>
                  <span style={{ color: 'rgba(245,248,255,.42)', fontSize: 12, marginLeft: 6 }}>{freq}</span>
                  <b style={{ marginLeft: 8, color: val > 0 ? '#57f09c' : val < 0 ? '#ff6b6b' : 'rgba(245,248,255,.5)' }}>
                    {val > 0 ? `+${val}` : val} dB
                  </b>
                </span>
                <input type="range" min="-6" max="6" step="0.5" value={val} onChange={e => set(Number(e.target.value))} data-infinity-local-action="true" />
              </label>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button data-infinity-local-action="true" className="secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setLowEq(0); setMidEq(0); setHighEq(0); }}>Reset EQ</button>
            </div>
          </div>
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
            <label className="range" style={{ marginTop: 10 }}>
              <span>
                Warmth / Analog saturation <b>{warmth}%</b>
                <span style={{ fontWeight: 400, fontSize: 11, color: 'rgba(245,248,255,.42)', marginLeft: 6 }}>
                  {warmth === 0 ? '— clean digital' : warmth < 35 ? '— subtle tape' : warmth < 65 ? '— analog warmth' : '— tube drive'}
                </span>
              </span>
              <input type="range" min="0" max="100" value={warmth} onChange={e => setWarmth(Number(e.target.value))} />
            </label>
          </div>
          {enhancedPreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(245,248,255,.52)', marginBottom: 8 }}>Pre-master preview:</div>
              <audio controls src={enhancedPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <button className="primary" onClick={() => runMaster()} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
            <Sparkles size={16} /> {busy ? 'Mastering...' : `Master for ${PLATFORMS.find(p => p.id === platform)?.label}`}
          </button>
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow onBack={() => go(3)} />
        </div>
      );

      case 5: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 5 — Download your master</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            WAV for distribution and archiving. MP3 320k for fast sharing.
          </p>

          {masterJob?.result && (
            <div style={{ ...cardGreen, marginBottom: 16 }}>
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
              {/* Loudness meter */}
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
          )}

          {/* A/B Toggle + preview */}
          {masterPreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'rgba(245,248,255,.52)' }}>
                  {abMode === 'original' ? 'Original upload' : '30-second master preview'}
                </div>
                <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, overflow: 'hidden' }}>
                  {[['original', 'A — Original'], ['master', 'B — Master']].map(([val, label]) => (
                    <button key={val} data-infinity-local-action="true" onClick={() => setAbMode(val)}
                      style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: abMode === val ? '#55e9ff' : 'rgba(255,255,255,.04)', color: abMode === val ? '#0a0f1e' : 'rgba(245,248,255,.55)', transition: 'all .15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Waveform src={abAudioUrl} color={abMode === 'original' ? '#ffcf66' : '#b78aff'} />
              <audio key={abAudioUrl} controls src={abAudioUrl} style={{ width: '100%', marginTop: 8 }} />
            </div>
          )}

          {/* Spectrum analyzer */}
          {masterPreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(245,248,255,.44)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Frequency spectrum</div>
              <SpectrumAnalyzer src={masterPreviewUrl} color="#b78aff" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(245,248,255,.28)', marginTop: 4 }}>
                <span>30 Hz</span><span>100 Hz</span><span>1 kHz</span><span>5 kHz</span><span>20 kHz</span>
              </div>
            </div>
          )}

          {/* Download + Share */}
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

          <StatusBox message={status} error={error} busy={busy} />

          {/* Make it hit harder */}
          <div style={{ ...card, marginTop: 16 }}>
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

          {/* History */}
          {history.length > 0 && (
            <div style={{ ...card, marginTop: 16 }}>
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

          <NavRow
            onBack={() => go(4)}
            secondaryLabel="Start new project"
            onSecondary={resetAll}
          />
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={overlay}>
      <div style={shell}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <p className="eyebrow">Infinity Studio</p>
            <h2 style={{ margin: '4px 0 8px', fontSize: 'clamp(20px,4vw,36px)' }}>Clean · Mix · Master</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: backendOnline ? '#57f09c' : '#ffcf66', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(245,248,255,.52)' }}>
                {backendOnline ? `Backend connected · ${API_BASE}` : 'Backend offline — check Railway'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', borderRadius: 14, padding: 10, cursor: 'pointer', flexShrink: 0 }}><X size={18} /></button>
        </div>
        <StepBar current={step} />
        {renderStep()}
      </div>
    </div>
  );
}
