import { Link } from 'react-router-dom';
import { useSession } from '../auth/SessionContext.jsx';

const wrap = { minHeight: '100vh', background: 'var(--bg, #060912)', color: 'var(--text, #f6f8ff)' };

const FEATURES = [
  ['1', 'Upload', 'Bring in a full song, or a vocal and beat. WAV, MP3, FLAC and more.', 'var(--cyan-soft)', 'var(--cyan)'],
  ['2', 'Analyse', 'Real measurements from your audio: loudness (LUFS), true peak, dynamics, noise floor and spectral balance.', 'var(--violet-soft)', 'var(--violet)'],
  ['3', 'Clean & shape', 'Noise reduction, corrective EQ, compression and genre styling applied with a real FFmpeg processing chain.', 'var(--green-soft)', 'var(--green)'],
  ['4', 'Master & export', 'Loudness-targeted mastering with true-peak limiting, then download WAV and MP3 versions.', 'var(--amber-soft)', 'var(--amber)'],
];

export default function Landing() {
  const { profile } = useSession();
  return (
    <div style={wrap}>
      <nav className="landing-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px', borderBottom: '1px solid var(--line, rgba(255,255,255,.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" />
          <b style={{ fontSize: 18 }}>Infinity AI</b>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/docs" className="btn ghost" style={{ padding: '8px 16px' }}>Documentation</Link>
          {profile
            ? <Link to="/app" className="btn primary" style={{ padding: '8px 16px' }}>Open studio</Link>
            : <Link to="/login" className="btn primary" style={{ padding: '8px 16px' }}>Sign in</Link>}
        </div>
      </nav>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px' }}>
        <section style={{ textAlign: 'center', marginBottom: 64 }}>
          <span className="pill">Private beta</span>
          <h1 style={{ fontSize: 'clamp(40px,7vw,72px)', lineHeight: 1.02, margin: '20px 0 16px' }}>
            Turn a recording into a <span style={{ color: 'var(--cyan, #54e8ff)' }}>release-ready record.</span>
          </h1>
          <p className="lead" style={{ maxWidth: 640, margin: '0 auto 28px', color: 'var(--muted, #8d99ae)' }}>
            Upload your song, measure what actually needs fixing, process it with a professional
            signal chain, master to a loudness target, and export the result — all in one project workspace.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={profile ? '/app' : '/login'} className="btn primary" style={{ padding: '12px 28px', fontSize: 16 }}>
              {profile ? 'Open your studio' : 'Start a private session'}
            </Link>
            <Link to="/docs" className="btn ghost" style={{ padding: '12px 28px', fontSize: 16 }}>Read the docs</Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {FEATURES.map(([num, title, desc, bg, color]) => (
            <div key={num} className="panel" style={{ padding: 22, borderRadius: 18, background: 'var(--panel, #0e1524)', border: '1px solid var(--line, rgba(255,255,255,.08))' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', fontWeight: 800, background: bg, color, marginBottom: 12 }}>{num}</div>
              <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
              <p style={{ color: 'var(--muted, #8d99ae)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 56, padding: 24, borderRadius: 18, background: 'var(--panel, #0e1524)', border: '1px solid var(--line, rgba(255,255,255,.08))' }}>
          <h2 style={{ marginTop: 0 }}>What this is — and what it is not</h2>
          <p style={{ color: 'var(--muted, #8d99ae)', lineHeight: 1.7 }}>
            Infinity AI runs a real audio-processing backend: loudness measurement, dynamics analysis,
            noise reduction, EQ, compression and true-peak limited mastering. Some features are
            experimental and labelled as such in the app — we never present simulated numbers as
            measurements of your track. This is a private beta: expect rough edges, and tell us when
            you find them.
          </p>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--line, rgba(255,255,255,.08))', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, color: 'var(--muted, #8d99ae)', fontSize: 13 }}>
        <span>© {new Date().getFullYear()} Infinity AI — private beta</span>
        <span style={{ display: 'flex', gap: 16 }}>
          <Link to="/docs" style={{ color: 'inherit' }}>Documentation</Link>
        </span>
      </footer>
    </div>
  );
}
