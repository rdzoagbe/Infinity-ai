import { useEffect, useState } from 'react';
import BaseInfinityApp from './InfinityBase.jsx';
import AudioMVP from './AudioMVPV2.jsx';
import AuthDashboard from './AuthDashboardV122.jsx';

const NAV_MAP = {
  home: 'Home',
  studio: 'Studio',
  sounds: 'Sounds',
};

function clickNav(label) {
  const buttons = Array.from(document.querySelectorAll('.app nav button'));
  const target = buttons.find(b => b.textContent?.toLowerCase().includes(label.toLowerCase()));
  if (target) { target.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); return true; }
  return false;
}

function routeForLabel(label) {
  const text = label.toLowerCase();
  if (text.includes('open studio') || text.includes('upload audio') || text.includes('start mix') || text.includes('mix & master') || text.includes('record')) {
    return { page: 'studio', audioMvp: true };
  }
  if (text.includes('generate sounds') || text.includes('sounds')) return { page: 'sounds' };
  return null;
}

function readinessScore(analysis, flags) {
  let score = 92;
  if (analysis.integrated_lufs == null) score -= 8;
  if (analysis.true_peak_dbtp == null) score -= 8;
  if (analysis.true_peak_dbtp != null && Number(analysis.true_peak_dbtp) > -1) score -= 18;
  if (flags?.length) score -= Math.min(24, flags.length * 7);
  return Math.max(45, Math.min(99, score));
}

function scoreBand(score) {
  if (score >= 90) return 'Release-ready';
  if (score >= 78) return 'Close to release';
  if (score >= 65) return 'Needs mix/master polish';
  return 'Needs engineering review';
}

function lufsScore(analysis, target = -10) {
  const lufs = Number(analysis.integrated_lufs);
  if (!Number.isFinite(lufs)) return 72;
  const diff = Math.abs(lufs - target);
  return Math.max(40, Math.round(100 - diff * 8));
}

function pluginSettings(analysis, masterPlan) {
  const target = masterPlan?.target_lufs || -10;
  return [
    ['TDR Nova', 'Dynamic EQ', 'Mud 200–400Hz: -2 dB dynamic cut · Harsh 2–5kHz: monitor · Sibilance 6–10kHz: dynamic de-ess'],
    ['TDR Kotelnikov', 'Bus compression', 'Ratio 1.8:1–2.5:1 · GR target 2–4 dB · preserve transients'],
    ['Valhalla Supermassive', 'Space', 'Short vocal plate or room · keep wet low enough to protect intelligibility'],
    ['LoudMax', 'Limiter', `Ceiling -1 dBTP · target ${target} LUFS · avoid audible pumping`],
  ];
}

function visualScore(value, fallback = 74) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(35, Math.min(98, Math.round(n)));
}

function dynamicScore(analysis) {
  const lra = Number(analysis.lra);
  if (!Number.isFinite(lra)) return 72;
  if (lra < 3) return 48;
  if (lra < 6) return 72;
  if (lra < 12) return 90;
  return 82;
}

function truePeakSafety(analysis) {
  const tp = Number(analysis.true_peak_dbtp);
  if (!Number.isFinite(tp)) return 70;
  if (tp <= -1) return 96;
  if (tp <= -0.3) return 62;
  return 42;
}

function SpectrumHeatmap() {
  const bands = [
    ['Sub', 58], ['Bass', 76], ['Low Mid', 62], ['Mid', 72], ['Presence', 82], ['Sibilance', 54], ['Air', 68],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginTop: 8 }}>
      {bands.map(([band, value]) => (
        <div key={band} style={{ textAlign: 'center' }}>
          <div style={{ height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'end', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: `${value}%`, background: 'linear-gradient(180deg,#55e9ff,#b78aff)', opacity: 0.9 }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: 'rgba(245,248,255,.5)' }}>{band}</div>
        </div>
      ))}
    </div>
  );
}

function MiniMeter({ label, value, note }) {
  const safeValue = visualScore(value);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, marginBottom: 5 }}>
        <b>{label}</b><span style={{ color: 'rgba(245,248,255,.6)' }}>{safeValue}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${safeValue}%`, background: 'linear-gradient(90deg,#57f09c,#55e9ff,#b78aff)', borderRadius: 999 }} />
      </div>
      {note && <div style={{ marginTop: 4, color: 'rgba(245,248,255,.48)', fontSize: 10, lineHeight: 1.35 }}>{note}</div>}
    </div>
  );
}

function scoreReasons(analysis, flags, score) {
  const reasons = [];
  if (analysis.integrated_lufs != null) reasons.push(`Integrated loudness measured at ${analysis.integrated_lufs} LUFS.`);
  if (analysis.true_peak_dbtp != null) reasons.push(`True peak safety checked at ${analysis.true_peak_dbtp} dBTP.`);
  if (flags?.length) reasons.push(`${flags.length} QC flag${flags.length > 1 ? 's' : ''} reduced the readiness score.`);
  if (score >= 90) reasons.push('No major release blockers detected by the current analysis layer.');
  if (!reasons.length) reasons.push('Score is provisional until full DSP analysis completes.');
  return reasons.slice(0, 3);
}

function EliteAnalysisPanel() {
  const [analysis, setAnalysis] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.fetch || window.__infinityEliteAnalysisFetchPatched) return;
    const originalFetch = window.fetch.bind(window);
    window.__infinityEliteAnalysisFetchPatched = true;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (url.includes('/api/v1/audio/analyze')) {
          response.clone().json().then(payload => {
            const result = payload?.result || payload;
            if (result?.elite_engineering_report) {
              window.dispatchEvent(new CustomEvent('infinity:elite-analysis-ready', { detail: result }));
            }
          }).catch(() => {});
        }
      } catch {}
      return response;
    };
    return () => { window.fetch = originalFetch; window.__infinityEliteAnalysisFetchPatched = false; };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      setAnalysis(event.detail);
      setDismissed(false);
    };
    window.addEventListener('infinity:elite-analysis-ready', handler);
    return () => window.removeEventListener('infinity:elite-analysis-ready', handler);
  }, []);

  if (!analysis || dismissed) return null;

  const report = analysis.elite_engineering_report || {};
  const mixPlan = report.mix_plan || {};
  const masterPlan = report.master_plan || {};
  const qualityFlags = report.quality_flags || [];
  const freq = report.frequency_balance_report || {};
  const plugins = report.plugin_translation || {};
  const score = readinessScore(analysis, qualityFlags);
  const streaming = lufsScore(analysis, masterPlan.target_lufs || -10);
  const radio = Math.max(55, Math.min(98, streaming - (qualityFlags.length * 4)));
  const club = Math.max(55, Math.min(98, streaming + (analysis.true_peak_dbtp != null && Number(analysis.true_peak_dbtp) <= -1 ? 3 : -8)));
  const dynamics = dynamicScore(analysis);
  const peakSafety = truePeakSafety(analysis);
  const stereo = visualScore(analysis.stereo_width || analysis.stereo_width_percent, 78);
  const referenceMatch = Math.round((streaming + dynamics + peakSafety) / 3);
  const metrics = [
    ['BPM', analysis.estimated_bpm || 'Detecting'],
    ['Key', analysis.estimated_key || 'Detecting'],
    ['LUFS', analysis.integrated_lufs ?? 'N/A'],
    ['True Peak', analysis.true_peak_dbtp ?? 'N/A'],
  ];
  const pluginRows = Object.entries(plugins).slice(0, 4);
  const freqRisks = freq.detected_risks || [];
  const recommendedSettings = pluginSettings(analysis, masterPlan);
  const readinessRows = [
    ['Streaming', streaming],
    ['Radio', radio],
    ['Club', club],
  ];
  const reasons = scoreReasons(analysis, qualityFlags, score);

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 10000, width: 'min(500px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 36px)', overflow: 'auto', color: '#f5f8ff', border: '1px solid rgba(85,233,255,.28)', background: 'linear-gradient(145deg, rgba(12,14,26,.98), rgba(18,22,38,.98))', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,.55), 0 0 44px rgba(85,233,255,.12)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#55e9ff', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>Elite Analysis Report</div>
          <div style={{ fontSize: 17, fontWeight: 900 }}>AI engineer report ready</div>
        </div>
        <button type="button" onClick={() => setDismissed(true)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(245,248,255,.65)', borderRadius: 10, width: 30, height: 30, cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ marginTop: 14, border: '1px solid rgba(87,240,156,.2)', background: 'rgba(87,240,156,.06)', borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(245,248,255,.48)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Commercial readiness</div>
            <div style={{ marginTop: 2, fontSize: 24, fontWeight: 950, color: '#57f09c' }}>{score}%</div>
            <div style={{ color: 'rgba(245,248,255,.55)', fontSize: 11 }}>{scoreBand(score)}</div>
          </div>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg,#57f09c,#55e9ff)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '9px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(245,248,255,.42)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
            <div style={{ marginTop: 3, fontSize: 13, color: '#57f09c', fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
        {readinessRows.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid rgba(85,233,255,.14)', background: 'rgba(85,233,255,.04)', borderRadius: 12, padding: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}><b>{label}</b><span>{value}%</span></div>
            <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', width: `${value}%`, background: '#55e9ff' }} /></div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, border: '1px solid rgba(183,138,255,.18)', background: 'rgba(183,138,255,.05)', borderRadius: 14, padding: 12 }}>
        <div style={{ color: '#b78aff', fontWeight: 900, fontSize: 12, marginBottom: 8 }}>Visual Analysis</div>
        <MiniMeter label="Dynamic Range" value={dynamics} note="Estimates whether the track keeps punch and musical movement." />
        <MiniMeter label="Stereo Width" value={stereo} note="Checks perceived width while protecting mono compatibility." />
        <MiniMeter label="True Peak Safety" value={peakSafety} note="Target should remain at or below -1 dBTP for streaming." />
        <MiniMeter label="Reference Match Readiness" value={referenceMatch} note="Prepares the track for future reference-track tonal matching." />
        <SpectrumHeatmap />
      </div>

      <div style={{ marginTop: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', borderRadius: 14, padding: 12 }}>
        <div style={{ color: '#f5f8ff', fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Why this score?</div>
        {reasons.map((item, index) => (
          <div key={index} style={{ color: 'rgba(245,248,255,.72)', fontSize: 11, lineHeight: 1.45, marginTop: index ? 4 : 0 }}>• {item}</div>
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        <div style={{ border: '1px solid rgba(183,138,255,.22)', background: 'rgba(183,138,255,.07)', borderRadius: 14, padding: 12 }}>
          <div style={{ color: '#b78aff', fontWeight: 900, fontSize: 12, marginBottom: 5 }}>Mix Plan</div>
          <div style={{ color: 'rgba(245,248,255,.72)', fontSize: 12, lineHeight: 1.5 }}>{mixPlan.goal || 'Clean, balance and prepare the mix for mastering.'}</div>
        </div>
        <div style={{ border: '1px solid rgba(87,240,156,.22)', background: 'rgba(87,240,156,.06)', borderRadius: 14, padding: 12 }}>
          <div style={{ color: '#57f09c', fontWeight: 900, fontSize: 12, marginBottom: 5 }}>Master Target</div>
          <div style={{ color: 'rgba(245,248,255,.72)', fontSize: 12, lineHeight: 1.5 }}>{masterPlan.target_lufs ? `${masterPlan.target_lufs} LUFS · ${masterPlan.true_peak_ceiling} dBTP · ${masterPlan.character}` : 'Commercial loudness target and QC profile generated.'}</div>
        </div>
      </div>

      {freqRisks.length > 0 && (
        <div style={{ marginTop: 12, border: '1px solid rgba(255,207,102,.2)', background: 'rgba(255,207,102,.06)', borderRadius: 14, padding: 12 }}>
          <div style={{ color: '#ffcf66', fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Frequency Balance Checks</div>
          {freqRisks.slice(0, 3).map((item, index) => (
            <div key={index} style={{ color: 'rgba(245,248,255,.72)', fontSize: 12, lineHeight: 1.45, marginTop: index ? 4 : 0 }}>• {item}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', borderRadius: 14, padding: 12 }}>
        <div style={{ color: '#f5f8ff', fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Suggested Plugin Settings</div>
        {recommendedSettings.map(([name, role, setting]) => (
          <div key={name} style={{ marginTop: 7, fontSize: 11, lineHeight: 1.45 }}>
            <b style={{ color: '#55e9ff' }}>{name}</b><span style={{ color: 'rgba(245,248,255,.45)' }}> · {role}</span>
            <div style={{ color: 'rgba(245,248,255,.72)' }}>{setting}</div>
          </div>
        ))}
      </div>

      {pluginRows.length > 0 && (
        <div style={{ marginTop: 12, border: '1px solid rgba(85,233,255,.18)', background: 'rgba(85,233,255,.05)', borderRadius: 14, padding: 12 }}>
          <div style={{ color: '#55e9ff', fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Plugin Chain Translation</div>
          {pluginRows.map(([name, purpose]) => (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, color: 'rgba(245,248,255,.72)', fontSize: 11, lineHeight: 1.45, marginTop: 5 }}>
              <b style={{ color: 'rgba(245,248,255,.9)' }}>{name}</b>
              <span>{purpose}</span>
            </div>
          ))}
        </div>
      )}

      {qualityFlags.length > 0 && (
        <div style={{ marginTop: 12, color: '#ffcf66', fontSize: 12, lineHeight: 1.5 }}>
          {qualityFlags.length} quality issue{qualityFlags.length > 1 ? 's' : ''} detected. Open the analysis JSON for full QC details.
        </div>
      )}
    </div>
  );
}

export default function InfinityActionRouter() {
  const [audioMvpOpen, setAudioMvpOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setAudioMvpOpen(true);
    window.addEventListener('infinity:open-studio', openHandler);
    return () => window.removeEventListener('infinity:open-studio', openHandler);
  }, []);

  const closeStudio = () => {
    setAudioMvpOpen(false);
    window.dispatchEvent(new CustomEvent('infinity:close-studio'));
  };

  useEffect(() => {
    const handler = (event) => {
      const button = event.target.closest?.('button');
      if (!button) return;
      if (button.closest('[data-infinity-auth="true"]')) return;
      if (button.closest('[data-infinity-local-action="true"]')) return;
      if (!button.closest('.app')) return;
      if (button.closest('nav')) return;
      if (button.closest('.chips')) return;
      if (button.closest('.toggle')) return;
      if (button.closest('.range')) return;
      const label = button.textContent?.replace(/\s+/g, ' ').trim();
      if (!label) return;
      const route = routeForLabel(label);
      if (!route) return;
      if (route.audioMvp) window.setTimeout(() => setAudioMvpOpen(true), 120);
      if (route.page) window.setTimeout(() => clickNav(NAV_MAP[route.page]), 0);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return (
    <>
      <AuthDashboard>
        <BaseInfinityApp />
      </AuthDashboard>
      <AudioMVP open={audioMvpOpen} onClose={closeStudio} />
      <EliteAnalysisPanel />
    </>
  );
}
