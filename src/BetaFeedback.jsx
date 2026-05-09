import { useMemo, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

const FEEDBACK_KEY = 'infinity_artist_beta_feedback_v2';
const CHECKLIST_KEY = 'infinity_artist_beta_checklist_v2';

const TEST_LINK = 'https://rdzoagbe.github.io/Infinity-ai/?v=artist-test';

const CHECKLIST = [
  { id: 'open-public-link', label: 'Open the public Infinity link', area: 'Access' },
  { id: 'cloud-auth', label: 'Create account or sign in with cloud mode', area: 'Account' },
  { id: 'password-tools', label: 'Test password show/hide and suggestion buttons', area: 'Account' },
  { id: 'create-project', label: 'Create a private music project', area: 'Dashboard' },
  { id: 'refresh-project', label: 'Refresh and confirm the project is still saved', area: 'Dashboard' },
  { id: 'open-studio', label: 'Open the project studio', area: 'Studio' },
  { id: 'navigate-pages', label: 'Click through Overview, Mix, DAW, Generator, Export, Architecture', area: 'Navigation' },
  { id: 'upload-audio', label: 'Upload a small MP3/WAV and confirm backend connection', area: 'Audio' },
  { id: 'analysis-result', label: 'Confirm file_id and analysis results appear', area: 'Audio' },
  { id: 'run-mix', label: 'Run Mix', area: 'Audio' },
  { id: 'run-master', label: 'Run Master', area: 'Audio' },
  { id: 'run-export', label: 'Create Export Package', area: 'Export' },
  { id: 'button-pass', label: 'Click every visible button once and note anything dead/confusing', area: 'QA' },
  { id: 'feedback-submit', label: 'Submit feedback using this beta form', area: 'Feedback' },
];

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function completionPercent(doneMap) {
  const done = CHECKLIST.filter((item) => doneMap[item.id]).length;
  return Math.round((done / CHECKLIST.length) * 100);
}

export default function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('checklist');
  const [items, setItems] = useState(() => loadJson(FEEDBACK_KEY, []));
  const [doneMap, setDoneMap] = useState(() => loadJson(CHECKLIST_KEY, {}));
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    testerName: '',
    role: 'Artist',
    rating: '4',
    mostUseful: 'Mix & Master',
    missing: '',
    confusing: '',
    brokenButtons: '',
    paymentReadiness: 'Not sure yet',
    comments: '',
  });

  const completedCount = useMemo(() => items.length, [items]);
  const percent = useMemo(() => completionPercent(doneMap), [doneMap]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleCheck = (id) => {
    const next = { ...doneMap, [id]: !doneMap[id] };
    setDoneMap(next);
    saveJson(CHECKLIST_KEY, next);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(TEST_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const entry = {
      id: `feedback_${Date.now()}`,
      ...form,
      checklistCompletion: percent,
      checkedItems: CHECKLIST.filter((item) => doneMap[item.id]).map((item) => item.label),
      submittedAt: new Date().toISOString(),
      page: window.location.href,
      userAgent: navigator.userAgent,
    };
    const next = [entry, ...items];
    setItems(next);
    saveJson(FEEDBACK_KEY, next);
    setForm({ testerName: '', role: 'Artist', rating: '4', mostUseful: 'Mix & Master', missing: '', confusing: '', brokenButtons: '', paymentReadiness: 'Not sure yet', comments: '' });
    setActiveTab('saved');
  };

  const exportBetaReport = () => downloadJson('infinity-artist-beta-report.json', {
    exportedAt: new Date().toISOString(),
    publicTestLink: TEST_LINK,
    checklistCompletion: percent,
    checklist: CHECKLIST.map((item) => ({ ...item, completed: Boolean(doneMap[item.id]) })),
    feedback: items,
  });

  const resetChecklist = () => {
    setDoneMap({});
    saveJson(CHECKLIST_KEY, {});
  };

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
        <MessageSquare size={17} /> Artist beta {percent}% {completedCount ? `(${completedCount})` : ''}
      </button>

      {open ? (
        <div data-infinity-auth="true" style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,.68)', padding: 18, overflowY: 'auto' }}>
          <div
            style={{
              maxWidth: 920,
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
                <p className="eyebrow">Artist beta test kit</p>
                <h2 style={{ margin: '6px 0 8px' }}>Validate Infinity before sharing wider</h2>
                <p className="muted" style={{ lineHeight: 1.6 }}>Use this checklist while testing with musicians. Feedback is saved locally in the browser and can be exported as JSON.</p>
              </div>
              <button type="button" className="secondary" onClick={() => setOpen(false)} style={{ width: 42, height: 42, padding: 0 }}><X size={18} /></button>
            </div>

            <div className="card" style={{ boxShadow: 'none', marginTop: 16 }}>
              <p className="eyebrow">Public test link</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <code style={{ color: '#dffaff', wordBreak: 'break-all' }}>{TEST_LINK}</code>
                <button type="button" className="secondary" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
                <button type="button" className="primary" onClick={() => window.open(TEST_LINK, '_blank', 'noopener,noreferrer')}>Open test link</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <button type="button" className={activeTab === 'checklist' ? 'primary' : 'secondary'} onClick={() => setActiveTab('checklist')}>Checklist {percent}%</button>
              <button type="button" className={activeTab === 'feedback' ? 'primary' : 'secondary'} onClick={() => setActiveTab('feedback')}>Feedback form</button>
              <button type="button" className={activeTab === 'saved' ? 'primary' : 'secondary'} onClick={() => setActiveTab('saved')}>Saved feedback {items.length}</button>
              <button type="button" className="secondary" onClick={exportBetaReport}>Export beta report</button>
            </div>

            {activeTab === 'checklist' ? (
              <section style={{ marginTop: 18 }}>
                <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg,#55e9ff,#ff4de1)' }} />
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {CHECKLIST.map((item) => (
                    <label key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: 12, borderRadius: 16, background: doneMap[item.id] ? 'rgba(85,233,255,.1)' : 'rgba(255,255,255,.04)', border: doneMap[item.id] ? '1px solid rgba(85,233,255,.28)' : '1px solid rgba(255,255,255,.08)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={Boolean(doneMap[item.id])} onChange={() => toggleCheck(item.id)} />
                      <span>{item.label}</span>
                      <span className="pill">{item.area}</span>
                    </label>
                  ))}
                </div>
                <div className="actions" style={{ marginTop: 14 }}>
                  <button type="button" className="secondary" onClick={resetChecklist}>Reset checklist</button>
                  <button type="button" className="primary" onClick={() => setActiveTab('feedback')}>Continue to feedback</button>
                </div>
              </section>
            ) : null}

            {activeTab === 'feedback' ? (
              <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
                  <label className="auth-field">Tester name<input value={form.testerName} onChange={(event) => update('testerName', event.target.value)} placeholder="Artist / producer name" /></label>
                  <label className="auth-field">Role<select value={form.role} onChange={(event) => update('role', event.target.value)}><option>Artist</option><option>Producer</option><option>Sound Engineer</option><option>Manager</option><option>Other</option></select></label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="auth-two">
                  <label className="auth-field">Overall rating<select value={form.rating} onChange={(event) => update('rating', event.target.value)}><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
                  <label className="auth-field">Most useful feature<select value={form.mostUseful} onChange={(event) => update('mostUseful', event.target.value)}><option>Mix & Master</option><option>Stem separation</option><option>AI DAW</option><option>AI Sound Generator</option><option>Dashboard/projects</option><option>Export workflow</option></select></label>
                </div>

                <label className="auth-field">Would this be worth paying for?<select value={form.paymentReadiness} onChange={(event) => update('paymentReadiness', event.target.value)}><option>Yes, if audio quality is strong</option><option>Yes, even as a workflow assistant</option><option>Maybe after more features</option><option>Not sure yet</option><option>No</option></select></label>
                <label className="auth-field">What feels missing?<textarea rows={3} value={form.missing} onChange={(event) => update('missing', event.target.value)} placeholder="Feature, workflow, sound need, UI issue..." /></label>
                <label className="auth-field">What was confusing?<textarea rows={3} value={form.confusing} onChange={(event) => update('confusing', event.target.value)} placeholder="Navigation, labels, upload flow, expected result..." /></label>
                <label className="auth-field">Any button that did not do the right thing?<textarea rows={3} value={form.brokenButtons} onChange={(event) => update('brokenButtons', event.target.value)} placeholder="Button/page name and what happened..." /></label>
                <label className="auth-field">General comments<textarea rows={4} value={form.comments} onChange={(event) => update('comments', event.target.value)} placeholder="Would you use it? What would make it feel professional?" /></label>

                <div className="actions">
                  <button className="primary" type="submit"><Send size={16} /> Save feedback</button>
                  <button className="secondary" type="button" onClick={exportBetaReport} disabled={!items.length}>Export beta report</button>
                </div>
              </form>
            ) : null}

            {activeTab === 'saved' ? (
              <section style={{ marginTop: 18 }}>
                {items.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {items.map((item) => (
                      <div key={item.id} className="card" style={{ boxShadow: 'none' }}>
                        <strong>{item.testerName || 'Anonymous'} - {item.role} - {item.rating}/5</strong>
                        <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{item.comments || item.missing || 'No comment text.'}</p>
                        <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>Checklist: {item.checklistCompletion}% - Feature: {item.mostUseful} - Payment: {item.paymentReadiness}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card" style={{ boxShadow: 'none', textAlign: 'center' }}>
                    <h3>No feedback saved yet</h3>
                    <p className="muted">Complete the checklist and submit the feedback form after testing.</p>
                    <button type="button" className="primary" onClick={() => setActiveTab('feedback')}>Open feedback form</button>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
