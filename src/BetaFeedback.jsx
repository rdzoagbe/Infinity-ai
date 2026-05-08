import { useMemo, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

const STORAGE_KEY = 'infinity_artist_beta_feedback_v1';

function loadFeedback() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFeedback(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

export default function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(loadFeedback);
  const [form, setForm] = useState({
    testerName: '',
    role: 'Artist',
    rating: '4',
    mostUseful: 'Mix & Master',
    missing: '',
    confusing: '',
    comments: '',
  });

  const completedCount = useMemo(() => items.length, [items]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const entry = {
      id: `feedback_${Date.now()}`,
      ...form,
      submittedAt: new Date().toISOString(),
      page: window.location.href,
    };
    const next = [entry, ...items];
    setItems(next);
    saveFeedback(next);
    setForm({ testerName: '', role: 'Artist', rating: '4', mostUseful: 'Mix & Master', missing: '', confusing: '', comments: '' });
  };

  const exportFeedback = () => downloadJson('infinity-artist-beta-feedback.json', { exportedAt: new Date().toISOString(), items });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 18,
          top: 18,
          zIndex: 9995,
          border: '1px solid rgba(85,233,255,.35)',
          background: 'linear-gradient(135deg,rgba(85,233,255,.18),rgba(255,77,225,.12))',
          color: '#f5f8ff',
          borderRadius: 999,
          padding: '11px 14px',
          display: 'inline-flex',
          gap: 8,
          alignItems: 'center',
          fontWeight: 900,
          boxShadow: '0 16px 60px rgba(0,0,0,.35),0 0 26px rgba(85,233,255,.16)',
        }}
      >
        <MessageSquare size={17} /> Beta feedback {completedCount ? `(${completedCount})` : ''}
      </button>

      {open ? (
        <div data-infinity-auth="true" style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,.68)', padding: 18, overflowY: 'auto' }}>
          <form
            onSubmit={submit}
            style={{
              maxWidth: 760,
              margin: '36px auto',
              borderRadius: 28,
              padding: 24,
              color: '#f5f8ff',
              background: 'rgba(17,20,33,.97)',
              border: '1px solid rgba(255,255,255,.08)',
              boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 42px rgba(85,233,255,.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow">Artist beta</p>
                <h2 style={{ margin: '6px 0 8px' }}>Feedback for Infinity</h2>
                <p className="muted" style={{ lineHeight: 1.6 }}>Use this while musicians test the prototype. Feedback is stored locally in this browser and can be exported as JSON.</p>
              </div>
              <button type="button" className="secondary" onClick={() => setOpen(false)} style={{ width: 42, height: 42, padding: 0 }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
                <label className="auth-field">Tester name<input value={form.testerName} onChange={(event) => update('testerName', event.target.value)} placeholder="Artist / producer name" /></label>
                <label className="auth-field">Role<select value={form.role} onChange={(event) => update('role', event.target.value)}><option>Artist</option><option>Producer</option><option>Sound Engineer</option><option>Manager</option><option>Other</option></select></label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
                <label className="auth-field">Overall rating<select value={form.rating} onChange={(event) => update('rating', event.target.value)}><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
                <label className="auth-field">Most useful feature<select value={form.mostUseful} onChange={(event) => update('mostUseful', event.target.value)}><option>Mix & Master</option><option>Stem separation</option><option>AI DAW</option><option>AI Sound Generator</option><option>Dashboard/projects</option><option>Export workflow</option></select></label>
              </div>

              <label className="auth-field">What feels missing?<textarea rows={3} value={form.missing} onChange={(event) => update('missing', event.target.value)} placeholder="Feature, workflow, sound need, UI issue..." /></label>
              <label className="auth-field">What was confusing?<textarea rows={3} value={form.confusing} onChange={(event) => update('confusing', event.target.value)} placeholder="Navigation, labels, upload flow, expected result..." /></label>
              <label className="auth-field">General comments<textarea rows={4} value={form.comments} onChange={(event) => update('comments', event.target.value)} placeholder="Would you use it? What would make you pay?" /></label>

              <div className="actions">
                <button className="primary" type="submit"><Send size={16} /> Save feedback</button>
                <button className="secondary" type="button" onClick={exportFeedback} disabled={!items.length}>Export feedback JSON</button>
              </div>

              {items.length ? (
                <div className="card" style={{ boxShadow: 'none' }}>
                  <h3>Saved feedback</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {items.slice(0, 4).map((item) => (
                      <div key={item.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 12, background: 'rgba(255,255,255,.04)' }}>
                        <strong>{item.testerName || 'Anonymous'} - {item.role} - {item.rating}/5</strong>
                        <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{item.comments || item.missing || 'No comment text.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
