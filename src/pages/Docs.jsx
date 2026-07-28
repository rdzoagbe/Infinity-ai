import { useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_META = {
  available: { label: 'Available', color: '#57f09c' },
  beta: { label: 'Beta', color: '#55e9ff' },
  experimental: { label: 'Experimental', color: '#ffcf66' },
  planned: { label: 'Planned', color: 'rgba(245,248,255,.45)' },
};

// Every claim below is audited against the implementation. Feature states:
// Available = implemented and verified · Beta = implemented, rough edges ·
// Experimental = works but limited, honestly labelled · Planned = not built yet.
const DOC_SECTIONS = [
  {
    id: 'quickstart',
    title: 'Quick start',
    color: 'var(--cyan)',
    bg: 'var(--cyan-soft)',
    articles: [
      {
        title: 'Getting started with Infinity AI',
        status: 'available',
        body: `Infinity AI turns a recording into a mastered track in one project workspace.\n\n1. Create a project from the Dashboard.\n2. Import audio — either a finished song, or a separate vocal and beat to mix here.\n3. Infinity measures the file: loudness (LUFS), true peak, loudness range, dynamics, noise floor, spectral balance, phase correlation and clipping.\n4. Review the technical release check and the detected problems, then accept or ignore each recommendation.\n5. Render your mix (Vocal + Beat mode), master to a platform target, compare loudness-matched, and download WAV, MP3 and the QC report.`,
      },
      {
        title: 'Supported audio formats and limits',
        status: 'available',
        body: `Upload formats: WAV, MP3, FLAC, M4A, AAC, OGG, WebM. File contents are checked against the extension — mislabelled files are rejected.\n\nMaximum upload size: 250 MB per file. Per-user storage quota: 2 GB by default.\n\nExport formats today: mastered WAV (44.1 kHz stereo), MP3 320 kbps, a 30-second MP3 preview, and a QC report (JSON). Additional export formats are planned.`,
      },
      {
        title: 'Projects and where your data lives',
        status: 'available',
        body: `A project holds your uploads, rendered versions and masters.\n\nLocal mode: projects are stored in your browser (localStorage) — clearing browser data deletes them.\n\nCloud mode (Supabase account): projects are stored per-user with Row Level Security; only you can read them.\n\nAudio files live on the processing server and are automatically deleted 30 days after last activity — download and archive anything you want to keep.`,
      },
    ],
  },
  {
    id: 'studio',
    title: 'Studio & mixing',
    color: 'var(--violet)',
    bg: 'var(--violet-soft)',
    articles: [
      {
        title: 'Vocal + Beat mixing',
        status: 'beta',
        body: `Import mode "Vocal + Beat" gives you two upload slots and a full parametric mixer.\n\nEvery control changes the actual render: vocal and beat level, mute/solo, presence, air, clarity, warmth, de-ess, compression, reverb, delay, beat stereo width and mix-bus glue. Undo, redo and reset are built in, and your settings are saved per project and restored when you come back.\n\nRendering runs the Infinity chain on the server and returns the processed mix plus a report of every module that was applied.`,
      },
      {
        title: 'The Infinity processing chain',
        status: 'available',
        body: `The vocal chain is built from original processors implemented with FFmpeg primitives — we do not claim recreations of any commercial plugin.\n\n• Infinity Clean — noise reduction and breath gate\n• Infinity Dynamic EQ — corrective cuts plus your clarity setting\n• Infinity De-Esser — two-band sibilance control\n• Infinity Opto — optical-style levelling compression\n• Infinity Harmonics — tanh saturation (warmth)\n• Infinity Air — presence bell and air shelf\n• Infinity Echo / Infinity Space — delay and reverb sends\n• Mix Bus Compressor and Infinity Limiter on the sum`,
      },
      {
        title: 'Mastering targets',
        status: 'available',
        body: `Pick a platform target (Spotify −14, Apple Music −16, YouTube −14, SoundCloud −10, Tidal −14 LUFS) or set your own target loudness (−24 to −6 LUFS) and true-peak ceiling (−3 to −0.1 dBTP) in Advanced settings.\n\nAfter every master, Infinity re-measures the finished file and shows the real before/after numbers — the target you asked for versus what was actually achieved.`,
      },
      {
        title: 'A/B comparison player',
        status: 'available',
        body: `The comparison player decodes the real audio: waveforms are drawn from the samples, clicking the waveform seeks, and switching between Original, Mix and Master continues from the same position.\n\nSources are loudness-matched using measured LUFS, and the exact matching gain is displayed on each button — you compare quality, not volume.\n\nShortcuts: Space play/pause · 1/2/3 switch source · Shift-drag the waveform to loop a section · L clears the loop.`,
      },
    ],
  },
  {
    id: 'analysis',
    title: 'Analysis & processing',
    color: 'var(--green)',
    bg: 'var(--green-soft)',
    articles: [
      {
        title: 'What is actually measured',
        status: 'available',
        body: `Every number in the analysis screen is computed from your file with FFmpeg:\n\n• Integrated loudness (LUFS), true peak (dBTP), loudness range (LRA)\n• RMS, crest factor, noise floor, dynamic range\n• 7-band spectral balance (sub / bass / low-mid / mid / upper-mid / presence / air)\n• Stereo phase correlation and clipping detection\n\nWhen something cannot be measured, the UI says "Unavailable" — no defaults, no invented values.`,
      },
      {
        title: 'BPM and key detection',
        status: 'planned',
        body: `Not implemented yet. Earlier versions showed BPM and key values that were not real measurements; that has been removed.\n\nUntil a real detector ships (librosa/essentia integration), BPM and key display "Unavailable" everywhere in the product.`,
      },
      {
        title: 'Technical release check',
        status: 'available',
        body: `Eight separate checks calculated only from verified measurements: loudness, true peak, clipping, dynamics, noise, frequency balance, stereo compatibility and export readiness.\n\nEach reports Pass, Warning, Fail or Unavailable with the measured value and a plain-language explanation. There is no combined "readiness percentage" — a single number would hide which dimension needs work.`,
      },
      {
        title: 'Stem separation',
        status: 'experimental',
        body: `When Demucs is installed on the processing server, stems (vocals, drums, bass, other) are separated with a real AI model.\n\nWhen Demucs is not available, a mid/side approximation runs instead: vocals ≈ centre channel, instrumental ≈ side content. This is clearly labelled in the result and is NOT equivalent to AI separation — expect bleed between stems.\n\nThe method actually used is always shown with the result.`,
      },
      {
        title: 'Sound Lab',
        status: 'experimental',
        body: `The Sound Lab is an experimental synthesised sound generator: it produces short tonal WAV textures from your prompt using deterministic backend synthesis.\n\nIt is not a generative music model — results are simple pads and textures, useful as layers or transitions. Generated assets are real downloadable files saved to your project library.`,
      },
      {
        title: 'AI style transform and producer feedback',
        status: 'experimental',
        body: `Style transform (re-generating your track in a different genre with MusicGen) and AI producer feedback (a written critique based on your track's real measurements) require API keys configured on the server.\n\nWhen the keys are missing the buttons report the feature as unavailable rather than simulating output. Style transform works on a duration-limited excerpt and is experimental.`,
      },
    ],
  },
  {
    id: 'api',
    title: 'API & developers',
    color: 'var(--amber)',
    bg: 'var(--amber-soft)',
    articles: [
      {
        title: 'Backend API overview',
        status: 'beta',
        body: `The backend is a FastAPI service; the base URL comes from VITE_INFINITY_API_URL.\n\nLong-running work returns a job id immediately; poll:\n\nGET /api/v1/jobs/{job_id}\n\nResponse: { status: "queued" | "processing" | "completed" | "failed", progress, message, result }\n\nJobs survive server restarts; a job interrupted mid-processing reports failed with an explanation instead of disappearing.`,
      },
      {
        title: 'Authentication and ownership',
        status: 'available',
        body: `Requests carry either a Supabase JWT (Authorization: Bearer) or an anonymous per-browser client id (X-Infinity-Client). Every file, project and job belongs to the identity that created it — cross-user access returns 404.\n\nDownload links are HMAC-signed and expire (7 days by default). Tampered or expired links are rejected.`,
      },
      {
        title: 'Core endpoints',
        status: 'available',
        body: `POST /api/v1/audio/upload — multipart file field; validates extension, magic bytes, size and quota.\n\nPOST /api/v1/audio/analyze — { file_id }; returns full measurements, problems and the technical release check.\n\nPOST /api/v1/audio/mix-vocal-beat — { vocal_file_id, beat_file_id, ...parameters }; all parameters validated and clamped server-side.\n\nPOST /api/v1/audio/master — { file_id, mode, strength, platform, target_lufs?, tp_ceiling? }; result includes post-render QC.\n\nPOST /api/v1/export/package — { file_id }; builds WAV + MP3 + QC report downloads.\n\nDELETE /api/v1/files/{id} · DELETE /api/v1/projects/{id} · DELETE /api/v1/account`,
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & data',
    color: 'var(--red)',
    bg: 'rgba(255,111,125,.14)',
    articles: [
      {
        title: 'Private beta — plans and pricing',
        status: 'planned',
        body: `Infinity AI is currently a free private beta. There are no paid plans yet.\n\nPlanned for later (clearly not available today): Free, Creator and Pro plans plus pay-per-track credits. Usage limits during the beta: 250 MB per upload, 2 GB storage per user, and rate limits on processing requests.`,
      },
      {
        title: 'File retention and deletion',
        status: 'available',
        body: `Audio files on the processing server are deleted automatically 30 days after last activity. Download and archive anything you want to keep.\n\nDelete a single file or project at any time from the app. "Delete local data" in Settings clears everything stored in this browser.\n\nFull account-data deletion: the backend deletes every file, project, job and generated asset belonging to you in one call (DELETE /api/v1/account).`,
      },
      {
        title: 'Privacy',
        status: 'available',
        body: `Uploaded audio is used solely to process your requests. It is not used to train models and is not shared with third parties.\n\nCloud projects live in your Supabase-backed account under Row Level Security. Audit logs record events (upload, delete, export) by user id only — never file contents.`,
      },
    ],
  },
];

function StatusChip({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: meta.color, border: `1px solid ${meta.color}55`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [activeArticle, setActiveArticle] = useState(null);

  const section = DOC_SECTIONS.find((s) => s.id === activeSection);
  const article = activeArticle !== null ? section?.articles[activeArticle] : null;

  return (
    <div className="view docs-view" style={{ minHeight: '100vh', background: 'var(--bg, #060912)', color: 'var(--text, #f6f8ff)' }}>
      <div className="docs-shell">
        <aside className="docs-sidebar">
          <div className="docs-search-hint">Documentation</div>
          {DOC_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              className={'docs-nav-item' + (activeSection === sec.id ? ' active' : '')}
              onClick={() => { setActiveSection(sec.id); setActiveArticle(null); }}
            >
              <span className="docs-nav-dot" style={{ background: sec.color }} />
              {sec.title}
            </button>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <Link to="/app" className="btn small" style={{ width: '100%', display: 'block', textAlign: 'center' }}>← Back to app</Link>
          </div>
        </aside>

        <div className="docs-content">
          {article ? (
            <div className="docs-article">
              <button className="docs-back" onClick={() => setActiveArticle(null)}>← {section.title}</button>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="docs-article-tag" style={{ background: section.bg, color: section.color }}>{section.title}</div>
                <StatusChip status={article.status} />
              </div>
              <h1>{article.title}</h1>
              <div className="docs-body">
                {article.body.split('\n\n').map((para, i) => (
                  para.startsWith('•') || para.includes('\n•')
                    ? <ul key={i}>{para.split('\n').filter((l) => l.startsWith('•')).map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>
                    : para.match(/^\d+\.\s/)
                      ? <ol key={i}>{para.split('\n').filter((l) => /^\d+\./.test(l)).map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, '')}</li>)}</ol>
                      : para.includes('\n') && !para.startsWith('•')
                        ? <div key={i} className="docs-code-block"><pre>{para}</pre></div>
                        : <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="docs-section">
              <div className="docs-section-header" style={{ borderColor: section?.color }}>
                <div className="docs-tag" style={{ background: section?.bg, color: section?.color }}>{section?.title}</div>
                <h1>{section?.title}</h1>
                <p>{section?.articles.length} articles · statuses reflect what is actually implemented</p>
              </div>
              <div className="docs-article-list">
                {section?.articles.map((art, i) => (
                  <button key={i} className="docs-article-card" onClick={() => setActiveArticle(i)}>
                    <div className="docs-article-icon" style={{ background: section.bg, color: section.color }}>{i + 1}</div>
                    <div>
                      <strong style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{art.title} <StatusChip status={art.status} /></strong>
                      <p>{art.body.substring(0, 90)}…</p>
                    </div>
                    <span className="docs-arrow">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
