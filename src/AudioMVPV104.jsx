import { useEffect, useMemo, useState } from 'react';
import { CloudUpload, Download, FileAudio, Sparkles, X } from 'lucide-react';
import {
  API_BASE,
  analyzeAudioOnBackend,
  backendUrl,
  checkBackendHealth,
  exportPackageOnBackend,
  masterAudioOnBackend,
  mixAudioOnBackend,
  separateStemsOnBackend,
  uploadAudioToBackend,
} from './api/infinityBackend.js';

const overlay = { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.68)', overflowY: 'auto', padding: 18 };
const shell = { maxWidth: 1240, margin: '24px auto', borderRadius: 28, padding: 22, color: '#f5f8ff', background: 'rgba(17,20,33,.97)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.12)' };
const miniCard = { border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 14 };

function emitProjectFile(fileRecord) {
  window.dispatchEvent(new CustomEvent('infinity:project-file', { detail: fileRecord }));
}

function emitProjectAsset(assetRecord) {
  window.dispatchEvent(new CustomEvent('infinity:project-sound', { detail: assetRecord }));
}

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
    bpm: 78 + (seed % 62),
    key: keys[seed % keys.length],
    genre: genres[seed % genres.length],
    status: 'Browser-ready / backend pending',
  };
}

function waveformFromBuffer(audioBuffer, points = 96) {
  const data = audioBuffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(data.length / points));
  const values = [];
  for (let i = 0; i < points; i += 1) {
    let sum = 0;
    for (let j = 0; j < blockSize; j += 1) sum += Math.abs(data[(i * blockSize) + j] || 0);
    values.push(sum / blockSize);
  }
  const max = Math.max(...values, 0.01);
  return values.map((value) => value / max);
}

function Waveform({ values, tone = '#55e9ff' }) {
  const safe = values.length ? values : Array.from({ length: 96 }).map((_, index) => Math.abs(Math.sin(index * 0.42)) * 0.8 + 0.08);
  return <div style={{ height: 145, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '18px 0' }}>{safe.map((value, index) => <span key={index} style={{ flex: 1, minWidth: 2, borderRadius: 999, height: `${Math.max(8, value * 100)}%`, background: `linear-gradient(180deg,${tone},rgba(85,233,255,.20))`, boxShadow: '0 0 14px rgba(85,233,255,.22)' }} />)}</div>;
}

function Badge({ online }) {
  const color = online ? '#57f09c' : '#ffcf66';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '8px 12px', border: `1px solid ${color}66`, background: `${color}18`, color, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />{online ? 'Backend connected' : 'Backend offline'}</span>;
}

function StepPill({ state, label }) {
  const color = state === 'done' ? '#57f09c' : state === 'active' ? '#55e9ff' : state === 'error' ? '#ff6b6b' : 'rgba(245,248,255,.38)';
  return <span style={{ border: `1px solid ${color}66`, color, background: `${color}18`, borderRadius: 999, padding: '8px 10px', fontWeight: 800, fontSize: 12 }}>{label}</span>;
}

function JobCard({ title, job, active }) {
  const isCompleted = job?.status === 'completed';
  return <div style={{ ...miniCard, background: active ? 'rgba(85,233,255,.08)' : isCompleted ? 'rgba(87,240,156,.06)' : 'rgba(255,255,255,.04)' }}><div style={{ color: 'rgba(245,248,255,.58)', fontSize: 13 }}>{title}</div><strong style={{ display: 'block', marginTop: 6 }}>{active ? 'Processing' : job?.status || 'Not started'}</strong><p style={{ color: 'rgba(245,248,255,.68)', lineHeight: 1.5, margin: '8px 0 0' }}>{job?.message || (active ? 'Infinity is working on this step.' : 'Waiting for action.')}</p>{job?.result?.render?.steps ? <ul style={{ color: 'rgba(245,248,255,.68)', paddingLeft: 18 }}>{job.result.render.steps.slice(0, 4).map((step) => <li key={step}>{step}</li>)}</ul> : null}</div>;
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

export default function AudioMVPV104({ open, onClose }) {
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendMessage, setBackendMessage] = useState('Checking backend...');
  const [fileInfo, setFileInfo] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [backendFile, setBackendFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [waveform, setWaveform] = useState([]);
  const [message, setMessage] = useState('Upload MP3, WAV, FLAC, or a STEM ZIP package.');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowStep, setWorkflowStep] = useState('idle');
  const [mode, setMode] = useState('Custom AI adaptive');
  const [strength, setStrength] = useState(72);
  const [previewMode, setPreviewMode] = useState('original');
  const [backendAnalysisJob, setBackendAnalysisJob] = useState(null);
  const [mixJob, setMixJob] = useState(null);
  const [masterJob, setMasterJob] = useState(null);
  const [stemsJob, setStemsJob] = useState(null);
  const [exportJob, setExportJob] = useState(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    checkBackendHealth().then((result) => {
      if (!active) return;
      setBackendOnline(true);
      setBackendMessage(`Connected to ${API_BASE} v${result.version || 'backend'} (${result.environment || 'production'})`);
    }).catch(() => {
      if (!active) return;
      setBackendOnline(false);
      setBackendMessage(`Backend not reachable at ${API_BASE}.`);
    });
    return () => { active = false; };
  }, [open]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const fileId = backendFile?.file_id || null;
  const downloads = masterJob?.result?.downloads || {};
  const masteredPreviewUrl = downloads.master_preview ? backendUrl(downloads.master_preview) : '';
  const masteredMp3Url = downloads.master_mp3 ? backendUrl(downloads.master_mp3) : '';
  const masteredWavUrl = downloads.master_wav ? backendUrl(downloads.master_wav) : '';
  const previewSource = previewMode === 'master' && (masteredPreviewUrl || masteredMp3Url) ? (masteredPreviewUrl || masteredMp3Url) : audioUrl;

  const backendResultSummary = useMemo(() => {
    const result = backendAnalysisJob?.result || {};
    return { bpm: result.estimated_bpm, key: result.estimated_key, genre: result.estimated_genre, loudness: result.loudness_target, readiness: result.readiness };
  }, [backendAnalysisJob]);

  if (!open) return null;

  const decodeInBrowser = async (file) => {
    if (file.name.toLowerCase().endsWith('.zip')) return;
    try {
      const buffer = await file.arrayBuffer();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(buffer.slice(0));
      setWaveform(waveformFromBuffer(decoded));
      setAnalysis((current) => ({ ...current, duration: decoded.duration, sampleRate: `${decoded.sampleRate.toLocaleString()} Hz`, channels: decoded.numberOfChannels, status: 'Browser analysis complete' }));
      await context.close?.();
    } catch {
      setMessage('File loaded, but browser decoding was limited. Backend processing may still work.');
    }
  };

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    setProcessing(true);
    setError('');
    setFileBlob(file);
    setFileInfo({ name: file.name, type: file.type || 'Unknown', size: file.size, modified: file.lastModified });
    setAnalysis(fallbackAnalysis(file));
    setBackendFile(null);
    setBackendAnalysisJob(null);
    setMixJob(null);
    setMasterJob(null);
    setStemsJob(null);
    setExportJob(null);
    setWorkflowStep('idle');
    setPreviewMode('original');
    setWaveform([]);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(file.name.toLowerCase().endsWith('.zip') ? '' : url);
    await decodeInBrowser(file);
    try {
      setMessage('Uploading and analyzing...');
      const uploadResponse = await uploadAudioToBackend(file);
      const uploadedFile = uploadResponse.file;
      setBackendFile(uploadedFile);
      setBackendOnline(true);
      emitProjectFile({ id: uploadedFile.file_id, file_id: uploadedFile.file_id, name: uploadedFile.filename || file.name, filename: uploadedFile.filename || file.name, size: uploadedFile.size_bytes || file.size, size_bytes: uploadedFile.size_bytes || file.size, type: uploadedFile.content_type || file.type, source: 'railway-backend', created_at: new Date().toISOString(), status: 'Uploaded and analyzed' });
      const analyzeResponse = await analyzeAudioOnBackend(uploadedFile.file_id);
      setBackendAnalysisJob(analyzeResponse);
      setMessage('Upload and analysis complete. You can now use one-click workflow.');
    } catch (err) {
      setBackendOnline(false);
      setError(err.message);
      setMessage('Backend upload/analyze failed. Check Railway and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const saveMasterToProject = (job, sourceFileId = fileId) => {
    const masterDownloads = job?.result?.downloads || {};
    if (!masterDownloads.master_wav && !masterDownloads.master_mp3) return;
    emitProjectAsset({
      id: `master_${sourceFileId}_${Date.now()}`,
      name: `Mastered version - ${fileInfo?.name || sourceFileId}`,
      prompt: `Mastered with ${mode} at ${strength}% strength`,
      type: 'Mastered version',
      source: 'railway-backend-mastering',
      file_id: sourceFileId,
      original_name: fileInfo?.name,
      mode,
      strength: Number(strength),
      download_url: masterDownloads.master_wav || masterDownloads.master_mp3,
      preview_url: masterDownloads.master_preview || masterDownloads.master_mp3,
      assets: [
        masterDownloads.master_preview ? { name: 'Master preview MP3', type: 'preview', download_url: masterDownloads.master_preview } : null,
        masterDownloads.master_wav ? { name: 'Master WAV', type: 'wav', download_url: masterDownloads.master_wav } : null,
        masterDownloads.master_mp3 ? { name: 'Master MP3', type: 'mp3', download_url: masterDownloads.master_mp3 } : null,
      ].filter(Boolean),
      created_at: new Date().toISOString(),
    });
  };

  const runBackendJob = async (kind) => {
    if (!fileId) { setMessage('Upload a file to the backend first.'); return null; }
    try {
      setProcessing(true);
      setError('');
      if (kind === 'mix') {
        setMessage('Building v10 mix plan...');
        const job = await mixAudioOnBackend(fileId, mode, Number(strength));
        setMixJob(job);
        setMessage('v10 mix plan completed.');
        return job;
      }
      if (kind === 'master') {
        setMessage('Rendering v10 master...');
        const job = await masterAudioOnBackend(fileId, mode, Number(strength));
        setMasterJob(job);
        if (job?.result?.downloads?.master_preview || job?.result?.downloads?.master_mp3) setPreviewMode('master');
        saveMasterToProject(job, fileId);
        setMessage(job?.result?.downloads?.master_wav ? 'v10 master completed and saved to project.' : 'Mastering finished but no render download was returned.');
        return job;
      }
      if (kind === 'stems') {
        setMessage('Running backend stem separation job...');
        const job = await separateStemsOnBackend(fileId);
        setStemsJob(job);
        setMessage('Stem separation job completed.');
        return job;
      }
      if (kind === 'export') {
        setMessage('Creating v10 export package...');
        const job = await exportPackageOnBackend(fileId);
        setExportJob(job);
        setMessage('v10 export package completed.');
        return job;
      }
      return null;
    } catch (err) {
      setError(err.message);
      setMessage(`Backend ${kind} failed: ${err.message}`);
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const runOneClickWorkflow = async () => {
    if (!fileBlob && !fileId) { setMessage('Upload a file first, then run one-click workflow.'); return; }
    setWorkflowRunning(true);
    setProcessing(true);
    setError('');
    let activeFileId = fileId;
    try {
      if (!activeFileId && fileBlob) {
        setWorkflowStep('upload');
        setMessage('One-click workflow: uploading audio...');
        const uploadResponse = await uploadAudioToBackend(fileBlob);
        const uploadedFile = uploadResponse.file;
        activeFileId = uploadedFile.file_id;
        setBackendFile(uploadedFile);
        emitProjectFile({ id: uploadedFile.file_id, file_id: uploadedFile.file_id, name: uploadedFile.filename || fileBlob.name, filename: uploadedFile.filename || fileBlob.name, size: uploadedFile.size_bytes || fileBlob.size, size_bytes: uploadedFile.size_bytes || fileBlob.size, type: uploadedFile.content_type || fileBlob.type, source: 'railway-backend', created_at: new Date().toISOString(), status: 'Uploaded by one-click workflow' });
      }
      setWorkflowStep('analyze');
      setMessage('One-click workflow: analyzing audio...');
      const analyzeResponse = await analyzeAudioOnBackend(activeFileId);
      setBackendAnalysisJob(analyzeResponse);

      setWorkflowStep('mix');
      setMessage('One-click workflow: building mix plan...');
      const mix = await mixAudioOnBackend(activeFileId, mode, Number(strength));
      setMixJob(mix);

      setWorkflowStep('master');
      setMessage('One-click workflow: rendering master...');
      const master = await masterAudioOnBackend(activeFileId, mode, Number(strength));
      setMasterJob(master);
      if (master?.result?.downloads?.master_preview || master?.result?.downloads?.master_mp3) setPreviewMode('master');
      saveMasterToProject(master, activeFileId);

      setWorkflowStep('export');
      setMessage('One-click workflow: creating export package...');
      const exp = await exportPackageOnBackend(activeFileId);
      setExportJob(exp);

      setWorkflowStep('done');
      setMessage('One-click workflow complete: analysis, mix plan, master render, and export package are ready.');
    } catch (err) {
      setWorkflowStep('error');
      setError(err.message);
      setMessage(`One-click workflow failed at ${workflowStep || 'current'} step: ${err.message}`);
    } finally {
      setWorkflowRunning(false);
      setProcessing(false);
    }
  };

  const exportSession = () => downloadJson('infinity-v10-4-audio-session.json', { fileInfo, backendFile, browserAnalysis: analysis, backendAnalysisJob, mixJob, masterJob, stemsJob, exportJob, mode, strength, apiBase: API_BASE, exportedAt: new Date().toISOString(), note: 'Infinity v10.4 one-click audio workflow export.' });
  const readyState = fileId ? 'done' : workflowStep === 'upload' ? 'active' : processing ? 'active' : 'pending';
  const analyzedState = backendAnalysisJob ? 'done' : workflowStep === 'analyze' ? 'active' : 'pending';
  const mixState = mixJob ? 'done' : workflowStep === 'mix' ? 'active' : 'pending';
  const masterState = masterJob ? 'done' : workflowStep === 'master' ? 'active' : 'pending';
  const exportState = exportJob ? 'done' : workflowStep === 'export' ? 'active' : workflowStep === 'error' ? 'error' : 'pending';

  return <div style={overlay}><div style={shell}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}><div><p className="eyebrow">Infinity v10.4</p><h2 style={{ margin: '6px 0 8px', fontSize: 'clamp(26px,4vw,42px)' }}>One-click Mix & Master workflow</h2><p style={{ color: 'rgba(245,248,255,.68)', lineHeight: 1.7, maxWidth: 920 }}>Run the full beta workflow in one action: upload/analyze, build mix plan, render master, create export package, then save the master into the active project library.</p></div><button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', borderRadius: 14, padding: 10 }}><X size={18} /></button></div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}><Badge online={backendOnline} /><StepPill state={readyState} label="1 Upload" /><StepPill state={analyzedState} label="2 Analyze" /><StepPill state={mixState} label="3 Mix Plan" /><StepPill state={masterState} label="4 Master" /><StepPill state={exportState} label="5 Export" /><span style={{ color: 'rgba(245,248,255,.68)' }}>{backendMessage}</span></div>
    {error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12, marginTop: 14 }}>Error: {error}</div> : null}
    <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }} style={{ marginTop: 18, borderRadius: 24, border: '1px dashed rgba(85,233,255,.42)', background: 'rgba(85,233,255,.08)', padding: 24, minHeight: 160, display: 'grid', placeItems: 'center', textAlign: 'center', cursor: 'pointer' }}><input type="file" accept="audio/*,.mp3,.wav,.flac,.zip" onChange={(event) => handleFiles(event.target.files)} style={{ display: 'none' }} /><CloudUpload size={38} color="#55e9ff" /><h3 style={{ margin: '12px 0 6px' }}>Drop audio here or click to upload</h3><p style={{ color: 'rgba(245,248,255,.68)', margin: 0 }}>{processing ? 'Processing...' : message}</p></label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, marginTop: 16 }}><div style={miniCard}><h3><FileAudio size={18} /> Source file</h3>{fileInfo ? <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, color: 'rgba(245,248,255,.68)' }}><span>Name</span><b style={{ color: '#f5f8ff' }}>{fileInfo.name}</b><span>Type</span><b style={{ color: '#f5f8ff' }}>{fileInfo.type}</b><span>Size</span><b style={{ color: '#f5f8ff' }}>{formatBytes(fileInfo.size)}</b><span>File ID</span><b style={{ color: '#f5f8ff', wordBreak: 'break-word' }}>{fileId || 'Not uploaded yet'}</b></div> : <p style={{ color: 'rgba(245,248,255,.68)' }}>No file loaded yet.</p>}<button className="secondary" onClick={exportSession} disabled={!fileInfo} style={{ marginTop: 16 }}><Download size={15} /> Export session JSON</button></div><div style={miniCard}><h3>Before / After Preview</h3><div className="toggle" style={{ margin: '8px 0 12px' }}><button className={previewMode === 'original' ? 'active' : ''} onClick={() => setPreviewMode('original')}>Original</button><button className={previewMode === 'master' ? 'active' : ''} onClick={() => setPreviewMode('master')} disabled={!masteredPreviewUrl && !masteredMp3Url}>Mastered</button></div>{previewSource ? <audio key={previewSource} controls src={previewSource} style={{ width: '100%' }} /> : <p className="muted">Upload audio to enable preview.</p>}<div className="actions" style={{ marginTop: 12 }}>{audioUrl ? <a className="secondary" href={audioUrl} download={fileInfo?.name || 'original-audio'}><Download size={15}/> Original</a> : null}{masteredWavUrl ? <a className="primary" href={masteredWavUrl} target="_blank" rel="noreferrer"><Download size={15}/> Master WAV</a> : null}{masteredMp3Url ? <a className="secondary" href={masteredMp3Url} target="_blank" rel="noreferrer"><Download size={15}/> Master MP3</a> : null}</div></div></div>
    <div style={{ ...miniCard, marginTop: 16 }}><h3>Waveform view</h3><Waveform values={waveform} tone={previewMode === 'master' ? '#ff4de1' : '#55e9ff'} /></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))', gap: 12, marginTop: 16 }}>{[['Duration', formatTime(analysis?.duration)], ['Browser BPM', analysis?.bpm || 'Pending'], ['Backend BPM', backendResultSummary.bpm || 'Pending'], ['Backend key', backendResultSummary.key || analysis?.key || 'Pending'], ['Backend genre', backendResultSummary.genre || analysis?.genre || 'Pending'], ['Readiness', backendResultSummary.readiness || analysis?.status || 'Pending'], ['Sample rate', analysis?.sampleRate || 'Pending'], ['Channels', analysis?.channels || 'Pending'], ['Loudness target', backendResultSummary.loudness || 'Pending']].map(([label, value]) => <div key={label} style={miniCard}><div style={{ color: 'rgba(245,248,255,.58)', fontSize: 13 }}>{label}</div><strong style={{ display: 'block', marginTop: 6 }}>{String(value)}</strong></div>)}</div>
    <div style={{ ...miniCard, marginTop: 16 }}><h3>v10.4 workflow controls</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}><label className="auth-field">Mode<select value={mode} onChange={(event) => setMode(event.target.value)}><option>Custom AI adaptive</option><option>Trap</option><option>Afrobeat</option><option>Drill</option><option>House</option><option>Gospel</option><option>Cinematic</option><option>Soul</option><option>Experimental</option></select></label><label className="auth-field">Strength {strength}%<input type="range" min="0" max="100" value={strength} onChange={(event) => setStrength(event.target.value)} /></label></div><div className="actions" style={{ marginTop: 14 }}><button className="primary" onClick={runOneClickWorkflow} disabled={workflowRunning || processing || (!fileBlob && !fileId)}><Sparkles size={16}/> Run One-Click Workflow</button><button className="secondary" onClick={() => runBackendJob('mix')} disabled={!fileId || processing}>Build Mix Plan</button><button className="secondary" onClick={() => runBackendJob('master')} disabled={!fileId || processing}>Render Master</button><button className="secondary" onClick={() => runBackendJob('export')} disabled={!fileId || processing}>Create Export Package</button><button className="secondary" onClick={() => runBackendJob('stems')} disabled={!fileId || processing}>Separate Stems</button></div></div>
    {exportJob?.result?.downloads ? <div style={{ ...miniCard, marginTop: 16 }}><h3>v10.4 export package</h3><div className="actions">{Object.entries(exportJob.result.downloads).map(([key, url]) => <a key={key} className="secondary" href={backendUrl(url)} target="_blank" rel="noreferrer"><Download size={15}/> {key.replaceAll('_', ' ')}</a>)}</div></div> : null}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, marginTop: 16 }}><JobCard title="Upload / Analyze" job={backendAnalysisJob} active={workflowStep === 'upload' || workflowStep === 'analyze'} /><JobCard title="Mix" job={mixJob} active={workflowStep === 'mix'} /><JobCard title="Master" job={masterJob} active={workflowStep === 'master'} /><JobCard title="Export" job={exportJob} active={workflowStep === 'export'} /><JobCard title="Stems" job={stemsJob} active={false} /></div></div></div>;
}
