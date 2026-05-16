import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, CloudUpload, Download, Mic, RefreshCw, Sparkles, Square, X } from 'lucide-react';
import {
  API_BASE,
  backendUrl,
  checkBackendHealth,
  cleanVocalsOnBackend,
  masterAudioOnBackend,
  mixVocalBeatOnBackend,
  uploadAudioToBackend,
} from './api/infinityBackend.js';

const STEPS = [
  { id: 1, label: 'Beat' },
  { id: 2, label: 'Vocals' },
  { id: 3, label: 'Clean' },
  { id: 4, label: 'Mix' },
  { id: 5, label: 'Master' },
  { id: 6, label: 'Download' },
];

const PLATFORMS = [
  { id: 'spotify', label: 'Spotify', lufs: '-14 LUFS' },
  { id: 'apple', label: 'Apple Music', lufs: '-16 LUFS' },
  { id: 'youtube', label: 'YouTube', lufs: '-14 LUFS' },
  { id: 'soundcloud', label: 'SoundCloud', lufs: '-10 LUFS' },
  { id: 'tidal', label: 'Tidal', lufs: '-14 LUFS' },
];

const MODES = ['Custom AI adaptive', 'Trap', 'Afrobeat', 'Drill', 'House', 'Gospel', 'Cinematic', 'Soul', 'Experimental'];

const HIT_HARDER_TIPS = [
  'Vocal presence boost (+2.5 dB at 3.5 kHz) so vocals cut through the beat.',
  'Beat stereo widening (extrastereo) for a bigger, wider low end.',
  'Mix bus compression + true-peak limiter for a cohesive, radio-ready feel.',
  'Sibilance control (−1.5 dB at 8 kHz) to tame harsh "s" sounds on the master.',
  'Stereo width scaled to strength — wider master as you push the AI harder.',
];

const overlay = { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.74)', overflowY: 'auto', padding: 18 };
const shell = { maxWidth: 820, margin: '24px auto', borderRadius: 28, padding: 26, color: '#f5f8ff', background: 'rgba(17,20,33,.97)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.45),0 0 48px rgba(85,233,255,.10)' };
const card = { border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 18 };
const cardGreen = { ...card, border: '1px solid rgba(87,240,156,.28)', background: 'rgba(87,240,156,.06)' };

function safeError(e) { return e?.message || String(e || 'Unknown error'); }
function formatBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
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

function UploadZone({ label, hint, onFile, file, audioUrl, disabled }) {
  return (
    <div>
      {file && (
        <div style={{ ...cardGreen, marginBottom: 12 }}>
          <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 4 }}>✓ {file.name}</div>
          <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13 }}>{formatBytes(file.size)}</div>
          {audioUrl && <audio controls src={audioUrl} style={{ width: '100%', marginTop: 10 }} />}
        </div>
      )}
      <label
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px dashed rgba(85,233,255,.32)', background: 'rgba(85,233,255,.05)', borderRadius: 18, padding: 28, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'background .2s' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); if (!disabled && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
      >
        <input type="file" accept="audio/*,.mp3,.wav,.flac,.webm,.ogg" style={{ display: 'none' }} disabled={disabled} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
        <CloudUpload size={30} color="#55e9ff" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13 }}>{hint}</div>
        </div>
      </label>
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
  const [step, setStep] = useState(1);
  const [backendOnline, setBackendOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // beat
  const [beatFile, setBeatFile] = useState(null);
  const [beatBackend, setBeatBackend] = useState(null);
  const [beatUrl, setBeatUrl] = useState('');

  // vocals
  const [vocalFile, setVocalFile] = useState(null);
  const [vocalBackend, setVocalBackend] = useState(null);
  const [vocalUrl, setVocalUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recTimerRef = useRef(null);

  // clean
  const [cleanJob, setCleanJob] = useState(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState('');

  // mix
  const [vocalGain, setVocalGain] = useState(1.0);
  const [beatGain, setBeatGain] = useState(0.85);
  const [vocalPresenceBoost, setVocalPresenceBoost] = useState(true);
  const [beatStereoWidth, setBeatStereoWidth] = useState(1.5);
  const [busCompress, setBusCompress] = useState(true);
  const [mixJob, setMixJob] = useState(null);
  const [mixedFileId, setMixedFileId] = useState(null);
  const [mixedPreviewUrl, setMixedPreviewUrl] = useState('');

  // master
  const [platform, setPlatform] = useState('spotify');
  const [mode, setMode] = useState('Custom AI adaptive');
  const [strength, setStrength] = useState(72);
  const [masterJob, setMasterJob] = useState(null);

  useEffect(() => {
    if (!open) return;
    checkBackendHealth().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false));
  }, [open]);

  useEffect(() => () => {
    if (beatUrl) URL.revokeObjectURL(beatUrl);
    if (vocalUrl) URL.revokeObjectURL(vocalUrl);
  }, []);

  if (!open) return null;

  const go = (n) => { setError(''); setStatus(''); setStep(n); };

  const uploadFile = async (file, setFileFn, setBackendFn, setUrlFn, label) => {
    setBusy(true);
    setError('');
    setStatus(`Uploading ${label}...`);
    setFileFn(file);
    const url = URL.createObjectURL(file);
    setUrlFn(url);
    try {
      const res = await uploadAudioToBackend(file);
      setBackendFn(res.file);
      setStatus(`${label} uploaded and ready.`);
    } catch (err) {
      setError(`Upload failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleBeatFile = (file) => uploadFile(file, setBeatFile, setBeatBackend, setBeatUrl, 'Beat');
  const handleVocalFile = (file) => uploadFile(file, setVocalFile, setVocalBackend, setVocalUrl, 'Vocals');

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recTimerRef.current);
        setRecSeconds(0);
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
        const file = new File([blob], `vocal-recording-${Date.now()}.${ext}`, { type: mimeType });
        await handleVocalFile(file);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
    }
  };

  const runCleanVocals = async () => {
    if (!vocalBackend?.file_id) return;
    setBusy(true);
    setError('');
    setStatus('Cleaning vocals — removing noise, de-essing, compressing...');
    try {
      const job = await cleanVocalsOnBackend(vocalBackend.file_id);
      setCleanJob(job);
      const previewPath = job?.result?.downloads?.cleaned_mp3 || job?.result?.downloads?.cleaned_wav;
      if (previewPath) setCleanedPreviewUrl(backendUrl(previewPath));
      setStatus('Vocals cleaned. Preview the result below, then continue to mix.');
    } catch (err) {
      setError(`Vocal cleaning failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runMix = async () => {
    if (!vocalBackend?.file_id || !beatBackend?.file_id) return;
    setBusy(true);
    setError('');
    setStatus('Mixing vocals with beat...');
    try {
      const job = await mixVocalBeatOnBackend(vocalBackend.file_id, beatBackend.file_id, vocalGain, beatGain, vocalPresenceBoost, beatStereoWidth, busCompress);
      setMixJob(job);
      const mid = job?.result?.mixed_file_id;
      if (mid) {
        setMixedFileId(mid);
        setMixedPreviewUrl(backendUrl(`/api/v1/files/${mid}/download/original`));
      }
      setStatus('Mix complete. Preview below, then master for your platform.');
      go(5);
    } catch (err) {
      setError(`Mix failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runMaster = async ({ overrideStrength, airBoost = false } = {}) => {
    const targetId = mixedFileId || vocalBackend?.file_id;
    if (!targetId) return;
    const s = overrideStrength ?? strength;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform;
    setBusy(true);
    setError('');
    setStatus(`Mastering for ${platformLabel}${airBoost ? ' + air boost' : ''}${overrideStrength ? ' (more punch)' : ''}...`);
    try {
      const job = await masterAudioOnBackend(targetId, mode, s, platform, airBoost);
      setMasterJob(job);
      setStatus('Mastering complete. Your files are ready.');
      if (step !== 6) go(6);
    } catch (err) {
      setError(`Mastering failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setStep(1); setBeatFile(null); setBeatBackend(null); setBeatUrl('');
    setVocalFile(null); setVocalBackend(null); setVocalUrl('');
    setCleanJob(null); setCleanedPreviewUrl('');
    setMixJob(null); setMixedFileId(null); setMixedPreviewUrl('');
    setMasterJob(null); setError(''); setStatus('');
    setVocalGain(1.0); setBeatGain(0.85);
    setVocalPresenceBoost(true); setBeatStereoWidth(1.5); setBusCompress(true);
  };

  const masterDownloads = masterJob?.result?.downloads || {};
  const masterWavUrl = masterDownloads.master_wav ? backendUrl(masterDownloads.master_wav) : '';
  const masterMp3Url = masterDownloads.master_mp3 ? backendUrl(masterDownloads.master_mp3) : '';
  const masterPreviewUrl = masterDownloads.master_preview ? backendUrl(masterDownloads.master_preview) : '';
  const masterRender = masterJob?.result?.render || {};

  const renderStep = () => {
    switch (step) {

      case 1: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 1 — Upload your beat</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Upload the instrumental or beat your vocals will sit on. MP3 or WAV recommended.
          </p>
          <UploadZone label="Drop your beat here or click to browse" hint="MP3 · WAV · FLAC" onFile={handleBeatFile} file={beatFile} audioUrl={beatUrl} disabled={busy} />
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow nextLabel="Next — Upload vocals →" onNext={() => go(2)} nextDisabled={!beatBackend || busy} />
        </div>
      );

      case 2: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 2 — Upload or record your vocals</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Upload an existing vocal take or record straight from your mic here.
          </p>
          <UploadZone label="Drop your vocal file here or click to browse" hint="MP3 · WAV · FLAC" onFile={handleVocalFile} file={vocalFile} audioUrl={vocalUrl} disabled={busy || recording} />
          <div style={{ margin: '18px 0', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
            <span style={{ color: 'rgba(245,248,255,.38)', fontSize: 13 }}>or record in-app</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {!recording
              ? <button className="primary" onClick={startRecording} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mic size={16} /> Start recording</button>
              : <button onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,80,80,.16)', border: '1px solid rgba(255,80,80,.45)', color: '#ff7070', borderRadius: 12, padding: '10px 20px', fontWeight: 800, cursor: 'pointer' }}>
                  <Square size={16} /> Stop — {recSeconds}s recorded
                </button>}
          </div>
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow onBack={() => go(1)} nextLabel="Next — Clean vocals →" onNext={() => go(3)} nextDisabled={!vocalBackend || busy} />
        </div>
      );

      case 3: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 3 — Clean your vocals</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Remove background noise, de-ess harshness, apply a vocal compression chain and normalize the level.
            Recommended before mixing — skip if your vocals are already clean.
          </p>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Cleaning chain</div>
            {[
              'Low-end rumble removal (80 Hz high-pass)',
              'High-frequency rolloff (16 kHz low-pass)',
              'Noise floor reduction (afftdn −20 dB)',
              'De-essing at 7 kHz (−3 dB notch)',
              'Light vocal compression (2.5:1 ratio)',
              'Loudness normalization (−16 LUFS / −1.5 dBTP)',
            ].map((item, i) => (
              <div key={i} style={{ color: 'rgba(245,248,255,.65)', fontSize: 13, padding: '5px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                → {item}
              </div>
            ))}
          </div>
          {!cleanJob && (
            <button className="primary" onClick={runCleanVocals} disabled={busy} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} /> {busy ? 'Cleaning...' : 'Clean my vocals'}
            </button>
          )}
          {cleanedPreviewUrl && (
            <div style={{ ...cardGreen, marginTop: 16 }}>
              <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 8 }}>✓ Vocals cleaned — preview:</div>
              <audio controls src={cleanedPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow
            onBack={() => go(2)}
            secondaryLabel="Skip — go to mix"
            onSecondary={() => go(4)}
            nextLabel="Next — Mix tracks →"
            onNext={() => go(4)}
            nextDisabled={!cleanJob || busy}
          />
        </div>
      );

      case 4: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 4 — Mix vocals with beat</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Balance the levels. Start with vocals at 100% and beat at 85%, then adjust to taste.
            {cleanJob ? <span style={{ color: '#57f09c' }}> Using your cleaned vocals.</span> : ' Tip: Go back and clean your vocals for a better mix.'}
          </p>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Level balance</div>
            <label style={{ display: 'block', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span>Vocal level</span>
                <b style={{ color: '#55e9ff' }}>{Math.round(vocalGain * 100)}%</b>
              </div>
              <input type="range" min="0" max="200" value={Math.round(vocalGain * 100)} onChange={e => setVocalGain(Number(e.target.value) / 100)} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span>Beat level</span>
                <b style={{ color: '#ff4de1' }}>{Math.round(beatGain * 100)}%</b>
              </div>
              <input type="range" min="0" max="200" value={Math.round(beatGain * 100)} onChange={e => setBeatGain(Number(e.target.value) / 100)} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Mix enhancements</div>
            {[
              { label: 'Vocal presence boost', sub: '+2.5 dB at 3.5 kHz + air shelf at 12 kHz — vocals cut through the beat', val: vocalPresenceBoost, set: setVocalPresenceBoost, color: '#55e9ff' },
              { label: 'Widen beat', sub: `Stereo widening on beat (${beatStereoWidth}×) — bigger, more spacious sound`, val: beatStereoWidth > 1.0, set: (on) => setBeatStereoWidth(on ? 1.5 : 1.0), color: '#ff4de1' },
              { label: 'Bus compression', sub: 'Glue compressor + true-peak limiter on the mix output — cohesive, radio-ready feel', val: busCompress, set: setBusCompress, color: '#57f09c' },
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
          {mixedPreviewUrl && (
            <div style={{ ...cardGreen, marginTop: 14 }}>
              <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 8 }}>✓ Mix complete — preview:</div>
              <audio controls src={mixedPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <button className="primary" onClick={runMix} disabled={busy} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> {busy ? 'Mixing...' : mixJob ? 'Re-mix with new levels' : 'Mix vocals + beat'}
          </button>
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow onBack={() => go(3)} />
        </div>
      );

      case 5: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 5 — Master for your platform</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Pick where you're releasing. Infinity will hit the exact loudness target for that platform and apply a professional mastering chain.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
            {PLATFORMS.map(p => (
              <button key={p.id} data-infinity-local-action="true" onClick={() => setPlatform(p.id)} style={{ border: `1px solid ${platform === p.id ? 'rgba(85,233,255,.55)' : 'rgba(255,255,255,.08)'}`, background: platform === p.id ? 'rgba(85,233,255,.12)' : 'rgba(255,255,255,.04)', color: platform === p.id ? '#55e9ff' : '#f5f8ff', borderRadius: 14, padding: '13px 10px', fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}>
                <div>{p.label}</div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 5, fontWeight: 400 }}>{p.lufs}</div>
              </button>
            ))}
          </div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Mastering style</div>
            <div className="chips">{MODES.map(m => <button key={m} className={mode === m ? 'chip active' : 'chip'} data-infinity-local-action="true" onClick={() => setMode(m)}>{m}</button>)}</div>
            <label className="range" style={{ marginTop: 14 }}>
              <span>AI strength <b>{strength}%</b></span>
              <input type="range" min="0" max="100" value={strength} onChange={e => setStrength(Number(e.target.value))} />
            </label>
          </div>
          {mixedPreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(245,248,255,.52)', marginBottom: 8 }}>Pre-master preview:</div>
              <audio controls src={mixedPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <button className="primary" onClick={() => runMaster()} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> {busy ? 'Mastering...' : `Master for ${PLATFORMS.find(p => p.id === platform)?.label}`}
          </button>
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow onBack={() => go(4)} />
        </div>
      );

      case 6: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 6 — Download your master</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Download WAV for archiving and distribution. MP3 for fast sharing and preview.
          </p>
          {masterRender.profile && (
            <div style={{ ...cardGreen, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>✓ Mastering complete</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Platform', PLATFORMS.find(p => p.id === platform)?.label],
                  ['Target loudness', `${masterRender.target_lufs} LUFS`],
                  ['Mode', mode],
                  ['AI strength', `${strength}%`],
                ].map(([k, v]) => (
                  <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '6px 0' }}>
                    <div style={{ fontSize: 11, color: 'rgba(245,248,255,.44)' }}>{k}</div>
                    <div style={{ fontWeight: 700, marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {masterPreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(245,248,255,.52)', marginBottom: 8 }}>30-second master preview:</div>
              <audio controls src={masterPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <div className="actions" style={{ marginBottom: 22 }}>
            {masterWavUrl && <a className="primary" href={masterWavUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Download size={15} /> Master WAV</a>}
            {masterMp3Url && <a className="secondary" href={masterMp3Url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Download size={15} /> MP3 320k</a>}
            {masterPreviewUrl && <a className="secondary" href={masterPreviewUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Download size={15} /> 30s preview</a>}
          </div>
          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 4, color: '#55e9ff' }}>Make it hit harder</div>
            <div style={{ color: 'rgba(245,248,255,.45)', fontSize: 13, marginBottom: 14 }}>Re-master with enhanced settings — overwrites current master.</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="primary" disabled={busy} onClick={() => runMaster({ overrideStrength: Math.min(100, strength + 15) })} style={{ fontSize: 13, padding: '10px 18px' }}>
                ⚡ More punch — strength {Math.min(100, strength + 15)}%
              </button>
              <button className="secondary" disabled={busy} onClick={() => runMaster({ airBoost: true })} style={{ fontSize: 13, padding: '10px 18px' }}>
                ✨ More air — +2.5 dB at 12 kHz
              </button>
              <button className="secondary" disabled={busy} onClick={() => runMaster({ overrideStrength: Math.min(100, strength + 15), airBoost: true })} style={{ fontSize: 13, padding: '10px 18px' }}>
                🔥 Both
              </button>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(245,248,255,.38)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Already applied in your master</div>
              {HIT_HARDER_TIPS.map((tip, i) => (
                <div key={i} style={{ color: 'rgba(245,248,255,.55)', fontSize: 13, padding: '6px 0', borderBottom: i < HIT_HARDER_TIPS.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', lineHeight: 1.5 }}>
                  <span style={{ color: '#57f09c', marginRight: 8 }}>✓</span>{tip}
                </div>
              ))}
            </div>
          </div>
          <NavRow
            onBack={() => go(5)}
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
            <h2 style={{ margin: '4px 0 8px', fontSize: 'clamp(22px,4vw,36px)' }}>Record · Clean · Mix · Master</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: backendOnline ? '#57f09c' : '#ffcf66', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(245,248,255,.52)' }}>
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
