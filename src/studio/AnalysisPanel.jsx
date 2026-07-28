import { useEffect, useState } from 'react';

const STATUS_COLORS = {
  pass: '#57f09c',
  warning: '#ffcf66',
  fail: '#ff6b6b',
  unavailable: 'rgba(245,248,255,.35)',
};
const STATUS_LABELS = { pass: 'Pass', warning: 'Warning', fail: 'Fail', unavailable: 'Unavailable' };

const fmtOrUnavailable = (v, unit = '') => (v == null ? 'Unavailable' : `${v}${unit}`);

function decisionsKey(fileId) { return `infinity_problem_decisions_v1_${fileId}`; }

/**
 * Real analysis display: measurements (with honest 'Unavailable'), the
 * technical release check, and detected problems with Accept / Ignore.
 */
export default function AnalysisPanel({ analysis, onApplyRecommendation }) {
  const fileId = analysis?.file_id || 'unknown';
  const [decisions, setDecisions] = useState({});

  useEffect(() => {
    try { setDecisions(JSON.parse(localStorage.getItem(decisionsKey(fileId)) || '{}')); }
    catch { setDecisions({}); }
  }, [fileId]);

  if (!analysis) return null;

  const saveDecision = (key, action) => {
    const next = { ...decisions, [key]: action };
    setDecisions(next);
    try { localStorage.setItem(decisionsKey(fileId), JSON.stringify(next)); } catch {}
  };

  const dyn = analysis.dynamics || {};
  const check = analysis.technical_release_check;
  const problems = analysis.processing_decisions?.problems || [];

  const measurements = [
    ['Duration', analysis.duration_seconds != null ? `${Math.floor(analysis.duration_seconds / 60)}:${String(Math.round(analysis.duration_seconds % 60)).padStart(2, '0')}` : null],
    ['Sample rate', analysis.sample_rate != null ? `${analysis.sample_rate} Hz` : null],
    ['Channels', analysis.channels != null ? (analysis.channels === 1 ? 'Mono' : analysis.channels === 2 ? 'Stereo' : analysis.channels) : null],
    ['Codec', analysis.codec || null],
    ['Loudness', analysis.integrated_lufs != null ? `${analysis.integrated_lufs} LUFS` : null],
    ['True peak', analysis.true_peak_dbtp != null ? `${analysis.true_peak_dbtp} dBTP` : null],
    ['Loudness range', analysis.lra != null ? `${analysis.lra} LU` : null],
    ['RMS', dyn.rms_db != null ? `${dyn.rms_db} dB` : null],
    ['Crest factor', dyn.crest_factor_db != null ? `${dyn.crest_factor_db} dB` : null],
    ['Noise floor', dyn.noise_floor_db != null ? `${dyn.noise_floor_db} dB` : null],
    ['Phase correlation', analysis.phase_correlation != null ? analysis.phase_correlation : null],
    ['Clipping', dyn.clipping_detected != null ? (dyn.clipping_detected ? 'Detected' : 'None') : null],
    ['BPM', analysis.estimated_bpm],
    ['Key', analysis.estimated_key],
  ];

  return (
    <div style={{ marginTop: 14 }}>
      {/* Measurements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
        {measurements.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'rgba(245,248,255,.42)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 3, color: value == null ? 'rgba(245,248,255,.35)' : '#f5f8ff' }}>
              {fmtOrUnavailable(value)}
            </div>
          </div>
        ))}
      </div>
      {(analysis.estimated_bpm == null || analysis.estimated_key == null) && (
        <div style={{ fontSize: 11, color: 'rgba(245,248,255,.4)', marginTop: 6 }}>
          BPM and key detection are not yet available — we show "Unavailable" instead of guessing.
        </div>
      )}

      {/* Technical release check */}
      {check && (
        <div style={{ marginTop: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Technical release check</div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
              {Object.entries(check.counts).filter(([, n]) => n > 0).map(([status, n]) => (
                <span key={status} style={{ color: STATUS_COLORS[status], fontWeight: 700 }}>{n} {STATUS_LABELS[status].toLowerCase()}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
            {check.checks.map((c) => (
              <div key={c.check} style={{ border: `1px solid ${STATUS_COLORS[c.status]}44`, background: `${STATUS_COLORS[c.status] === 'rgba(245,248,255,.35)' ? 'rgba(255,255,255,.02)' : STATUS_COLORS[c.status] + '0d'}`, borderRadius: 10, padding: '9px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 12, textTransform: 'capitalize' }}>{c.check.replace(/_/g, ' ')}</b>
                  <span style={{ fontSize: 11, fontWeight: 800, color: STATUS_COLORS[c.status] }}>{STATUS_LABELS[c.status]}</span>
                </div>
                {c.measured != null && <div style={{ fontSize: 11, color: 'rgba(245,248,255,.6)', marginTop: 2 }}>{String(c.measured)}</div>}
                <div style={{ fontSize: 11, color: 'rgba(245,248,255,.45)', marginTop: 3, lineHeight: 1.45 }}>{c.explanation}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(245,248,255,.35)', marginTop: 8 }}>{check.method}</div>
        </div>
      )}

      {/* Detected problems with Accept / Ignore */}
      {problems.length > 0 && (
        <div style={{ marginTop: 14, border: '1px solid rgba(255,180,60,.18)', background: 'rgba(255,180,60,.04)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#ffcf66', marginBottom: 10 }}>
            Detected problems ({problems.length})
          </div>
          {problems.map((p, i) => {
            const decision = decisions[p.key || i];
            return (
              <div key={p.key || i} style={{ padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none', opacity: decision === 'ignored' ? 0.45 : 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', minWidth: 52, color: p.severity === 'high' ? '#ff6b6b' : p.severity === 'medium' ? '#ffcf66' : '#57f09c' }}>
                    {p.severity}
                  </span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.band}</div>
                    <div style={{ fontSize: 12, color: 'rgba(245,248,255,.68)', lineHeight: 1.5, marginTop: 2 }}>{p.description}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,248,255,.45)', marginTop: 4 }}>
                      Confidence {(p.confidence != null ? Math.round(p.confidence * 100) + '%' : 'n/a')} ·
                      Recommended: <b style={{ color: '#55e9ff' }}>{p.recommended_module}</b>
                      {p.recommended_parameters && Object.keys(p.recommended_parameters).length > 0 && (
                        <span> ({Object.entries(p.recommended_parameters).map(([k, v]) => `${k}: ${v}`).join(', ')})</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {decision === 'accepted' ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#57f09c', padding: '5px 10px' }}>✓ Accepted</span>
                    ) : decision === 'ignored' ? (
                      <button className="secondary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => saveDecision(p.key || i, null)}>Ignored — undo</button>
                    ) : (
                      <>
                        <button
                          className="primary" style={{ fontSize: 11, padding: '5px 10px' }}
                          onClick={() => { saveDecision(p.key || i, 'accepted'); onApplyRecommendation?.(p); }}
                        >Accept</button>
                        <button className="secondary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => saveDecision(p.key || i, 'ignored')}>Ignore</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10, color: 'rgba(245,248,255,.35)', marginTop: 8 }}>
            Accepted fixes are applied by the corresponding module in the processing chain on the next render.
          </div>
        </div>
      )}
    </div>
  );
}

/** Post-render QC comparison table (before vs after mastering). */
export function QcComparison({ qc }) {
  if (!qc?.comparison) return null;
  const { rows, new_problems, improved_count, measured_count } = qc.comparison;
  const METRIC_LABELS = {
    integrated_lufs: 'Loudness (LUFS)', true_peak_dbtp: 'True peak (dBTP)',
    lra: 'Loudness range (LU)', noise_floor_db: 'Noise floor (dB)', crest_factor_db: 'Crest factor (dB)',
  };
  return (
    <div style={{ marginTop: 14, border: '1px solid rgba(85,233,255,.18)', background: 'rgba(85,233,255,.04)', borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
        Post-render QC — {improved_count}/{measured_count} measured metrics improved or on target
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'rgba(245,248,255,.45)', textAlign: 'left' }}>
              <th style={{ padding: '4px 8px' }}>Metric</th><th style={{ padding: '4px 8px' }}>Before</th>
              <th style={{ padding: '4px 8px' }}>After</th><th style={{ padding: '4px 8px' }}>Δ</th><th style={{ padding: '4px 8px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700 }}>{METRIC_LABELS[r.metric] || r.metric}</td>
                <td style={{ padding: '6px 8px' }}>{r.before ?? '—'}</td>
                <td style={{ padding: '6px 8px' }}>{r.after ?? '—'}</td>
                <td style={{ padding: '6px 8px' }}>{r.delta != null ? (r.delta > 0 ? `+${r.delta}` : r.delta) : '—'}</td>
                <td style={{ padding: '6px 8px' }}>
                  {r.improved == null ? <span style={{ color: 'rgba(245,248,255,.35)' }}>unavailable</span>
                    : r.improved ? <span style={{ color: '#57f09c', fontWeight: 800 }}>✓</span>
                    : <span style={{ color: '#ffcf66', fontWeight: 800 }}>⚠</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {new_problems?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {new_problems.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: '#ffcf66', lineHeight: 1.5 }}>⚠ {p}</div>
          ))}
        </div>
      )}
    </div>
  );
}
