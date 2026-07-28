import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Eye, EyeOff, Library, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { isSupabaseConfigured, signInWithEmail, signUpWithEmail } from '../api/supabaseClient.js';
import { makeId, profileFromSupabaseUser, useSession } from '../auth/SessionContext.jsx';

const shell = { minHeight: '100vh', color: '#f5f8ff', background: 'radial-gradient(circle at top left,rgba(0,212,255,.14),transparent 30%),radial-gradient(circle at top right,rgba(255,77,225,.13),transparent 25%),#090b14', padding: 18 };
const panel = { background: 'rgba(17,20,33,.84)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.09)', borderRadius: 28 };

function generatePasswordSuggestion() {
  const words = ['Sonic', 'Velvet', 'Nova', 'Echo', 'Studio', 'Rhythm', 'Orbit', 'Pulse', 'Wave', 'Neon'];
  return `${words[Math.floor(Math.random() * words.length)]}${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}!`;
}

function PasswordInput({ value, onChange, disabled }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-field">Password
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} type={visible ? 'text' : 'password'} placeholder="Minimum 6 characters" disabled={disabled} autoComplete="current-password" style={{ minWidth: 0 }} />
        <button type="button" className="secondary" onClick={() => setVisible((c) => !c)} disabled={disabled} title={visible ? 'Hide password' : 'Show password'} style={{ padding: '12px 14px' }}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        <button type="button" className="secondary" onClick={() => onChange(generatePasswordSuggestion())} disabled={disabled} title="Generate password suggestion" style={{ padding: '12px 14px' }}><RefreshCw size={16} /></button>
      </div>
      <small className="muted">Use the eye to show/hide. Use the refresh button to generate a strong suggestion.</small>
    </label>
  );
}

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState(isSupabaseConfigured ? 'cloud-signin' : 'local');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'Artist', language: 'English' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => { setError(''); setInfo(''); setForm((c) => ({ ...c, [key]: value })); };

  const finish = (profile) => { login(profile); navigate('/app', { replace: true }); };

  const startLocalSession = () => {
    const email = form.email.trim(); const name = form.name.trim();
    if (!email && !name) { setError('Add at least an email or artist name to start a private session.'); return; }
    finish({ id: makeId('user'), email: email || 'creator@infinity.local', name: name || email.split('@')[0] || 'Infinity Creator', role: form.role, language: form.language, signedInAt: new Date().toISOString(), authMode: 'local-private-mvp' });
  };
  const useDemo = () => {
    finish({ id: makeId('user'), email: 'demo@infinity.local', name: 'Demo Artist', role: 'Artist', language: 'English', signedInAt: new Date().toISOString(), authMode: 'demo-local-private-mvp' });
  };
  const submitCloud = async () => {
    if (!isSupabaseConfigured) { setError('Supabase is not configured. Add the Supabase environment variables.'); return; }
    if (!form.email.trim() || !form.password) { setError('Email and password are required for cloud login.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      const payload = mode === 'cloud-signup'
        ? await signUpWithEmail(form.email.trim(), form.password, { name: form.name || form.email.split('@')[0], role: form.role, language: form.language })
        : await signInWithEmail(form.email.trim(), form.password);
      const user = payload?.user || payload?.session?.user;
      const session = payload?.session;
      if (!session && mode === 'cloud-signup') { setInfo('Account created. If email confirmation is enabled in Supabase, confirm your email, then sign in.'); return; }
      if (!user) throw new Error('Supabase did not return a user session.');
      finish(profileFromSupabaseUser(user));
    } catch (err) {
      const msg = err.message || '';
      const isNetworkError = ['failed to fetch', 'networkerror', 'err_name_not_resolved', 'load failed'].some((s) => msg.toLowerCase().includes(s));
      setError(isNetworkError ? 'Cannot reach Supabase — your project may be paused. Visit supabase.com/dashboard to restore it, or use Local fallback below.' : (msg || 'Cloud authentication failed.'));
    } finally { setBusy(false); }
  };

  return (
    <main style={shell}>
      <div className="auth-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, alignItems: 'stretch' }}>
        <section style={{ ...panel, padding: 28, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: 999, background: 'rgba(85,233,255,.18)', filter: 'blur(28px)', top: 30, left: 40 }} />
          <div style={{ position: 'relative' }}>
            <span className="pill">Infinity private studio</span>
            <h1 style={{ fontSize: 'clamp(42px,7vw,76px)', lineHeight: .96, margin: '18px 0 16px', maxWidth: 720 }}>Start a private AI music session.</h1>
            <p className="lead">Upload a track, get real measurements, process it with a professional chain, and export the result.</p>
            <div className="mini-grid" style={{ marginTop: 24 }}>
              <div className="card" style={{ boxShadow: 'none' }}><Cloud size={18} color="#55e9ff" /><h3>Cloud projects</h3><p className="muted">Supabase user-owned project storage.</p></div>
              <div className="card" style={{ boxShadow: 'none' }}><Library size={18} color="#55e9ff" /><h3>Project library</h3><p className="muted">Files, masters and exports saved per project.</p></div>
              <div className="card" style={{ boxShadow: 'none' }}><Sparkles size={18} color="#55e9ff" /><h3>Real processing</h3><p className="muted">FFmpeg-based analysis and mastering jobs.</p></div>
            </div>
          </div>
        </section>
        <section style={{ ...panel, padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <button type="button" className={mode === 'cloud-signin' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signin')} disabled={!isSupabaseConfigured}>Cloud sign in</button>
            <button type="button" className={mode === 'cloud-signup' ? 'primary' : 'secondary'} onClick={() => setMode('cloud-signup')} disabled={!isSupabaseConfigured}>Cloud sign up</button>
            <button type="button" className={mode === 'local' ? 'primary' : 'secondary'} onClick={() => setMode('local')}>Local fallback</button>
          </div>
          <p className="eyebrow">{isSupabaseConfigured ? 'Supabase configured' : 'Supabase not configured locally'}</p>
          <h2 style={{ margin: '6px 0 8px' }}>{mode === 'local' ? 'Create local session' : 'Access your cloud studio'}</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>{mode === 'local' ? 'Local mode stores projects in this browser only.' : 'Cloud mode stores projects in Supabase with private Row Level Security.'}</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            <label className="auth-field">Email<input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" placeholder="artist@email.com" autoComplete="email" /></label>
            {mode !== 'local' ? <PasswordInput value={form.password} onChange={(v) => update('password', v)} disabled={busy} /> : null}
            <label className="auth-field">Artist / producer name<input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your artist or producer name" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
              <label className="auth-field">Role<select value={form.role} onChange={(e) => update('role', e.target.value)}><option>Artist</option><option>Producer</option><option>Sound Engineer</option><option>Manager</option></select></label>
              <label className="auth-field">Language<select value={form.language} onChange={(e) => update('language', e.target.value)}><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option></select></label>
            </div>
            {error ? <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 16, padding: 12 }}>{error}</div> : null}
            {info ? <div style={{ border: '1px solid rgba(85,233,255,.35)', background: 'rgba(85,233,255,.1)', color: '#dffaff', borderRadius: 16, padding: 12 }}>{info}</div> : null}
            {mode === 'local' ? (
              <>
                <button type="button" className="primary" onClick={startLocalSession}><ShieldCheck size={17} /> Start local dashboard</button>
                <button type="button" className="secondary" onClick={useDemo}>Use demo artist account</button>
              </>
            ) : (
              <button type="button" className="primary" onClick={submitCloud} disabled={busy}>{busy ? 'Please wait...' : mode === 'cloud-signup' ? 'Create cloud account' : 'Sign in to cloud dashboard'}</button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
