import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Image, Music2, PackageCheck, Radio, Rocket, X } from 'lucide-react';

const overlay = { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.72)', overflowY: 'auto', padding: 18 };
const shell = { maxWidth: 1180, margin: '24px auto', borderRadius: 28, padding: 22, color: '#f5f8ff', background: 'rgba(17,20,33,.97)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.12)' };
const card = { border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 18, padding: 14 };
const floating = { position: 'fixed', right: 18, bottom: 96, zIndex: 9994, border: '1px solid rgba(85,233,255,.35)', background: 'linear-gradient(135deg,rgba(85,233,255,.18),rgba(255,77,225,.14))', color: '#f5f8ff', borderRadius: 999, padding: '12px 16px', fontWeight: 900, boxShadow: '0 16px 60px rgba(0,0,0,.36)' };

const releaseTypes = ['Single', 'EP', 'Album', 'Beat Pack', 'Sound Pack'];
const genres = ['Afrobeat', 'Trap', 'Drill', 'House', 'Gospel', 'Cinematic', 'Soul', 'Experimental'];
const platforms = ['Spotify', 'Apple Music', 'YouTube Music', 'TikTok', 'Instagram Reels', 'SoundCloud', 'Audiomack', 'DistroKid / TuneCore ready'];
const checklist = [
  ['Master WAV ready', 'Render and confirm final WAV from Mix & Master.'],
  ['Master MP3 ready', 'Generate 320kbps MP3 for quick sharing and review.'],
  ['Artwork prepared', 'Square cover art placeholder, recommended 3000x3000.'],
  ['Artist metadata complete', 'Artist name, title, genre, language, explicit flag.'],
  ['Credits complete', 'Producer, songwriter, engineer, featured artists.'],
  ['Release date selected', 'Prepare target release date and pre-save window.'],
  ['Distribution notes ready', 'Prepare notes for DistroKid, TuneCore, CD Baby or label ops.'],
  ['Promotion plan ready', 'Short clips, reels hooks, captions, and feedback links.'],
];

function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'infinity-release'; }
function downloadJson(fileName, payload) { const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url); }
function Field({ label, children }) { return <label className="auth-field">{label}{children}</label>; }
function StatusPill({ done, children }) { const color = done ? '#57f09c' : '#ffcf66'; return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${color}66`, background: `${color}18`, color, borderRadius: 999, padding: '7px 10px', fontSize: 12, fontWeight: 900 }}><CheckCircle2 size={14} />{children}</span>; }

function emitReleasePackageToProject(payload, fileName) {
  window.dispatchEvent(new CustomEvent('infinity:project-sound', {
    detail: {
      id: `release_package_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: `Release package - ${payload.release.title || 'Untitled release'}`,
      prompt: `${payload.release.releaseType} release package for ${payload.release.artist || 'Unknown artist'}`,
      type: 'Release package',
      source: 'infinity-v12-release-workflow',
      release_title: payload.release.title,
      artist: payload.release.artist,
      release_type: payload.release.releaseType,
      genre: payload.release.genre,
      release_date: payload.release.releaseDate,
      distributor: payload.release.distributor,
      artwork_filename: payload.artwork?.filename || '',
      checklist_completed: payload.readiness.checklistCompleted,
      checklist_total: payload.readiness.checklistTotal,
      metadata_ready: payload.readiness.metadataReady,
      package_ready: payload.readiness.packageReady,
      status: payload.readiness.packageReady ? 'Release Ready' : 'Draft Release Package',
      filename: fileName,
      payload,
      created_at: payload.generatedAt,
    },
  }));
}

export default function ReleaseWorkflowV12() {
  const [open, setOpen] = useState(false);
  const [artworkName, setArtworkName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [release, setRelease] = useState({ title: '', artist: '', featured: '', releaseType: 'Single', genre: 'Afrobeat', language: 'English', explicit: 'No', releaseDate: '', producer: '', songwriter: '', engineer: '', isrc: '', upc: '', distributor: 'DistroKid / TuneCore ready', pitch: '' });
  const [checked, setChecked] = useState(() => checklist.reduce((acc, item) => ({ ...acc, [item[0]]: false }), {}));

  const completed = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const requiredMetadata = [release.title, release.artist, release.genre, release.releaseType, release.language];
  const metadataReady = requiredMetadata.every(Boolean);
  const packageReady = metadataReady && completed >= 6;

  const update = (key, value) => { setSavedMessage(''); setRelease((current) => ({ ...current, [key]: value })); };
  const toggle = (label) => { setSavedMessage(''); setChecked((current) => ({ ...current, [label]: !current[label] })); };
  const buildReleasePackage = () => ({
    product: 'Infinity',
    version: 'v12.1 Artist Release Workflow',
    release,
    artwork: artworkName ? { filename: artworkName, status: 'placeholder-linked-in-browser' } : { status: 'not attached' },
    checklist: checked,
    readiness: { metadataReady, checklistCompleted: completed, checklistTotal: checklist.length, packageReady },
    platformPreparation: platforms,
    generatedAt: new Date().toISOString(),
    note: 'This is a release-preparation package for artist beta testing. It does not submit music to distributors yet.',
  });
  const exportReleasePackage = () => {
    const payload = buildReleasePackage();
    const fileName = `${slugify(release.title || 'infinity-release')}-release-package.json`;
    emitReleasePackageToProject(payload, fileName);
    downloadJson(fileName, payload);
    setSavedMessage(packageReady ? 'Release package saved into the active project library and downloaded.' : 'Draft release package saved into the active project library and downloaded.');
  };
  const saveOnly = () => {
    const payload = buildReleasePackage();
    const fileName = `${slugify(release.title || 'infinity-release')}-release-package.json`;
    emitReleasePackageToProject(payload, fileName);
    setSavedMessage(packageReady ? 'Release package saved into the active project library.' : 'Draft release package saved into the active project library.');
  };

  return <>
    <button type="button" data-infinity-auth="true" style={floating} onClick={() => setOpen(true)}><Rocket size={16} /> v12 Release Workflow</button>
    {open ? <div data-infinity-auth="true" style={overlay}><div style={shell}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}><div><p className="eyebrow">Infinity v12.1</p><h2 style={{ margin: '6px 0 8px', fontSize: 'clamp(26px,4vw,42px)' }}>Artist Release Workflow</h2><p style={{ color: 'rgba(245,248,255,.68)', lineHeight: 1.7, maxWidth: 880 }}>Prepare a release-ready package after mixing and mastering: metadata, artwork placeholder, credits, platform checklist, and save it into the active project library.</p></div><button type="button" onClick={() => setOpen(false)} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.05)', color: '#f5f8ff', borderRadius: 14, padding: 10 }}><X size={18} /></button></div>
      {savedMessage ? <div style={{ border: '1px solid rgba(87,240,156,.38)', background: 'rgba(87,240,156,.10)', color: '#dfffea', borderRadius: 16, padding: 12, marginTop: 14 }}>{savedMessage}</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 16 }}><div style={card}><Music2 color="#55e9ff" /><b style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{completed}/{checklist.length}</b><span className="muted">Checklist complete</span></div><div style={card}><PackageCheck color="#55e9ff" /><b style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{metadataReady ? 'Ready' : 'Missing'}</b><span className="muted">Metadata</span></div><div style={card}><Image color="#55e9ff" /><b style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{artworkName ? 'Attached' : 'Pending'}</b><span className="muted">Artwork</span></div><div style={card}><Radio color="#55e9ff" /><b style={{ display: 'block', fontSize: 28, marginTop: 8 }}>{packageReady ? 'Release Ready' : 'Draft'}</b><span className="muted">Release package</span></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(320px,.95fr)', gap: 14, marginTop: 16 }} className="auth-grid"><section style={card}><h3>Release metadata</h3><div style={{ display: 'grid', gap: 12 }}><Field label="Release title"><input value={release.title} onChange={(event) => update('title', event.target.value)} placeholder="Song or project title" /></Field><Field label="Primary artist"><input value={release.artist} onChange={(event) => update('artist', event.target.value)} placeholder="Artist name" /></Field><Field label="Featured artist(s)"><input value={release.featured} onChange={(event) => update('featured', event.target.value)} placeholder="Optional" /></Field><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}><Field label="Type"><select value={release.releaseType} onChange={(event) => update('releaseType', event.target.value)}>{releaseTypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Genre"><select value={release.genre} onChange={(event) => update('genre', event.target.value)}>{genres.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Language"><select value={release.language} onChange={(event) => update('language', event.target.value)}><option>English</option><option>French</option><option>Twi</option><option>Spanish</option><option>Portuguese</option><option>Instrumental</option></select></Field><Field label="Explicit"><select value={release.explicit} onChange={(event) => update('explicit', event.target.value)}><option>No</option><option>Yes</option><option>Clean version</option></select></Field></div><Field label="Target release date"><input type="date" value={release.releaseDate} onChange={(event) => update('releaseDate', event.target.value)} /></Field><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}><Field label="ISRC"><input value={release.isrc} onChange={(event) => update('isrc', event.target.value)} placeholder="Optional / distributor" /></Field><Field label="UPC"><input value={release.upc} onChange={(event) => update('upc', event.target.value)} placeholder="Optional / distributor" /></Field></div></div></section>
      <section style={card}><h3>Artwork & credits</h3><div style={{ display: 'grid', gap: 12 }}><Field label="Artwork placeholder"><input type="file" accept="image/*" onChange={(event) => { setSavedMessage(''); setArtworkName(event.target.files?.[0]?.name || ''); }} /></Field>{artworkName ? <StatusPill done>Artwork selected: {artworkName}</StatusPill> : <StatusPill>3000x3000 cover recommended</StatusPill>}<Field label="Producer"><input value={release.producer} onChange={(event) => update('producer', event.target.value)} placeholder="Producer name" /></Field><Field label="Songwriter(s)"><input value={release.songwriter} onChange={(event) => update('songwriter', event.target.value)} placeholder="Writers / composers" /></Field><Field label="Mix/Master engineer"><input value={release.engineer} onChange={(event) => update('engineer', event.target.value)} placeholder="Engineer name" /></Field><Field label="Distributor target"><select value={release.distributor} onChange={(event) => update('distributor', event.target.value)}>{platforms.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Promotion pitch / notes"><textarea rows={4} value={release.pitch} onChange={(event) => update('pitch', event.target.value)} placeholder="Mood, story, audience, release angle, short captions..." /></Field></div></section></div>
      <section style={{ ...card, marginTop: 16 }}><h3>Release readiness checklist</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>{checklist.map(([label, description]) => <button key={label} type="button" onClick={() => toggle(label)} style={{ textAlign: 'left', borderRadius: 16, border: checked[label] ? '1px solid rgba(87,240,156,.45)' : '1px solid rgba(255,255,255,.08)', background: checked[label] ? 'rgba(87,240,156,.09)' : 'rgba(255,255,255,.04)', color: '#f5f8ff', padding: 12 }}><b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{checked[label] ? <CheckCircle2 size={16} color="#57f09c" /> : <CheckCircle2 size={16} color="rgba(245,248,255,.35)" />}{label}</b><span className="muted" style={{ display: 'block', marginTop: 6, lineHeight: 1.45 }}>{description}</span></button>)}</div></section>
      <section style={{ ...card, marginTop: 16 }}><h3>Platform preparation</h3><div className="actions">{platforms.map((item) => <span key={item} className="pill">{item}</span>)}</div><p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>v12.1 prepares and saves a release package. It does not submit to Spotify, Apple Music, TikTok, or distributors yet.</p></section>
      <div className="actions" style={{ marginTop: 16 }}><button type="button" className="primary" onClick={exportReleasePackage}><Download size={16} /> Save to Project & Download JSON</button><button type="button" className="secondary" onClick={saveOnly}>Save to Project Only</button><button type="button" className="secondary" onClick={() => setOpen(false)}>Close</button></div>
    </div></div> : null}
  </>;
}
