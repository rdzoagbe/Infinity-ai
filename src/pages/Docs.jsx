import { useState } from 'react';
import { Link } from 'react-router-dom';

const DOC_SECTIONS = [
  {
    id: 'quickstart',
    title: 'Quick start',
    color: 'var(--cyan)',
    bg: 'var(--cyan-soft)',
    articles: [
      {
        title: 'Getting started with Infinity AI',
        body: `Infinity AI turns a rough recording into a release-ready master in three steps: Upload, Shape, and Master.\n\n1. Open the Studio from the Dashboard or the sidebar.\n2. Drag and drop your audio file (WAV, AIFF, MP3, FLAC up to 500 MB).\n3. Infinity analyses your file — loudness, dynamics, tonal balance, stereo field — and generates a readiness score.\n4. Work through the signal chain: EQ → Compression → Stereo width → Limiting.\n5. Set your mastering target (streaming, CD, vinyl) and export.`,
      },
      {
        title: 'Supported audio formats',
        body: `Upload formats: WAV (16/24/32-bit), AIFF, FLAC, MP3 (128–320 kbps), AAC.\n\nExport formats: WAV 24-bit, WAV 16-bit, MP3 320, MP3 128, FLAC, AAC — all available once a master is complete.\n\nMaximum file size: 500 MB per upload. For stems, upload each stem separately and combine inside a project.`,
      },
      {
        title: 'Projects and workspaces',
        body: `A project holds all versions of a single song: the original upload, individual mix passes, and completed masters.\n\nCreate a project from the Dashboard (＋ New project) or from the Projects view. Each project shows a readiness score, last action, and quick-continue button.\n\nProjects auto-save to your workspace. Use the Library view to find individual stems and exported files.`,
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
        title: 'The three-step Studio workflow',
        body: `Step 1 — Upload: Drop your audio file. Infinity runs a full diagnostic: LUFS, true peak, dynamic range, stereo correlation, tonal balance. Problems are flagged with suggested fixes.\n\nStep 2 — Shape your sound: Work the signal chain module by module. Each module shows before/after measurements. Simple mode shows the most important controls; Advanced mode exposes every parameter.\n\nStep 3 — Master & Download: Choose a loudness target, apply final limiting, preview against the original with A/B comparison, then export all your formats at once.`,
      },
      {
        title: 'A/B comparison player',
        body: `The A/B player at the bottom of every screen lets you compare your original recording against the current master at any point.\n\nClick Original to hear the unprocessed file. Click Master to hear the latest processed version. Both are loudness-matched so you're comparing tone and dynamics — not just loudness.\n\nUse the play button to start and pause. The waveform shows the current position.`,
      },
      {
        title: 'Simple vs Advanced mode',
        body: `Simple mode surfaces the three or four controls that matter most for each processing module — ideal for quick decisions.\n\nAdvanced mode unlocks every parameter: per-band EQ with surgical precision, multiband compression ratios and attack/release, mid/side stereo control, and custom limiter thresholds.\n\nSwitch between modes at any time — your settings carry over.`,
      },
      {
        title: 'Mastering targets',
        body: `Spotify / Apple Music: target −14 LUFS integrated, true peak −1 dBTP.\nYouTube: −14 LUFS, true peak −1 dBTP.\nCD / Download: −9 to −12 LUFS, true peak −0.3 dBTP.\nVinyl pre-master: −12 to −16 LUFS, reduced high frequencies, controlled stereo width.\nClub / DJ: −6 to −9 LUFS for maximum impact on PA systems.\n\nInfinity automatically sets the limiter and gain staging to hit your chosen target.`,
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI features',
    color: 'var(--green)',
    bg: 'var(--green-soft)',
    articles: [
      {
        title: 'AI audio analysis',
        body: `When you upload a file, Infinity runs a full diagnostic powered by its AI analysis engine:\n\n• Loudness (integrated LUFS, short-term, momentary)\n• True peak level\n• Dynamic range (DR score)\n• Stereo correlation and width\n• Tonal balance (bass, mid, presence, air)\n• Clipping detection\n• Phase issues\n\nEach problem is explained in plain language with a suggested fix.`,
      },
      {
        title: 'AI-assisted EQ',
        body: `Infinity's adaptive EQ reads the tonal balance of your track and compares it against a library of reference masters in your chosen genre. It suggests boosts and cuts to bring your mix closer to the reference target.\n\nYou can accept all suggestions, pick individual ones, or ignore them and work manually. The EQ is always the last word — AI suggestions are a starting point, not a decision.`,
      },
      {
        title: 'Sound Lab — AI generation',
        body: `Sound Lab uses Replicate's MusicGen model to generate audio assets that match your project.\n\nEnter a prompt describing what you need — a drum loop, pad, bass line, transition sound — and Infinity generates options matched to the tempo and key of your uploaded track.\n\nGenerated sounds are saved to your project Library and can be dragged into any mix session.`,
      },
      {
        title: 'Processing jobs and status',
        body: `Heavy AI tasks — analysis, generation, mastering export — run as background jobs. You'll see a progress indicator while they run.\n\nJobs are polled automatically; you don't need to refresh the page. When a job completes, the result appears inline and a notification is shown.\n\nIf a job fails, an error message explains why and offers a retry option.`,
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
        body: `The Infinity AI backend is a FastAPI service. Base URL is set via the VITE_INFINITY_API_URL environment variable.\n\nAll endpoints return JSON. Long-running tasks return a job_id immediately; poll for the result at:\n\nGET /api/v1/jobs/{job_id}\n\nResponse shape: { status: "pending" | "processing" | "completed" | "failed", result?: any, error?: string }`,
      },
      {
        title: 'Audio processing endpoints',
        body: `POST /api/v1/audio/analyse\nBody: multipart/form-data with file field. Returns job_id.\n\nPOST /api/v1/audio/master\nBody: { job_id, settings: { target, eq, compression, stereo, limiter } }. Returns job_id.\n\nGET /api/v1/audio/download/{job_id}?format=wav_24\nStreams the mastered file directly once the job is complete.`,
      },
      {
        title: 'Sound generation endpoints',
        body: `POST /api/v1/generate/sound\nBody: { prompt, duration_seconds, bpm?, key? }. Returns job_id. Uses Replicate MusicGen melody model under the hood.\n\nRequires REPLICATE_API_TOKEN set in the Railway environment. Generation typically takes 20–60 seconds depending on duration.`,
      },
      {
        title: 'Authentication',
        body: `Infinity AI supports two modes:\n\nLocal mode: sessions are stored in localStorage (key: infinity_private_session_v3). No server-side auth required — suitable for self-hosted or offline use.\n\nCloud mode (Supabase): set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The app switches to Supabase auth automatically when these are present. User data, projects, and files are stored in Supabase Storage and Postgres.`,
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & billing',
    color: 'var(--red)',
    bg: 'rgba(255,111,125,.14)',
    articles: [
      {
        title: 'Plans and usage limits',
        body: `Creator plan: 30 GB storage, unlimited projects, up to 10 active mastering jobs per month, Sound Lab generation included.\n\nMonthly processing usage is shown in the sidebar — it resets on your billing date.\n\nStorage is measured against uploaded originals plus exported masters. Intermediate processing files don't count toward your limit.`,
      },
      {
        title: 'Exporting and downloading',
        body: `Every completed master can be downloaded in all six export formats simultaneously from the Masters view.\n\nFormats: WAV 24-bit (archival), WAV 16-bit (CD), MP3 320 (distribution), MP3 128 (preview), FLAC (lossless), AAC (streaming).\n\nFiles are kept for 90 days after the project is last modified. Download and archive locally for permanent storage.`,
      },
      {
        title: 'Privacy and data',
        body: `Audio files uploaded to Infinity AI are used solely to process your request. They are not used to train AI models, shared with third parties, or retained beyond your project's lifetime.\n\nIn local mode (no Supabase), all data stays in your browser — nothing is sent to a server except the audio file during processing jobs.\n\nDelete a project at any time to permanently remove all associated files from our servers.`,
      },
    ],
  },
];


export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [activeArticle, setActiveArticle] = useState(null);

  const section = DOC_SECTIONS.find(s => s.id === activeSection);
  const article = activeArticle !== null ? section?.articles[activeArticle] : null;

  return (
    <div className="view docs-view" style={{ minHeight: '100vh', background: 'var(--bg, #060912)', color: 'var(--text, #f6f8ff)' }}>
      <div className="docs-shell">
        <aside className="docs-sidebar">
          <div className="docs-search-hint">Documentation</div>
          {DOC_SECTIONS.map(sec => (
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
              <div className="docs-article-tag" style={{ background: section.bg, color: section.color }}>{section.title}</div>
              <h1>{article.title}</h1>
              <div className="docs-body">
                {article.body.split('\n\n').map((para, i) => (
                  para.startsWith('•') || para.includes('\n•')
                    ? <ul key={i}>{para.split('\n').filter(l => l.startsWith('•')).map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>
                    : para.match(/^\d+\.\s/)
                      ? <ol key={i}>{para.split('\n').filter(l => /^\d+\./.test(l)).map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, '')}</li>)}</ol>
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
                <p>{section?.articles.length} articles</p>
              </div>
              <div className="docs-article-list">
                {section?.articles.map((art, i) => (
                  <button key={i} className="docs-article-card" onClick={() => setActiveArticle(i)}>
                    <div className="docs-article-icon" style={{ background: section.bg, color: section.color }}>{i + 1}</div>
                    <div>
                      <strong>{art.title}</strong>
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
