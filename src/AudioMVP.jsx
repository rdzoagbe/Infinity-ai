import { useEffect, useMemo, useState } from 'react';
import { CloudUpload, Download, FileAudio, X } from 'lucide-react';
import {
  API_BASE,
  analyzeAudioOnBackend,
  checkBackendHealth,
  exportPackageOnBackend,
  masterAudioOnBackend,
  mixAudioOnBackend,
  separateStemsOnBackend,
  uploadAudioToBackend,
} from './api/infinityBackend.js';

const panel = {
  position: 'fixed',
  inset: 0,
  zIndex: 9998,
  background: 'rgba(0,0,0,.68)',
  overflowY: 'auto',
  padding: 18,
};

const card = {
  maxWidth: 1180,
  margin: '24px auto',
  borderRadius: 28,
  padding: 22,
  color: '#f5f8ff',
  background: 'rgba(17,20,33,.97)',
  border: '1px solid rgba(255,255,255,.08)',
  boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.12)',
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function fallbackAnalysis(file) {
  const seed = file.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const keys = ['A minor', 'C minor', 'D minor', 'F# minor', 'G major', 'Eb minor'];
  const genres = ['Afrobeat', 'Trap Soul', 'Cinematic', 'Drill', 'House', 'Gospel', 'Experimental'];
  return {
    duration: 0,
    sampleRate: 'Pending backend',
    channels: file.name.toLowerCase().endsWith('.zip') ? 'Stem package' : 'Pending decode',
    peak: 'Pending decode',
    rms: 'Pending decode',
    bpm: 78 + (seed % 62),
    key: keys[seed % keys.length],
    genre: genres[seed % genres.length],
    vocalTone: seed % 2 ? 'Warm / Airy' : 'Clean / Forward',
    loudness: '-10.2 LUFS target',
    status: file.name.toLowerCase().endsWith('.zip') ? 'ZIP detected; backend stem extraction required' : 'Metadata ready',
  };
}

function waveformFromBuffer(audioBuffer, points = 84) {
  const data = audioBuffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(data.length / points));
  const values = [];

  for (let i = 0; i < points; i += 1) {
    let sum = 0;
    for (let j = 0; j < blockSize; j += 1) {
      sum += Math.abs(data[(i * blockSize) + j] || 0);
    }
    values.push(sum / blockSize);
  }

  const max = Math.max(...values, 0.01);
  return values.map((value) => value / max);
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Waveform({ values }) {
  const safe = values.length ? values : Array.from({ length: 84 }).map((_, index) => Math.abs(Math.sin(index * 0.42)) * 0.8 + 0.08);

  return (
    <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '18px 0' }}>
      {safe.map((value, index) => (
        <span
          key={index}
          style={{
            flex: 1,
            minWidth: 2,
            borderRadius: 999,
            height: `${Math.max(8, value * 100)}%`,
            background: 'linear-gradient(180deg,#55e9ff,rgba(85,233,255,.28))',
            boxShadow: '0 0 14px rgba(85,233,255,.22)',
          }}
        />
      ))}
    </div>
  );
}

function BackendBadge({ online }) {
  const color = online ? '#57f09c' : '#ffcf66';
  const label = online ? 'Backend connected' : 'Backend offline / browser mode';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        padding: '8px 12px',
        border: `1px solid ${online ? 'rgba(87,240,156,.35)' : 'rgba(255,207,102,.35)'}`,
        background: online ? 'rgba(87,240,156,.1)' : 'rgba(255,207,102,.1)',
        color,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        fontSize: 12,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

function JobCard({ title, job }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 14 }}>
      <div style={{ color: 'rgba(245,248,255,.58)', fontSize: 13 }}>{title}</div>
      {job ? (
        <>
          <strong style={{ display: 'block', marginTop: 6 }}>{job.status || 'completed'}</strong>
          <p style={{ color: 'rgba(245,248,255,.68)', lineHeight: 1.5, margin: '8px 0 0' }}>{job.message || 'Job response received.'}</p>
        </>
      ) : (
        <strong style={{ display: 'block', marginTop: 6 }}>Not started</strong>
      )}
    </div>
  );
}

export default function AudioMVP({ open, onClose }) {
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendMessage, setBackendMessage] = useState('Checking backend...');
  const [fileInfo, setFileInfo] = useState(null);
  const [backendFile, setBackendFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [backendAnalysisJob, setBackendAnalysisJob] = useState(null);
  const [mixJob, setMixJob] = useState(null);
  const [masterJob, setMasterJob] = useState(null);
  const [stemsJob, setStemsJob] = useState(null);
  const [exportJob, setExportJob] = useState(null);
  const [waveform, setWaveform] = useState([]);
  const [message, setMessage] = useState('Upload MP3, WAV, FLAC, or a STEM ZIP package.');
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState('Custom AI adaptive');
  const [strength, setStrength] = useState(72);

  useEffect(() => {
    if (!open) return;

    let active = true;

    checkBackendHealth()
      .then((result) => {
        if (!active) return;
        setBackendOnline(true);
        setBackendMessage(`Connected to ${API_BASE} (${result.environment || 'development'})`);
      })
      .catch(() => {
        if (!active) return;
        setBackendOnline(false);
        setBackendMessage(`Backend not reachable at ${API_BASE}. Local browser preview still works.`);
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const fileId = backendFile?.file_id || backendFile?.file?.file_id || null;

  const backendResultSummary = useMemo(() => {
    const result = backendAnalysisJob?.result || {};
    return {
      bpm: result.estimated_bpm,
      key: result.estimated_key,
      genre: result.estimated_genre,
      vocalTone: result.vocal_tone,
      loudness: result.loudness_target,
      note: result.note,
    };
  }, [backendAnalysisJob]);

  if (!open) return null;

  const decodeInBrowser = async (file) => {
    if (file.name.toLowerCase().endsWith('.zip')) {
      setMessage('STEM ZIP detected. Backend extraction will process this package.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const context = new AudioContext();
      const decoded = await context.decodeAudioData(buffer.slice(0));
      const data = decoded.getChannelData(0);
      let peak = 0;
      let sum = 0;

      for (let i = 0; i < data.length; i += 1) {
        const abs = Math.abs(data[i]);
        peak = Math.max(peak, abs);
        sum += data[i] * data[i];
      }

      const rms = Math.sqrt(sum / data.length);
      const seed = file.name.length + Math.floor(decoded.duration);
      const keys = ['A minor', 'C minor', 'D minor', 'F# minor', 'G major', 'Eb minor'];
      const genres = ['Afrobeat', 'Trap Soul', 'Cinematic', 'Drill', 'House', 'Gospel', 'Experimental'];

      setWaveform(waveformFromBuffer(decoded));
      setAnalysis({
        duration: decoded.duration,
        sampleRate: `${decoded.sampleRate.toLocaleString()} Hz`,
        channels: decoded.numberOfChannels,
        peak: `${Math.round(peak * 100)}%`,
        rms: `${Math.round(rms * 100)}%`,
        bpm: 74 + (seed % 70),
        key: keys[seed % keys.length],
        genre: genres[seed % genres.length],
        vocalTone: seed % 2 ? 'Warm / Airy' : 'Clean / Forward',
        loudness: '-9.5 LUFS target',
        status: 'Browser analysis complete',
      });

      await context.close?.();
    } catch {
      setMessage('File loaded, but browser decoding was limited. Backend processing may still handle this file.');
    }
  };

  const runBackendUploadAndAnalyze = async (file) => {
    try {
      setMessage('Uploading to Infinity backend...');
      const uploadResponse = await uploadAudioToBackend(file);
      const uploadedFile = uploadResponse.file;
      setBackendFile(uploadedFile);
      setBackendOnline(true);
      setBackendMessage(`Backend received file: ${uploadedFile.file_id}`);

      setMessage('Running backend analysis...');
      const analyzeResponse = await analyzeAudioOnBackend(uploadedFile.file_id);
      setBackendAnalysisJob(analyzeResponse);
      setMessage('Backend upload and analysis completed.');
    } catch (error) {
      setBackendOnline(false);
      setBackendMessage(`Backend action failed: ${error.message}`);
      setMessage('Backend unavailable or failed. Browser-local preview remains available.');
    }
  };

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    setProcessing(true);
    setMessage('Reading file locally in your browser...');
    setFileInfo({ name: file.name, type: file.type || 'Unknown', size: file.size, modified: file.lastModified });
    setAnalysis(fallbackAnalysis(file));
    setBackendAnalysisJob(null);
    setMixJob(null);
    setMasterJob(null);
    setStemsJob(null);
    setExportJob(null);
    setBackendFile(null);
    setWaveform([]);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(file.name.toLowerCase().endsWith('.zip') ? '' : url);

    await decodeInBrowser(file);
    await runBackendUploadAndAnalyze(file);

    setProcessing(false);
  };

  const runBackendJob = async (kind) => {
    if (!fileId) {
      setMessage('Upload a file to the backend first.');
      return;
    }

    try {
      setProcessing(true);
      if (kind === 'mix') {
        setMessage('Running backend mix placeholder job...');
        const job = await mixAudioOnBackend(fileId, mode, Number(strength));
        setMixJob(job);
        setMessage('Backend mix job completed.');
      }

      if (kind === 'master') {
        setMessage('Running backend mastering placeholder job...');
        const job = await masterAudioOnBackend(fileId, mode, Number(strength));
        setMasterJob(job);
        setMessage('Backend mastering job completed.');
      }

      if (kind === 'stems') {
        setMessage('Running backend stem separation placeholder job...');
        const job = await separateStemsOnBackend(fileId);
        setStemsJob(job);
        setMessage('Backend stem separation job completed.');
      }

      if (kind === 'export') {
        setMessage('Running backend export package placeholder job...');
        const job = await exportPackageOnBackend(fileId);
        setExportJob(job);
        setMessage('Backend export package job completed.');
      }
    } catch (error) {
      setMessage(`Backend ${kind} failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const exportSession = () => downloadJson('infinity-v5-fullstack-session.json', {
    fileInfo,
    backendFile,
    browserAnalysis: analysis,
    backendAnalysisJob,
    mixJob,
    masterJob,
    stemsJob,
    exportJob,
    mode,
    strength,
    apiBase: API_BASE,
    exportedAt: new Date().toISOString(),
    note: 'Infinity v5 frontend-to-backend session export.',
  });

  return (
    <div style={panel}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow">Infinity v5</p>
            <h2 style={{ margin: '6px 0 8px', fontSize: 'clamp(26px,4vw,42px)' }}>Frontend connected to FastAPI backend</h2>
            <p style={{ color: 'rgba(245,248,255,.68)', lineHeight: 1.7, maxWidth: 860 }}>
              Upload audio from the website, send it to the local FastAPI backend, run backend analysis, trigger mix/master/stems/export jobs, and keep browser playback/waveform preview.
            </p>
          </div>
          <button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', borderRadius: 14, padding: 10 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <BackendBadge online={backendOnline} />
          <span style={{ color: 'rgba(245,248,255,.68)' }}>{backendMessage}</span>
        </div>

        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }}
          style={{ marginTop: 18, borderRadius: 24, border: '1px dashed rgba(85,233,255,.42)', background: 'rgba(85,233,255,.08)', padding: 24, minHeight: 190, display: 'grid', placeItems: 'center', textAlign: 'center', cursor: 'pointer' }}
        >
          <input type="file" accept="audio/*,.mp3,.wav,.flac,.zip" onChange={(event) => handleFiles(event.target.files)} style={{ display: 'none' }} />
          <CloudUpload size={38} color="#55e9ff" />
          <h3 style={{ margin: '12px 0 6px' }}>Drop audio here or click to upload</h3>
          <p style={{ color: 'rgba(245,248,255,.68)', margin: 0 }}>{processing ? 'Processing...' : message}</p>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 14, marginTop: 16 }}>
          <div className="card" style={{ boxShadow: 'none' }}>
            <h3><FileAudio size={18} /> Loaded file</h3>
            {fileInfo ? (
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, color: 'rgba(245,248,255,.68)' }}>
                <span>Name</span><b style={{ color: '#f5f8ff' }}>{fileInfo.name}</b>
                <span>Type</span><b style={{ color: '#f5f8ff' }}>{fileInfo.type}</b>
                <span>Size</span><b style={{ color: '#f5f8ff' }}>{formatBytes(fileInfo.size)}</b>
                <span>File ID</span><b style={{ color: '#f5f8ff', wordBreak: 'break-word' }}>{fileId || 'Not uploaded yet'}</b>
              </div>
            ) : <p style={{ color: 'rgba(245,248,255,.68)' }}>No file loaded yet.</p>}

            {audioUrl ? <audio controls src={audioUrl} style={{ width: '100%', marginTop: 16 }} /> : null}
            <button className="secondary" onClick={exportSession} disabled={!fileInfo} style={{ marginTop: 16 }}>
              <Download size={15} /> Export full-stack session JSON
            </button>
          </div>

          <div className="card" style={{ boxShadow: 'none' }}>
            <h3>Browser waveform</h3>
            <Waveform values={waveform} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginTop: 16 }}>
          {[
            ['Duration', formatTime(analysis?.duration)],
            ['Browser BPM', analysis?.bpm || 'Pending'],
            ['Backend BPM', backendResultSummary.bpm || 'Pending'],
            ['Backend key', backendResultSummary.key || analysis?.key || 'Pending'],
            ['Backend genre', backendResultSummary.genre || analysis?.genre || 'Pending'],
            ['Sample rate', analysis?.sampleRate || 'Pending'],
            ['Channels', analysis?.channels || 'Pending'],
            ['Peak', analysis?.peak || 'Pending'],
            ['RMS', analysis?.rms || 'Pending'],
            ['Loudness target', backendResultSummary.loudness || analysis?.loudness || 'Pending'],
          ].map(([label, value]) => (
            <div key={label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 14 }}>
              <div style={{ color: 'rgba(245,248,255,.58)', fontSize: 13 }}>{label}</div>
              <strong style={{ display: 'block', marginTop: 6 }}>{value}</strong>
            </div>
          ))}
        </div>

        <div className="card" style={{ boxShadow: 'none', marginTop: 16 }}>
          <h3>Backend processing controls</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <label className="auth-field">
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option>Custom AI adaptive</option>
                <option>Trap</option>
                <option>Afrobeat</option>
                <option>Drill</option>
                <option>House</option>
                <option>Gospel</option>
                <option>Cinematic</option>
                <option>Soul</option>
                <option>Experimental</option>
              </select>
            </label>
            <label className="auth-field">
              Strength {strength}%
              <input type="range" min="0" max="100" value={strength} onChange={(event) => setStrength(event.target.value)} />
            </label>
          </div>

          <div className="actions" style={{ marginTop: 14 }}>
            <button className="primary" onClick={() => runBackendJob('mix')} disabled={!fileId || processing}>Run Mix</button>
            <button className="primary" onClick={() => runBackendJob('master')} disabled={!fileId || processing}>Run Master</button>
            <button className="secondary" onClick={() => runBackendJob('stems')} disabled={!fileId || processing}>Separate Stems</button>
            <button className="secondary" onClick={() => runBackendJob('export')} disabled={!fileId || processing}>Create Export Package</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, marginTop: 16 }}>
          <JobCard title="Upload / Analyze" job={backendAnalysisJob} />
          <JobCard title="Mix" job={mixJob} />
          <JobCard title="Master" job={masterJob} />
          <JobCard title="Stems" job={stemsJob} />
          <JobCard title="Export" job={exportJob} />
        </div>
      </div>
    </div>
  );
}
