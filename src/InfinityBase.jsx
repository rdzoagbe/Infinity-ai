import { useEffect, useRef, useState } from 'react';

// ── Waveform bar generator ──────────────────────────────────────
function fillBars(selector, count, min, max, useSpan) {
  document.querySelectorAll(selector).forEach((el, idx) => {
    if (el.children.length) return;
    for (let i = 0; i < count; i++) {
      const node = document.createElement(useSpan ? 'span' : 'i');
      const v = min + Math.abs(
        Math.sin((i + 1) * (0.36 + idx * 0.03)) + Math.cos(i * 0.17 + idx)
      ) * (max - min) / 2;
      node.style.height = Math.min(max, v) + '%';
      el.appendChild(node);
    }
  });
}

function regenerateBars() {
  document.querySelectorAll('.generated-wave, .generated-track, .generated-meter, .generated-spectrum')
    .forEach(el => { while (el.firstChild) el.removeChild(el.firstChild); });
  fillBars('.generated-wave', 72, 18, 96, true);
  fillBars('.generated-track', 90, 12, 88, false);
  fillBars('.generated-meter', 12, 18, 96, false);
  fillBars('.generated-spectrum', 64, 10, 98, false);
}

// ── Toast hook ──────────────────────────────────────────────────
function useToast() {
  const [state, setState] = useState({ msg: '', show: false });
  const timer = useRef(null);
  const toast = (msg) => {
    setState({ msg, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(s => ({ ...s, show: false })), 1800);
  };
  return [state, toast];
}

// ── SVG Nav Icons ───────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="2"/>
      <rect x="14" y="3" width="7" height="7" rx="2"/>
      <rect x="3" y="14" width="7" height="7" rx="2"/>
      <rect x="14" y="14" width="7" height="7" rx="2"/>
    </svg>
  );
}
function IconProjects() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h5l2 2h11v10H3z"/><path d="M3 7V5h7l2 2"/>
    </svg>
  );
}
function IconStudio() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 18V6"/><path d="M9 21V3"/><path d="M14 16V8"/><path d="M19 20V4"/>
    </svg>
  );
}
function IconMusic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>
    </svg>
  );
}
function IconMasters() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v18"/><path d="M5 8h14"/><path d="M7 16h10"/>
    </svg>
  );
}
function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/>
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05-2.12 2.12-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V20.5h-3v-.09a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.05.05-2.12-2.12.05-.05a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 5 13.9H4.5v-3H5a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.05-.05 2.12-2.12.05.05a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 11.5 4.4V4.3h3v.1a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.05-.05 2.12 2.12-.05.05a1.8 1.8 0 0 0-.36 2A1.8 1.8 0 0 0 21 10.9h.5v3H21A1.8 1.8 0 0 0 19.4 15z"/>
    </svg>
  );
}

const NAV_ICONS = {
  dashboard: <IconDashboard />,
  projects: <IconProjects />,
  studio: <IconStudio />,
  soundlab: <IconMusic />,
  masters: <IconMasters />,
  library: <IconLibrary />,
  landing: <IconGlobe />,
  settings: <IconSettings />,
};

// ── View: Dashboard ─────────────────────────────────────────────
function DashboardView({ setView, openStudio }) {
  return (
    <div className="view">
      <div className="panel hero">
        <div className="hero-copy">
          <div className="eyebrow">Infinity AI engineer</div>
          <h2>Turn a recording into a <span>release-ready record.</span></h2>
          <p>Upload your song, let Infinity identify tonal and dynamic problems, shape every stem with a professional signal chain, master for your target, and export every version required for release.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={openStudio}>Open Studio</button>
            <button className="btn violet" data-infinity-local-action="true" onClick={() => setView('landing')}>View public website</button>
            <button className="btn" data-infinity-local-action="true" onClick={() => setView('studio')}>Watch product tour</button>
          </div>
        </div>
        <div className="hero-card">
          <div className="master-visual">
            <div className="score-row">
              <div><span>Commercial readiness</span><strong>92%</strong></div>
              <span className="tag green">Release-ready</span>
            </div>
            <div className="wave generated-wave" />
            <div className="stats">
              <div className="stat"><small>LUFS</small><strong>-10.4</strong><em>Target met</em></div>
              <div className="stat"><small>True Peak</small><strong>-1.0</strong><em>Safe</em></div>
              <div className="stat"><small>Dynamic</small><strong>8.2</strong><em>Musical</em></div>
              <div className="stat"><small>Stereo</small><strong>78%</strong><em>Stable</em></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">
        <div><h2>Production overview</h2><p>Everything that needs your attention today.</p></div>
        <button className="btn small" data-infinity-local-action="true" onClick={() => setView('projects')}>View all projects</button>
      </div>

      <div className="grid four">
        <div className="stat panel flat"><small>Active projects</small><strong>7</strong><em>2 ready to master</em></div>
        <div className="stat panel flat"><small>Processing jobs</small><strong>3</strong><em>1 rendering now</em></div>
        <div className="stat panel flat"><small>Completed masters</small><strong>24</strong><em>+4 this month</em></div>
        <div className="stat panel flat"><small>Storage used</small><strong>18.6 GB</strong><em>30 GB included</em></div>
      </div>

      <div className="section-title">
        <div><h2>Recent projects</h2><p>Continue where you stopped.</p></div>
      </div>

      <div className="grid three">
        <div className="panel project-card">
          <div className="project-top">
            <div className="project-file">
              <div className="project-icon">♫</div>
              <div><h3>Midnight Prayer</h3><p>Full song · Afrobeats / Gospel</p></div>
            </div>
            <span className="tag green">Mastered</span>
          </div>
          <div className="project-meta">
            <div><span>Last action</span><strong>Master v3</strong></div>
            <div><span>Readiness</span><strong>94%</strong></div>
            <div><span>Updated</span><strong>Today</strong></div>
          </div>
          <button className="btn small" style={{ marginTop: 14, width: '100%' }} onClick={openStudio}>Open project</button>
        </div>
        <div className="panel project-card">
          <div className="project-top">
            <div className="project-file">
              <div className="project-icon" style={{ background: 'var(--violet-soft)', color: 'var(--violet)' }}>♫</div>
              <div><h3>Ashes Rise</h3><p>Vocal + beat · Hip-hop</p></div>
            </div>
            <span className="tag violet">Mixing</span>
          </div>
          <div className="project-meta">
            <div><span>Last action</span><strong>Vocal chain</strong></div>
            <div><span>Readiness</span><strong>78%</strong></div>
            <div><span>Updated</span><strong>Yesterday</strong></div>
          </div>
          <button className="btn small" style={{ marginTop: 14, width: '100%' }} onClick={openStudio}>Continue mix</button>
        </div>
        <div className="panel project-card">
          <div className="project-top">
            <div className="project-file">
              <div className="project-icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>♫</div>
              <div><h3>Ocean Memory</h3><p>Instrumental · Cinematic</p></div>
            </div>
            <span className="tag amber">Needs review</span>
          </div>
          <div className="project-meta">
            <div><span>Last action</span><strong>AI analysis</strong></div>
            <div><span>Readiness</span><strong>66%</strong></div>
            <div><span>Updated</span><strong>3 days</strong></div>
          </div>
          <button className="btn small" style={{ marginTop: 14, width: '100%' }} onClick={openStudio}>Review issues</button>
        </div>
      </div>
    </div>
  );
}

// ── View: Projects ──────────────────────────────────────────────
function ProjectsView({ openStudio }) {
  const projects = [
    { name: 'Midnight Prayer', sub: '14 files · 6 versions', genre: 'Afrobeats', target: 'Streaming', updated: 'Today', status: 'green', label: 'Mastered' },
    { name: 'Ashes Rise', sub: '9 files · 3 versions', genre: 'Hip-hop', target: 'Loud', updated: 'Yesterday', status: 'violet', label: 'Mixing' },
    { name: 'Ocean Memory', sub: '7 files · 2 versions', genre: 'Cinematic', target: 'Dynamic', updated: '3 days', status: 'amber', label: 'Analyse' },
    { name: 'Family Grace', sub: '18 files · 8 versions', genre: 'Gospel', target: 'Apple Music', updated: 'Last week', status: 'green', label: 'Mastered' },
    { name: 'Blue Room', sub: '11 files · 4 versions', genre: 'R&B', target: 'Balanced', updated: '2 weeks', status: 'violet', label: 'Mastering' },
    { name: 'Black Phoenix', sub: '5 files · 1 version', genre: 'Trap', target: 'Club', updated: '2 weeks', status: 'amber', label: 'Draft' },
  ];
  return (
    <div className="view">
      <div className="section-title" style={{ marginTop: 0 }}>
        <div>
          <div className="eyebrow">Project library</div>
          <h2>All music projects</h2>
          <p>Recordings, stems, mixes, masters and export packages remain together.</p>
        </div>
        <button className="btn primary" onClick={openStudio}>＋ Create project</button>
      </div>
      <div className="grid three">
        {projects.map((p) => (
          <div key={p.name} className="panel project-card">
            <div className="project-top">
              <div className="project-file">
                <div className="project-icon">♫</div>
                <div><h3>{p.name}</h3><p>{p.sub}</p></div>
              </div>
              <span className={`tag ${p.status}`}>{p.label}</span>
            </div>
            <div className="project-meta">
              <div><span>Genre</span><strong>{p.genre}</strong></div>
              <div><span>Target</span><strong>{p.target}</strong></div>
              <div><span>Updated</span><strong>{p.updated}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Master profiles selector ─────────────────────────────────────
function MasterProfiles() {
  const [active, setActive] = useState('Balanced');
  return (
    <div className="profile-grid">
      {[['Dynamic','Maximum movement'],['Balanced','Modern and musical'],['Loud','Upfront density'],['Club','Low-end impact'],['Streaming','Platform safe'],['Custom','Full manual control']].map(([n,s]) => (
        <button key={n} className={`profile-option${active === n ? ' active' : ''}`} data-infinity-local-action="true" onClick={() => setActive(n)}>
          <strong>{n}</strong><span>{s}</span>
        </button>
      ))}
    </div>
  );
}

// ── Export options selector ─────────────────────────────────────
function ExportOptions() {
  const [active, setActive] = useState('WAV Master');
  return (
    <div className="grid three">
      {[['WAV Master','24-bit · 48 kHz'],['Streaming WAV','-14 LUFS · -1 dBTP'],['MP3 Preview','320 kbps'],['Instrumental','Mixed and mastered'],['Acapella','Processed vocal'],['QC Report','PDF / JSON']].map(([n,s]) => (
        <button key={n} className={`profile-option${active === n ? ' active' : ''}`} data-infinity-local-action="true" onClick={() => setActive(n)}>
          <strong>{n}</strong><span>{s}</span>
        </button>
      ))}
    </div>
  );
}

// ── View: Studio ────────────────────────────────────────────────
function StudioView({ step, setStep, mixMode, setMixMode, toast, openStudio }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');

  const STEPS = [
    { id: 'import', label: 'Import', num: 1 },
    { id: 'analysis', label: 'Analyse', num: 2 },
    { id: 'mix', label: 'Mix', num: 3 },
    { id: 'master', label: 'Master', num: 4 },
    { id: 'compare', label: 'Compare', num: 5 },
    { id: 'export', label: 'Export', num: 6 },
  ];
  const stepIdx = STEPS.findIndex(s => s.id === step);

  const onFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    toast(`${file.name} loaded — opening Infinity Studio.`);
    setTimeout(openStudio, 400);
  };

  return (
    <div className="view">
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="workflow">
          {STEPS.map((s, i) => (
            <button key={s.id} data-infinity-local-action="true"
              className={`step${step === s.id ? ' active' : ''}${i < stepIdx ? ' done' : ''}`}
              onClick={() => setStep(s.id)}>
              <span>{s.num}</span>{s.label}
            </button>
          ))}
        </div>

        <div className="studio-shell">
          <div className="studio-main">

            {step === 'import' && (
              <div>
                <div className="panel-head">
                  <div><div className="eyebrow">Stage 1</div><h2>Import audio</h2><p>Start with a full mix, separate vocal and beat, or multitrack stems.</p></div>
                  <span className="tag green">Engine online</span>
                </div>
                <div className="panel-pad">
                  <div className="dropzone"
                    onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileRef.current?.click()}>
                    <div>
                      <div className="drop-icon" style={fileName ? { color: 'var(--green)', background: 'var(--green-soft)' } : {}}>
                        {fileName ? '✓' : '⇧'}
                      </div>
                      {fileName
                        ? <><h3>{fileName}</h3><p>File loaded. Infinity Studio will open to begin processing.</p></>
                        : <><h3>Drop your audio here</h3><p>Infinity will inspect sample rate, bit depth, channels, clipping, loudness and structural information before processing begins.</p></>}
                      <button className="btn primary" style={{ marginTop: 4 }} data-infinity-local-action="true"
                        onClick={e => { e.stopPropagation(); fileName ? openStudio() : fileRef.current?.click(); }}>
                        {fileName ? 'Open Infinity Studio' : 'Choose audio file'}
                      </button>
                      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => onFile(e.target.files?.[0])} />
                      {!fileName && (
                        <div className="file-types" style={{ marginTop: 14 }}>
                          {['WAV','AIFF','FLAC','MP3','M4A'].map(t => <span key={t} className="tag">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid three" style={{ marginTop: 14 }}>
                    {[['Full song','One stereo mix'],['Vocal + beat','Two separate files'],['Multitrack stems','Vocals, drums, bass and music']].map(([n,s],i) => (
                      <button key={n} className={`profile-option${i===0?' active':''}`} data-infinity-local-action="true"><strong>{n}</strong><span>{s}</span></button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 'analysis' && (
              <div>
                <div className="panel-head">
                  <div><div className="eyebrow">Stage 2</div><h2>AI engineering analysis</h2><p>Technical measurements, detected problems and editable recommendations.</p></div>
                  <button className="btn small" data-infinity-local-action="true" onClick={() => toast('Report download — available after running analysis.')}>Download report</button>
                </div>
                <div className="analysis-top">
                  <div>
                    <div className="spectrum generated-spectrum" />
                    <div className="metric-strip">
                      {[['BPM','104'],['Key','F# min'],['LUFS','-16.8'],['Peak','-0.4'],['Width','71%'],['LRA','8.2']].map(([l,v]) => (
                        <div key={l} className="metric"><span>{l}</span><strong>{v}</strong></div>
                      ))}
                    </div>
                  </div>
                  <div className="readiness">
                    <div><div className="eyebrow" style={{ color: 'var(--green)' }}>Commercial readiness</div><h3 style={{ margin: 0 }}>Close to release</h3></div>
                    <div><div className="gauge" /><div className="gauge-value"><strong>78%</strong><span>3 engineering issues found</span></div></div>
                    <button className="btn small" data-infinity-local-action="true" onClick={openStudio}>Apply all safe fixes</button>
                  </div>
                </div>
                <div className="issue-list">
                  {[
                    ['Upper-mid harshness','Persistent energy between 2.8 and 4.2 kHz. Apply a dynamic reduction of approximately 2.4 dB.','89% confidence',false],
                    ['Low-mid mud','Dense energy around 220–340 Hz is masking vocal clarity and bass definition.','84% confidence',false],
                    ['Unsafe true peak','Current peak reaches -0.4 dBTP. Infinity recommends a -1.0 dBTP final ceiling.','99% confidence',true],
                  ].map(([title, desc, conf, isRed]) => (
                    <div key={title} className="issue">
                      <div className="issue-icon" style={isRed ? { color: 'var(--red)', background: 'rgba(255,111,125,.12)' } : {}}>!</div>
                      <div><h4>{title}</h4><p>{desc}</p></div>
                      <div><div className="confidence">{conf}</div><button className="btn small" style={{ marginTop: 7 }} data-infinity-local-action="true" onClick={openStudio}>Accept</button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'mix' && (
              <div>
                <div className="panel-head">
                  <div><div className="eyebrow">Stage 3</div><h2>Mix workspace</h2><p>Balance separated stems and shape the lead vocal with Infinity's native modules.</p></div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className={`btn small${mixMode==='simple'?' active-mode':''}`} data-infinity-local-action="true" onClick={() => setMixMode('simple')}>Simple</button>
                    <button className={`btn small${mixMode==='advanced'?' active-mode':''}`} data-infinity-local-action="true" onClick={() => setMixMode('advanced')}>Advanced</button>
                  </div>
                </div>
                <div className="tracks">
                  {[
                    { n: 'Lead vocal', d: 'Processed · -4.2 dB', c: 'var(--cyan)', solo: true },
                    { n: 'Backing vocals', d: 'Wide · -8.1 dB', c: 'var(--violet)', fx: true },
                    { n: 'Drums', d: 'Punch · -3.0 dB', c: 'var(--green)' },
                    { n: 'Bass', d: 'Mono safe · -5.4 dB', c: 'var(--amber)', fx: true },
                    { n: 'Music', d: 'Stereo · -6.2 dB', c: '#ff7ac6' },
                  ].map(t => (
                    <div key={t.n} className="track">
                      <div className="track-info"><span className="track-color" style={{ background: t.c }} /><div><h4>{t.n}</h4><span>{t.d}</span></div></div>
                      <div className="track-wave generated-track" />
                      <div className="track-controls">
                        <button className={`mini-control${t.solo?' on':''}`} data-infinity-local-action="true">S</button>
                        <button className="mini-control" data-infinity-local-action="true">M</button>
                        <button className={`mini-control${t.fx?' on':''}`} data-infinity-local-action="true">FX</button>
                      </div>
                    </div>
                  ))}
                </div>
                {mixMode === 'simple' && (
                  <div className="macros">
                    {[['Clarity','68%','var(--cyan)'],['Warmth','52%','var(--amber)'],['Presence','64%','var(--green)'],['Air','38%','var(--violet)'],['Width','44%','var(--cyan)'],['Depth','41%','var(--violet)'],['Energy','60%','var(--green)'],['Punch','57%','var(--amber)']].map(([n,v,c]) => (
                      <div key={n} className="macro">
                        <div className="dial" style={{ borderTopColor: c, borderRightColor: c }} />
                        <strong>{n}</strong><small>{v}</small>
                      </div>
                    ))}
                  </div>
                )}
                {mixMode === 'advanced' && (
                  <div className="panel-pad">
                    <div className="grid three">
                      {[
                        ['Infinity Dynamic EQ','Corrective and dynamic filtering',false],
                        ['Infinity Opto','Programme-dependent compression',false],
                        ['Infinity Harmonics','Tape and tube saturation',false],
                        ['Infinity Air','Open high-frequency enhancement',false],
                        ['Infinity Echo','Tempo-synchronised delay',true],
                        ['Infinity Space','Plate, room and hall ambience',true],
                      ].map(([n,s,send]) => (
                        <div key={n} className="module">
                          <div className="module-head"><div><h4>{n}</h4><small>{s}</small></div><span className={`tag ${send?'violet':'green'}`}>{send?'Send':'On'}</span></div>
                          <div className="module-knobs">
                            {['Freq','Gain','Q'].map(k => <div key={k} className="knob"><div className="dial" /><span>{k}</span></div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'master' && (
              <div>
                <div className="panel-head">
                  <div><div className="eyebrow">Stage 4</div><h2>Mastering workspace</h2><p>Control tone, dynamics, width, loudness and final delivery safety.</p></div>
                  <span className="tag green">Automatic QC</span>
                </div>
                <div className="master-chain">
                  {[['01','Tonal Balance','Adaptive corrective EQ based on source and genre.'],['02','Glue Dynamics','Subtle compression that preserves transients.'],['03','Harmonics','Controlled warmth, density and soft clipping.'],['04','Stereo Field','Frequency-dependent width and mono-safe bass.'],['05','True-Peak Limiter','Transparent loudness with inter-sample protection.']].map(([n,name,d]) => (
                    <div key={n} className="master-module"><div><span className="num">{n}</span><h4>{name}</h4><p>{d}</p></div><div className="meter generated-meter" /></div>
                  ))}
                </div>
                <div className="panel-pad">
                  <div className="grid two">
                    <div className="panel flat panel-pad"><div className="eyebrow">Master profile</div><MasterProfiles /></div>
                    <div className="panel flat panel-pad">
                      <div className="eyebrow">Output targets</div>
                      {[['Target loudness','−10 LUFS',68],['True-peak ceiling','−1.0 dBTP',74],['Stereo width','76%',76],['Character','Warm / clean',44]].map(([l,v,d]) => (
                        <div key={l} className="range-row"><label><span>{l}</span><strong>{v}</strong></label><input type="range" min="0" max="100" defaultValue={d} /></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'compare' && (
              <div>
                <div className="panel-head">
                  <div><div className="eyebrow">Stage 5</div><h2>Loudness-matched comparison</h2><p>Compare the original, mix, master and reference without volume bias.</p></div>
                  <span className="tag green">Gain matched</span>
                </div>
                <div className="panel-pad">
                  <div className="grid two">
                    <div className="panel flat panel-pad">
                      <span className="tag">Original</span>
                      <div className="wave generated-wave" />
                      <div className="project-meta"><div><span>LUFS</span><strong>-16.8</strong></div><div><span>Peak</span><strong>-0.4</strong></div><div><span>Width</span><strong>71%</strong></div></div>
                    </div>
                    <div className="panel flat panel-pad" style={{ borderColor: 'rgba(84,232,255,.22)' }}>
                      <span className="tag green">Master v3</span>
                      <div className="wave generated-wave" />
                      <div className="project-meta"><div><span>LUFS</span><strong>-10.4</strong></div><div><span>Peak</span><strong>-1.0</strong></div><div><span>Width</span><strong>78%</strong></div></div>
                    </div>
                  </div>
                  <div className="panel flat panel-pad" style={{ marginTop: 14 }}>
                    <div className="eyebrow">What changed</div>
                    <div className="issue-list" style={{ padding: 0 }}>
                      {[['Vocal intelligibility improved','Dynamic control and a 3.4 kHz correction improved clarity without increasing raw vocal level.','+18%'],['Low-end definition improved','Sub-energy is now controlled and the kick-bass relationship is more stable.','+14%'],['Streaming safety achieved','True peak is now limited to -1.0 dBTP with codec overs protection.','Safe']].map(([t,d,b]) => (
                        <div key={t} className="issue">
                          <div className="issue-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>✓</div>
                          <div><h4>{t}</h4><p>{d}</p></div>
                          <div className="confidence">{b}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'export' && (
              <div>
                <div className="panel-head">
                  <div><div className="eyebrow">Stage 6</div><h2>Export release package</h2><p>Download masters, previews, stems and a technical QC report.</p></div>
                  <span className="tag green">Ready</span>
                </div>
                <div className="panel-pad">
                  <ExportOptions />
                  <button className="btn primary" style={{ width: '100%', marginTop: 16, padding: 14 }} onClick={openStudio}>Build release package</button>
                </div>
              </div>
            )}

          </div>

          <aside className="studio-side">
            <div className="eyebrow">Current project</div>
            <div className="project-file">
              <div className="project-icon">♫</div>
              <div><h3>Midnight Prayer</h3><p>Afrobeats · Full song</p></div>
            </div>
            <div className="project-meta" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
              <div><span>Sample rate</span><strong>48 kHz</strong></div>
              <div><span>Bit depth</span><strong>24-bit</strong></div>
            </div>
            <div className="eyebrow">Lead vocal chain</div>
            <div className="chain">
              {[['Dynamic EQ','Mud and harshness control',false],['Opto Compressor','3.1 dB average reduction',false],['Harmonics','Warm mode · 18% mix',false],['Air','12 kHz · sibilance protected',false],['Echo + Space','1/8D delay · short plate',true]].map(([n,s,send]) => (
                <div key={n} className="module">
                  <div className="module-head"><div><h4>{n}</h4><small>{s}</small></div><span className={`tag ${send?'violet':'green'}`}>{send?'Send':'On'}</span></div>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width: '100%', marginTop: 14 }} data-infinity-local-action="true" onClick={() => toast('Artist profile saved.')}>Save as artist profile</button>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── View: Sound Lab ─────────────────────────────────────────────
function SoundLabView({ toast }) {
  const [prompt, setPrompt] = useState('Dark spiritual choir texture with warm African percussion, cinematic atmosphere and a distant vocal response.');
  const [generating, setGenerating] = useState(false);
  const generate = () => {
    if (!prompt.trim()) { toast('Add a sound description first.'); return; }
    setGenerating(true);
    toast('Four new project-matched sounds generated.');
    setTimeout(() => setGenerating(false), 900);
  };
  return (
    <div className="view">
      <div className="section-title" style={{ marginTop: 0 }}>
        <div><div className="eyebrow">Generative audio</div><h2>Sound Lab</h2><p>Create loops, textures, vocal layers and one-shots that match the open project.</p></div>
        <button className="btn primary" data-infinity-local-action="true" onClick={generate}>{generating ? 'Generating…' : 'Generate 4 sounds'}</button>
      </div>
      <div className="grid sidebar-layout">
        <div className="panel panel-pad">
          <div className="sound-controls">
            <div className="field"><label>Describe the sound</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} /></div>
            <div className="grid two">
              {[['Genre','Afrobeats|Gospel|Hip-hop|Cinematic|R&B'],['Emotion','Spiritual|Triumphant|Dark|Hopeful|Melancholic'],['Key','Match project: F# minor|C minor|A minor|Free tonal'],['Tempo','Match project: 104 BPM|Half-time: 52 BPM|Free tempo'],['Asset type','Loop|One-shot|Texture|Vocal layer'],['Duration','8 bars|4 bars|16 bars|30 seconds']].map(([lbl,opts]) => (
                <div key={lbl} className="field"><label>{lbl}</label><select>{opts.split('|').map(o => <option key={o}>{o}</option>)}</select></div>
              ))}
            </div>
            <div className="range-row"><label><span>Intensity</span><strong>68%</strong></label><input type="range" defaultValue="68" /></div>
            <div className="range-row"><label><span>Variation</span><strong>Medium</strong></label><input type="range" defaultValue="50" /></div>
          </div>
        </div>
        <div className="panel panel-pad">
          <div className="eyebrow">Project compatibility</div>
          <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>Midnight Prayer</h3>
          <div className="project-meta" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div><span>Key</span><strong>F# minor</strong></div>
            <div><span>Tempo</span><strong>104 BPM</strong></div>
            <div><span>Genre</span><strong>Afrobeats</strong></div>
            <div><span>Energy</span><strong>62%</strong></div>
          </div>
          <div className="issue" style={{ gridTemplateColumns: 'auto 1fr', marginTop: 14 }}>
            <div className="issue-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>✓</div>
            <div><h4>Auto-match enabled</h4><p>Generated sounds will align to the project key and tempo.</p></div>
          </div>
        </div>
      </div>
      <div className="section-title"><div><h2>Generated results</h2><p>Preview, regenerate or add directly to the project.</p></div></div>
      <div className="sound-results">
        {[['Vocal texture','Prayer Choir Texture 01','F# minor · 104 BPM · 8 bars'],['Percussion loop','Spiritual Drum Pulse 02','F# minor · 104 BPM · 8 bars'],['Atmosphere','Midnight Air Layer 03','Free tonal · 104 BPM · 16 bars'],['Response vocal','Distant Answer 04','F# minor · 104 BPM · 4 bars']].map(([type,name,meta]) => (
          <div key={name} className="panel sound-card">
            <span className="tag violet">{type}</span>
            <div className="wave generated-wave" />
            <h4>{name}</h4><p>{meta}</p>
            <div className="actions">
              <button className="btn small" data-infinity-local-action="true" onClick={() => toast('Preview playing.')}>▶ Preview</button>
              <button className="btn small" data-infinity-local-action="true" onClick={() => toast('Added to project.')}>＋ Project</button>
              <button className="btn small" data-infinity-local-action="true" onClick={() => toast('Download started.')}>WAV</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── View: Masters ───────────────────────────────────────────────
function MastersView({ openStudio }) {
  return (
    <div className="view">
      <div className="section-title" style={{ marginTop: 0 }}>
        <div><div className="eyebrow">Master archive</div><h2>Completed masters</h2><p>All final versions, loudness targets and QC results.</p></div>
        <button className="btn primary" onClick={openStudio}>Master a track</button>
      </div>
      <div className="grid three">
        {[['Midnight Prayer · v3','Balanced streaming master','-10.4','-1.0','94%'],['Family Grace · v2','Apple Music master','-15.8','-1.0','91%'],['Blue Room · v1','Warm R&B master','-11.6','-1.0','88%']].map(([n,s,lufs,peak,score]) => (
          <div key={n} className="panel project-card">
            <div className="project-top">
              <div className="project-file"><div className="project-icon">M</div><div><h3>{n}</h3><p>{s}</p></div></div>
              <span className="tag green">{score}</span>
            </div>
            <div className="project-meta">
              <div><span>LUFS</span><strong>{lufs}</strong></div>
              <div><span>Peak</span><strong>{peak}</strong></div>
              <div><span>Format</span><strong>WAV 24</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── View: Library ───────────────────────────────────────────────
function LibraryView({ toast }) {
  return (
    <div className="view">
      <div className="section-title" style={{ marginTop: 0 }}>
        <div><div className="eyebrow">Asset library</div><h2>Files, stems and generated sounds</h2><p>Reusable assets across all projects.</p></div>
        <button className="btn primary" data-infinity-local-action="true" onClick={() => toast('Upload dialog coming soon.')}>Upload assets</button>
      </div>
      <div className="grid four">
        <div className="stat panel flat"><small>Original recordings</small><strong>31</strong><em>12.4 GB</em></div>
        <div className="stat panel flat"><small>Separated stems</small><strong>86</strong><em>4.8 GB</em></div>
        <div className="stat panel flat"><small>Generated sounds</small><strong>42</strong><em>820 MB</em></div>
        <div className="stat panel flat"><small>Export packages</small><strong>18</strong><em>620 MB</em></div>
      </div>
      <div className="panel panel-pad" style={{ marginTop: 16 }}>
        <div className="issue-list" style={{ padding: 0 }}>
          {[['WAV','midnight-prayer-lead-vocal.wav','Lead vocal · 48 kHz · 24-bit · Midnight Prayer'],['WAV','ashes-rise-beat.wav','Instrumental · 44.1 kHz · 24-bit · Ashes Rise'],['AI','prayer-choir-texture-01.wav','Generated vocal texture · F# minor · 104 BPM']].map(([icon,name,sub]) => (
            <div key={name} className="issue">
              <div className="project-icon" style={{ fontSize: 8, fontWeight: 900 }}>{icon}</div>
              <div><h4>{name}</h4><p>{sub}</p></div>
              <button className="btn small" data-infinity-local-action="true" onClick={() => toast('Opening file.')}>Open</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── View: Settings ──────────────────────────────────────────────
function SettingsView() {
  return (
    <div className="view">
      <div className="section-title" style={{ marginTop: 0 }}>
        <div><div className="eyebrow">Account</div><h2>Studio settings</h2><p>Configure default delivery, analysis and creative preferences.</p></div>
      </div>
      <div className="grid two">
        <div className="panel panel-pad">
          <div className="eyebrow">Default mastering</div>
          <div className="field"><label>Primary delivery target</label><select><option>Balanced streaming</option><option>Dynamic</option><option>Loud</option><option>Club</option></select></div>
          <div className="field" style={{ marginTop: 12 }}><label>True-peak ceiling</label><select><option>-1.0 dBTP</option><option>-1.5 dBTP</option><option>-0.8 dBTP</option></select></div>
          <div className="field" style={{ marginTop: 12 }}><label>Default export</label><select><option>WAV 24-bit / 48 kHz</option><option>WAV 24-bit / 44.1 kHz</option><option>WAV 16-bit / 44.1 kHz</option></select></div>
        </div>
        <div className="panel panel-pad">
          <div className="eyebrow">AI behaviour</div>
          <div className="range-row"><label><span>Processing conservatism</span><strong>72%</strong></label><input type="range" defaultValue="72" /></div>
          <div className="range-row"><label><span>Creative suggestions</span><strong>55%</strong></label><input type="range" defaultValue="55" /></div>
          <div className="range-row"><label><span>Automatic safe fixes</span><strong>80%</strong></label><input type="range" defaultValue="80" /></div>
        </div>
      </div>
    </div>
  );
}

// ── View: Landing ───────────────────────────────────────────────
function LandingView({ setView, openStudio }) {
  return (
    <div className="view">
      <div className="landing-nav">
        <div className="brand" style={{ border: 0, padding: 0 }}>
          <div className="brand-mark" />
          <div><h1>Infinity AI</h1><p>Music production, intelligently rebuilt</p></div>
        </div>
        <div className="landing-links">
          {['How it works','Studio','Sound Lab','Pricing','FAQ'].map(l => <span key={l} style={{ cursor: 'pointer' }}>{l}</span>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" data-infinity-local-action="true" onClick={() => setView('settings')}>Sign in</button>
          <button className="btn primary" onClick={openStudio}>Start free</button>
        </div>
      </div>

      <div className="panel hero">
        <div className="hero-copy">
          <div className="eyebrow">Your private AI audio engineer</div>
          <h2>Mix less blindly. <span>Release with confidence.</span></h2>
          <p>Infinity analyses what your song actually needs, explains every decision, builds a professional vocal and mastering chain, and lets you compare every version before export.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={openStudio}>Upload your first track</button>
            <button className="btn" data-infinity-local-action="true" onClick={() => setView('studio')}>Hear the difference</button>
          </div>
          <div className="stats" style={{ marginTop: 24 }}>
            <div className="stat"><small>Analysis</small><strong>25+</strong><em>Audio measurements</em></div>
            <div className="stat"><small>Production</small><strong>7</strong><em>Vocal macros</em></div>
            <div className="stat"><small>Mastering</small><strong>6</strong><em>Delivery profiles</em></div>
            <div className="stat"><small>Control</small><strong>100%</strong><em>Editable decisions</em></div>
          </div>
        </div>
        <div className="hero-card">
          <div className="master-visual">
            <span className="tag green">AI analysis complete</span>
            <h3 style={{ fontSize: 18, margin: '14px 0 3px' }}>Your track needs three corrections</h3>
            <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>Infinity explains them before changing anything.</p>
            <div className="issue-list" style={{ padding: '14px 0 0' }}>
              {[['Harshness at 3.4 kHz','Dynamic correction recommended.'],['Mud at 260 Hz','Subtle low-mid reduction recommended.'],['True peak too high','Set output ceiling to -1.0 dBTP.']].map(([t,d]) => (
                <div key={t} className="issue" style={{ gridTemplateColumns: 'auto 1fr' }}>
                  <div className="issue-icon">!</div><div><h4>{t}</h4><p>{d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">
        <div><h2>From raw recording to release package</h2><p>One project, one clear workflow.</p></div>
      </div>
      <div className="grid three">
        {[['01','var(--cyan-soft)','var(--cyan)','Analyse what matters','Measure loudness, true peak, dynamics, frequency balance, stereo image, noise, clipping, vocal presence and more.'],['02','var(--violet-soft)','var(--violet)','Shape with native modules','Dynamic EQ, optical compression, harmonics, air, delay, reverb and intelligent vocal macros.'],['03','var(--green-soft)','var(--green)','Master and verify','Choose a delivery profile, compare versions at matched loudness and export a QC-verified release package.']].map(([num,bg,color,title,desc]) => (
          <div key={num} className="panel landing-feature">
            <div className="feature-icon" style={{ background: bg, color }}>{num}</div>
            <h3>{title}</h3><p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── View titles ─────────────────────────────────────────────────
const VIEW_TITLES = {
  dashboard: ['Dashboard','Your production overview'],
  projects: ['Projects','All recordings, stems, mixes and masters'],
  studio: ['Studio · Midnight Prayer','AI mix and mastering workspace'],
  soundlab: ['Sound Lab','Generate project-matched audio assets'],
  masters: ['Masters','Completed versions and quality reports'],
  library: ['Library','Files, stems and reusable sounds'],
  settings: ['Settings','Studio defaults and AI preferences'],
  landing: ['Public website','Marketing experience concept'],
};

const NAV_MAIN = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'studio', label: 'Studio' },
  { id: 'soundlab', label: 'Sound Lab' },
  { id: 'masters', label: 'Masters' },
  { id: 'library', label: 'Library' },
];

const NAV_ACCOUNT = [
  { id: 'landing', label: 'Public website' },
  { id: 'settings', label: 'Settings' },
];

// ── Main app shell ──────────────────────────────────────────────
export default function BaseInfinityApp() {
  const [view, setView] = useState('dashboard');
  const [studioStep, setStudioStep] = useState('import');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [abPlaying, setAbPlaying] = useState(false);
  const [abSide, setAbSide] = useState('master');
  const [mixMode, setMixMode] = useState('simple');
  const [toastState, toast] = useToast();

  const openStudio = () => window.dispatchEvent(new CustomEvent('infinity:open-studio'));

  const navigate = (id) => {
    setView(id);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const id = requestAnimationFrame(regenerateBars);
    return () => cancelAnimationFrame(id);
  }, [view, studioStep, mixMode]);

  const [title, crumb] = VIEW_TITLES[view] || [view, ''];

  return (
    <div className="app">
      {sidebarOpen && <div className="shade" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" />
          <div><h1>Infinity AI</h1><p>Intelligent music production</p></div>
        </div>

        <div className="workspace-select">
          <small>Current workspace</small>
          <strong>Roland Studio <span>⌄</span></strong>
        </div>

        <nav className="nav-group">
          <div className="nav-label">Workspace</div>
          {NAV_MAIN.map(item => (
            <button key={item.id} className={`nav-btn${view===item.id?' active':''}`} onClick={() => navigate(item.id)}>
              {NAV_ICONS[item.id]}{item.label}
            </button>
          ))}
        </nav>

        <nav className="nav-group">
          <div className="nav-label">Account</div>
          {NAV_ACCOUNT.map(item => (
            <button key={item.id} className={`nav-btn${view===item.id?' active':''}`} onClick={() => navigate(item.id)}>
              {NAV_ICONS[item.id]}{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="usage">
            <div className="usage-row"><span>Monthly processing</span><strong>62%</strong></div>
            <div className="bar"><span style={{ width: '62%' }} /></div>
          </div>
          <div className="profile">
            <div className="avatar">RD</div>
            <div><strong>Roland Dzoagbe</strong><span>Creator plan</span></div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" data-infinity-local-action="true" onClick={() => setSidebarOpen(s => !s)}>☰</button>
            <div>
              <div className="page-title">{title}</div>
              <div className="crumb">{crumb}</div>
            </div>
          </div>
          <div className="top-actions">
            <div className="status-pill"><span className="dot" /> Audio engine online</div>
            <button className="btn ghost" data-infinity-local-action="true" onClick={() => toast('Documentation coming soon.')}>Documentation</button>
            <button className="btn primary" onClick={openStudio}>＋ New project</button>
          </div>
        </header>

        <div className="content">
          {view === 'dashboard' && <DashboardView setView={navigate} openStudio={openStudio} />}
          {view === 'projects' && <ProjectsView openStudio={openStudio} />}
          {view === 'studio' && <StudioView step={studioStep} setStep={setStudioStep} mixMode={mixMode} setMixMode={setMixMode} toast={toast} openStudio={openStudio} />}
          {view === 'soundlab' && <SoundLabView toast={toast} />}
          {view === 'masters' && <MastersView openStudio={openStudio} />}
          {view === 'library' && <LibraryView toast={toast} />}
          {view === 'settings' && <SettingsView />}
          {view === 'landing' && <LandingView setView={navigate} openStudio={openStudio} />}
        </div>
      </main>

      <div className="ab-player">
        <button className="play" data-infinity-local-action="true" onClick={() => setAbPlaying(p => !p)}>
          {abPlaying ? '⏸' : '▶'}
        </button>
        <div className="ab-info">
          <strong>{abSide === 'master' ? 'Midnight Prayer · Master v3' : 'Midnight Prayer · Original'}</strong>
          <span>{abPlaying ? 'Playing loudness-matched preview' : 'Loudness-matched preview'}</span>
        </div>
        <div className="ab-wave generated-track" />
        <div className="ab-switch">
          <button data-infinity-local-action="true" className={abSide==='original'?'active':''} onClick={() => { setAbSide('original'); toast('Original selected.'); }}>Original</button>
          <button data-infinity-local-action="true" className={abSide==='master'?'active':''} onClick={() => { setAbSide('master'); toast('Master selected.'); }}>Master</button>
        </div>
        <button className="btn icon" data-infinity-local-action="true" onClick={() => toast('More options coming soon.')}>⋯</button>
      </div>

      <div className={`toast${toastState.show ? ' show' : ''}`}>{toastState.msg}</div>
    </div>
  );
}
