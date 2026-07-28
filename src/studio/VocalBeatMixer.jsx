import { useState } from 'react';
import { CloudUpload, Mic2, Music2, RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import {
  analyzeAudioOnBackend, backendUrl, cleanVocalsOnBackend, mixVocalBeatOnBackend,
  pollUntilComplete, uploadAudioToBackend,
} from '../api/infinityBackend.js';
import { useMixParams, MIX_RANGES } from './useMixParams.js';

const card = { border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 18 };
const cardGreen = { ...card, border: '1px solid rgba(87,240,156,.28)', background: 'rgba(87,240,156,.06)' };

function safeError(e) { return e?.message || String(e || 'Unknown error'); }

function fmtPill(analysis) {
  if (!analysis) return [];
  return [
    analysis.integrated_lufs != null && ['Loudness', `${analysis.integrated_lufs} LUFS`],
    analysis.true_peak_dbtp != null && ['Peak', `${analysis.true_peak_dbtp} dBTP`],
    analysis.lra != null && ['LRA', `${analysis.lra} LU`],
    analysis.dynamics?.rms_db != null && ['RMS', `${analysis.dynamics.rms_db} dB`],
    analysis.duration_seconds && ['Length', `${Math.floor(analysis.duration_seconds / 60)}:${String(Math.round(analysis.duration_seconds % 60)).padStart(2, '0')}`],
  ].filter(Boolean);
}

function UploadZone({ label, hint, icon, file, analysis, busy, onFile, color }) {
  return (
    <div>
      <label
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: `1px dashed ${color}52`, background: `${color}0d`, borderRadius: 16, padding: 20, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!busy && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
      >
        <input type="file" accept="audio/*,.mp3,.wav,.flac,.webm,.ogg,.m4a,.aac" style={{ display: 'none' }} disabled={busy} onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
        {icon}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{file ? `✓ ${file.name}` : label}</div>
          <div style={{ color: 'rgba(245,248,255,.5)', fontSize: 12, marginTop: 2 }}>{hint}</div>
        </div>
      </label>
      {analysis && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {fmtPill(analysis).map(([k, v]) => (
            <span key={k} style={{ fontSize: 11, fontWeight: 700, background: `${color}1f`, color, borderRadius: 99, padding: '3px 9px' }}>{k}: {v}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step = 0.01, format, hint, color = '#55e9ff' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: 'rgba(245,248,255,.72)' }}>{label}</span>
        <b style={{ color }}>{format ? format(value) : value}</b>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
      {hint && <div style={{ fontSize: 10, color: 'rgba(245,248,255,.38)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

const pct = (v) => `${Math.round(v * 100)}%`;
const db = (v) => `${v > 0 ? '+' : ''}${Number(v).toFixed(1)} dB`;
const gainDb = (v) => (v <= 0 ? 'Muted' : `${(20 * Math.log10(v)).toFixed(1)} dB`);

export default function VocalBeatMixer({ projectKey, onMixed }) {
  const { params, set, undo, redo, reset, canUndo, canRedo } = useMixParams(projectKey);

  const [vocal, setVocal] = useState({ file: null, backend: null, analysis: null, cleaned: false });
  const [beat, setBeat] = useState({ file: null, backend: null, analysis: null });
  const [busy, setBusy] = useState(false);
  const [cleanBusy, setCleanBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [mixResult, setMixResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const uploadTrack = async (file, which) => {
    setBusy(true); setError('');
    setStatus(`Uploading ${which}…`);
    try {
      const res = await uploadAudioToBackend(file);
      const backend = res.file;
      setStatus(`Analysing ${which}…`);
      let analysis = null;
      try {
        const a = await analyzeAudioOnBackend(backend.file_id);
        analysis = a?.result || a;
      } catch { /* analysis optional at this stage */ }
      if (which === 'vocal') setVocal({ file, backend, analysis, cleaned: false });
      else setBeat({ file, backend, analysis });
      window.dispatchEvent(new CustomEvent('infinity:project-file', {
        detail: { file_id: backend.file_id, name: file.name, size: file.size, kind: which },
      }));
      setStatus(`${which === 'vocal' ? 'Vocal' : 'Beat'} ready.`);
    } catch (err) {
      setError(`${which} upload failed: ${safeError(err)}`);
    } finally { setBusy(false); }
  };

  const runCleanVocal = async () => {
    if (!vocal.backend?.file_id) return;
    setCleanBusy(true); setError('');
    setStatus('Cleaning vocal — noise reduction, gate, de-ess, levelling… (can take a minute)');
    try {
      await cleanVocalsOnBackend(vocal.backend.file_id);
      setVocal((v) => ({ ...v, cleaned: true }));
      setStatus('Vocal cleaned. The mix will use the cleaned take automatically.');
    } catch (err) {
      setError(`Vocal clean failed: ${safeError(err)}`);
    } finally { setCleanBusy(false); }
  };

  const renderMix = async () => {
    if (!vocal.backend?.file_id || !beat.backend?.file_id) return;
    setBusy(true); setError(''); setProgress(0); setProgressMsg('Starting…'); setMixResult(null);
    setStatus('Rendering your mix through the Infinity chain…');
    try {
      const init = await mixVocalBeatOnBackend(vocal.backend.file_id, beat.backend.file_id, params);
      let job = init;
      if (init?.job_id) {
        job = await pollUntilComplete(init.job_id, (p, msg) => { setProgress(p); setProgressMsg(msg); });
      }
      const result = job?.result;
      if (result?.mix?.status !== 'completed') {
        throw new Error(result?.mix?.reason || 'Mix render did not complete');
      }
      setMixResult(result);
      const mid = result.mixed_file_id;
      const preview = result.downloads?.mixed_mp3 || result.downloads?.mixed_wav || (mid ? result.downloads?.mixed_original : '');
      const url = preview ? backendUrl(preview) : '';
      setPreviewUrl(url);
      setStatus('Mix rendered — listen below, tweak and re-render, or continue to mastering.');
      window.dispatchEvent(new CustomEvent('infinity:project-sound', {
        detail: {
          id: `mix_${Date.now()}`, type: 'mix-render', source: 'vocal-beat-mixer',
          name: `Mix — ${vocal.file?.name || 'vocal'} + ${beat.file?.name || 'beat'}`,
          parameters: result.mix?.parameters || params,
          chain: result.mix?.chain || [],
          preview_url: preview || '', download_url: result.downloads?.mixed_wav || '',
          created_at: new Date().toISOString(),
        },
      }));
      if (mid && onMixed) onMixed({ mixedFileId: mid, previewUrl: url });
    } catch (err) {
      setError(`Mix failed: ${safeError(err)}`);
    } finally {
      setBusy(false); setProgress(null);
    }
  };

  const soloVocal = params.beatMute && !params.vocalMute;
  const soloBeat = params.vocalMute && !params.beatMute;
  const chain = mixResult?.mix?.chain || [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        <UploadZone
          label="Drop your VOCAL here" hint="Dry or rough vocal · MP3/WAV/FLAC"
          icon={<Mic2 size={24} color="#55e9ff" />} color="#55e9ff"
          file={vocal.file} analysis={vocal.analysis} busy={busy}
          onFile={(f) => uploadTrack(f, 'vocal')}
        />
        <UploadZone
          label="Drop your BEAT here" hint="Instrumental · MP3/WAV/FLAC"
          icon={<Music2 size={24} color="#b78aff" />} color="#b78aff"
          file={beat.file} analysis={beat.analysis} busy={busy}
          onFile={(f) => uploadTrack(f, 'beat')}
        />
      </div>

      {vocal.backend && (
        <div style={{ ...card, marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{vocal.cleaned ? '✓ Vocal cleaned' : 'Clean the vocal first (recommended)'}</div>
            <div style={{ fontSize: 12, color: 'rgba(245,248,255,.5)' }}>Infinity Clean: noise reduction, breath gate, de-ess, levelling. The mix uses the cleaned take automatically.</div>
          </div>
          <button className="secondary" disabled={cleanBusy || vocal.cleaned} onClick={runCleanVocal} style={{ flexShrink: 0 }}>
            {cleanBusy ? 'Cleaning…' : vocal.cleaned ? 'Cleaned ✓' : 'Clean vocal'}
          </button>
        </div>
      )}

      {vocal.backend && beat.backend && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Shape the mix</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="secondary" onClick={undo} disabled={!canUndo} title="Undo" style={{ padding: '6px 10px' }}><Undo2 size={14} /></button>
              <button className="secondary" onClick={redo} disabled={!canRedo} title="Redo" style={{ padding: '6px 10px' }}><RotateCw size={14} /></button>
              <button className="secondary" onClick={reset} title="Reset to defaults" style={{ padding: '6px 10px' }}><RotateCcw size={14} /> Reset</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}>
            {/* Track strips */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#55e9ff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Vocal track</div>
              <Slider label="Vocal level" value={params.vocalGain} onChange={(v) => set('vocalGain', v)} min={MIX_RANGES.vocalGain[0]} max={MIX_RANGES.vocalGain[1]} format={gainDb} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <button className={params.vocalMute ? 'primary' : 'secondary'} onClick={() => set('vocalMute', !params.vocalMute)} style={{ fontSize: 11, padding: '5px 10px' }}>Mute</button>
                <button className={soloVocal ? 'primary' : 'secondary'} onClick={() => { set('beatMute', !soloVocal); if (!soloVocal) set('vocalMute', false); }} style={{ fontSize: 11, padding: '5px 10px' }}>Solo</button>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#b78aff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Beat track</div>
              <Slider label="Beat level" value={params.beatGain} onChange={(v) => set('beatGain', v)} min={MIX_RANGES.beatGain[0]} max={MIX_RANGES.beatGain[1]} format={gainDb} color="#b78aff" />
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button className={params.beatMute ? 'primary' : 'secondary'} onClick={() => set('beatMute', !params.beatMute)} style={{ fontSize: 11, padding: '5px 10px' }}>Mute</button>
                <button className={soloBeat ? 'primary' : 'secondary'} onClick={() => { set('vocalMute', !soloBeat); if (!soloBeat) set('beatMute', false); }} style={{ fontSize: 11, padding: '5px 10px' }}>Solo</button>
              </div>
              <Slider label="Beat stereo width" value={params.beatStereoWidth} onChange={(v) => set('beatStereoWidth', v)} min={MIX_RANGES.beatStereoWidth[0]} max={MIX_RANGES.beatStereoWidth[1]} format={(v) => `${v.toFixed(1)}×`} color="#b78aff" />
            </div>

            {/* Vocal tone */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(245,248,255,.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Vocal tone</div>
              <Slider label="Presence · Infinity Air" value={params.presence} onChange={(v) => set('presence', v)} min={MIX_RANGES.presence[0]} max={MIX_RANGES.presence[1]} step={0.1} format={db} hint="3.2 kHz bell — cut-through" />
              <Slider label="Air shelf" value={params.air} onChange={(v) => set('air', v)} min={MIX_RANGES.air[0]} max={MIX_RANGES.air[1]} step={0.1} format={db} hint="12 kHz shelf" />
              <Slider label="Clarity · Infinity Dynamic EQ" value={params.clarity} onChange={(v) => set('clarity', v)} min={MIX_RANGES.clarity[0]} max={MIX_RANGES.clarity[1]} step={0.1} format={db} hint="1.8 kHz bell" />
              <Slider label="Warmth · Infinity Harmonics" value={params.warmth} onChange={(v) => set('warmth', v)} min={0} max={1} format={pct} hint="Harmonic saturation" />
              <Slider label="De-ess · Infinity De-Esser" value={params.deess} onChange={(v) => set('deess', v)} min={0} max={1} format={pct} hint="7–9 kHz sibilance control" />
            </div>

            {/* Dynamics & space */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(245,248,255,.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Dynamics & space</div>
              <Slider label="Compression · Infinity Opto" value={params.compression} onChange={(v) => set('compression', v)} min={0} max={1} format={pct} hint="Optical-style vocal levelling" />
              <Slider label="Reverb · Infinity Space" value={params.reverb} onChange={(v) => set('reverb', v)} min={0} max={1} format={pct} hint="Short-plate style send" />
              <Slider label="Delay · Infinity Echo" value={params.delay} onChange={(v) => set('delay', v)} min={0} max={1} format={pct} hint="240 ms slap send" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <input type="checkbox" id="vbm-buscomp" checked={params.busCompress} onChange={(e) => set('busCompress', e.target.checked)} />
                <label htmlFor="vbm-buscomp" style={{ fontSize: 12, color: 'rgba(245,248,255,.72)' }}>Mix bus compression (2:1 glue)</label>
              </div>
            </div>
          </div>

          <button
            className="primary" onClick={renderMix} disabled={busy}
            style={{ width: '100%', marginTop: 16, padding: '13px 0', fontSize: 15, fontWeight: 800 }}
          >
            {busy ? 'Rendering mix…' : mixResult ? '↻ Re-render mix with current settings' : '▶ Render my mix'}
          </button>
          {progress != null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: 'rgba(245,248,255,.72)' }}>{progressMsg || 'Processing…'}</span><b style={{ color: '#55e9ff' }}>{progress}%</b>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#55e9ff', borderRadius: 99, transition: 'width .4s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {(status || error) && (
        <div style={{ border: `1px solid ${error ? 'rgba(255,90,90,.35)' : 'rgba(87,240,156,.28)'}`, background: error ? 'rgba(255,90,90,.09)' : 'rgba(87,240,156,.06)', color: error ? '#ffd8d8' : '#f5f8ff', borderRadius: 14, padding: '11px 14px', marginTop: 14, fontSize: 14, lineHeight: 1.6 }}>
          {error || status}
        </div>
      )}

      {previewUrl && (
        <div style={{ ...cardGreen, marginTop: 14 }}>
          <div style={{ color: '#57f09c', fontWeight: 800, marginBottom: 8 }}>✓ Rendered mix</div>
          <audio controls src={previewUrl} style={{ width: '100%' }} />
          {chain.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'rgba(245,248,255,.6)' }}>Processing chain applied ({chain.length} modules)</summary>
              <div style={{ marginTop: 8 }}>
                {chain.map((stage, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <b style={{ minWidth: 170, color: '#55e9ff' }}>{stage.module}</b>
                    <span style={{ color: 'rgba(245,248,255,.6)' }}>
                      {Object.entries(stage.params || {}).map(([k, v]) => `${k}: ${typeof v === 'number' ? v : String(v)}`).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
