import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, CloudUpload, Download, RefreshCw, Sparkles, X } from 'lucide-react';
import {
  API_BASE,
  backendUrl,
  checkBackendHealth,
  cleanFullMixOnBackend,
  enhanceMixOnBackend,
  masterAudioOnBackend,
  uploadAudioToBackend,
} from './api/infinityBackend.js';

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Clean' },
  { id: 3, label: 'Mix' },
  { id: 4, label: 'Master' },
  { id: 5, label: 'Download' },
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
  'Presence lift (+1.5 dB at 3.5 kHz) — vocals cut through without raising volume.',
  'Room depth (aecho reverb) — sits the mix in a space instead of sounding flat.',
  'Stereo widening — beat feels bigger, more immersive.',
  'Bus compression + limiter — glues everything into one cohesive sound.',
  'Sibilance control (−1.5 dB at 8 kHz) — removes harshness on the master.',
  'Stereo width on master scales with strength — wider as you push harder.',
];

const overlay = { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.74)', overflowY: 'auto', padding: 18 };
const shell = { maxWidth: 820, margin: '24px auto', borderRadius: 28, padding: 26, color: '#f5f8ff', background: 'rgba(17,20,33,.97)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.45),0 0 48px rgba(85,233,255,.10)' };
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
  const [step, setStep] = useState(1);
  const [backendOnline, setBackendOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // upload
  const [songFile, setSongFile] = useState(null);
  const [songBackend, setSongBackend] = useState(null);
  const [songUrl, setSongUrl] = useState('');

  // clean
  const [cleanJob, setCleanJob] = useState(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState('');

  // mix enhancement
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
  const [masterJob, setMasterJob] = useState(null);
  const [masterCacheBust, setMasterCacheBust] = useState(0);

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

  const handleSongFile = async (file) => {
    setBusy(true); setError(''); setStatus('Uploading song...');
    setSongFile(file);
    const url = URL.createObjectURL(file);
    songUrlRef.current = url;
    setSongUrl(url);
    try {
      const res = await uploadAudioToBackend(file);
      setSongBackend(res.file);
      setStatus('Song uploaded. Ready to clean.');
    } catch (err) {
      setError(`Upload failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
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

  const runMaster = async ({ overrideStrength, airBoost = false } = {}) => {
    const targetId = enhancedFileId || songBackend?.file_id;
    if (!targetId) return;
    const s = overrideStrength ?? strength;
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform;
    setBusy(true); setError('');
    setStatus(`Mastering for ${platformLabel}${airBoost ? ' + air boost' : ''}${overrideStrength ? ' (more punch)' : ''}...`);
    try {
      const job = await masterAudioOnBackend(targetId, mode, s, platform, airBoost);
      setMasterJob(job);
      setMasterCacheBust(Date.now());
      setStatus('Mastering complete. Your files are ready.');
      if (step !== 5) go(5);
    } catch (err) {
      setError(`Mastering failed: ${safeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSongFile(null); setSongBackend(null); setSongUrl('');
    setCleanJob(null); setCleanedPreviewUrl('');
    setEnhanceJob(null); setEnhancedFileId(null); setEnhancedPreviewUrl('');
    setMasterJob(null); setMasterCacheBust(0); setError(''); setStatus('');
    setPresenceBoost(true); setReverbAmount(0.2); setStereoWidth(1.3); setBusCompress(true);
  };

  const masterDownloads = masterJob?.result?.downloads || {};
  const bust = masterCacheBust ? `?t=${masterCacheBust}` : '';
  const masterWavUrl = masterDownloads.master_wav ? backendUrl(masterDownloads.master_wav) : '';
  const masterMp3Url = masterDownloads.master_mp3 ? backendUrl(masterDownloads.master_mp3) : '';
  const masterPreviewUrl = masterDownloads.master_preview ? `${backendUrl(masterDownloads.master_preview)}${bust}` : '';
  const masterRender = masterJob?.result?.render || {};

  const reverbLabel = reverbAmount < 0.06 ? 'Dry' : reverbAmount < 0.35 ? 'Room' : reverbAmount < 0.65 ? 'Studio' : reverbAmount < 0.85 ? 'Hall' : 'Cathedral';

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
              <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13 }}>{formatBytes(songFile.size)}</div>
              {songUrl && <audio controls src={songUrl} style={{ width: '100%', marginTop: 10 }} />}
            </div>
          )}
          <label
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px dashed rgba(85,233,255,.32)', background: 'rgba(85,233,255,.05)', borderRadius: 18, padding: 28, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (!busy && e.dataTransfer.files[0]) handleSongFile(e.dataTransfer.files[0]); }}
          >
            <input type="file" accept="audio/*,.mp3,.wav,.flac,.webm,.ogg,.m4a,.aac" style={{ display: 'none' }} disabled={busy} onChange={e => { if (e.target.files[0]) handleSongFile(e.target.files[0]); }} />
            <CloudUpload size={30} color="#55e9ff" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop your song here or click to browse</div>
              <div style={{ color: 'rgba(245,248,255,.52)', fontSize: 13 }}>MP3 · WAV · FLAC · M4A · up to 250 MB</div>
            </div>
          </label>
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
              'Sub-bass rumble removal (30 Hz high-pass)',
              'Gentle top-end rolloff (18 kHz low-pass)',
              'Noise floor reduction (afftdn −20 dB)',
              'Light de-essing at 7 kHz (−2 dB notch)',
              'Gentle mix compression (1.8:1 ratio)',
              'Loudness normalization (−16 LUFS / −1.5 dBTP)',
            ].map((item, i) => (
              <div key={i} style={{ color: 'rgba(245,248,255,.65)', fontSize: 13, padding: '5px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
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
              <audio controls src={cleanedPreviewUrl} style={{ width: '100%' }} />
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
              <div style={{ color: 'rgba(245,248,255,.38)', fontSize: 12, marginTop: 5 }}>Dry = no reverb · Room = subtle depth · Hall = spacious · Cathedral = lush</div>
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
          <button className="primary" onClick={runEnhance} disabled={busy} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> {busy ? 'Enhancing...' : enhanceJob ? 'Re-mix with new settings' : 'Apply mix settings'}
          </button>
          <StatusBox message={status} error={error} busy={busy} />
          <NavRow onBack={() => go(2)} />
        </div>
      );

      case 4: return (
        <div>
          <h3 style={{ margin: '0 0 6px' }}>Step 4 — Master for your platform</h3>
          <p style={{ color: 'rgba(245,248,255,.58)', marginBottom: 18, lineHeight: 1.6 }}>
            Pick where you're releasing. Infinity hits the exact loudness target for that platform automatically.
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
              <span>Mastering intensity <b>{strength}%</b></span>
              <input type="range" min="0" max="100" value={strength} onChange={e => setStrength(Number(e.target.value))} />
            </label>
          </div>
          {enhancedPreviewUrl && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(245,248,255,.52)', marginBottom: 8 }}>Pre-master preview:</div>
              <audio controls src={enhancedPreviewUrl} style={{ width: '100%' }} />
            </div>
          )}
          <button className="primary" onClick={() => runMaster()} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <div style={{ fontWeight: 800, marginBottom: 12 }}>✓ Mastering complete</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Platform', PLATFORMS.find(p => p.id === platform)?.label],
                  ['Target loudness', `${masterJob.result.target_lufs ?? masterRender.target_lufs ?? _lufsLabel(platform)} LUFS`],
                  ['Style', mode],
                  ['Intensity', `${strength}%`],
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
          <StatusBox message={status} error={error} busy={busy} />
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
            <h2 style={{ margin: '4px 0 8px', fontSize: 'clamp(22px,4vw,36px)' }}>Clean · Mix · Master</h2>
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
