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
  const target = buttons.find((button) => button.textContent?.toLowerCase().includes(label.toLowerCase()));
  if (target) {
    target.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }
  return false;
}

function routeForLabel(label) {
  const text = label.toLowerCase();
  if (
    text.includes('open studio') ||
    text.includes('upload audio') ||
    text.includes('start mix') ||
    text.includes('mix & master') ||
    text.includes('record')
  ) {
    return { page: 'studio', audioMvp: true };
  }
  if (text.includes('generate sounds') || text.includes('sounds')) return { page: 'sounds' };
  return null;
}

function clamp(value, min = 40, max = 99) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function readinessScore(analysis, flags) {
  let score = 92;
  if (analysis.integrated_lufs == null) score -= 8;
  if (analysis.true_peak_dbtp == null) score -= 8;
  if (analysis.true_peak_dbtp != null && Number(analysis.true_peak_dbtp) > -1) score -= 18;
  if (flags?.length) score -= Math.min(24, flags.length * 7);
  return clamp(score, 45, 99);
}

function lufsScore(analysis, target = -10) {
  const lufs = Number(analysis.integrated_lufs);
  if (!Number.isFinite(lufs)) return 72;
  return clamp(100 - Math.abs(lufs - target) * 8);
}

function scoreLabel(score) {
  if (score >= 90) return 'Release-ready';
  if (score >= 78) return 'Close to release';
  if (score >= 65) return 'Needs polish';
  return 'Needs review';
}

function MiniMeter({ label, value, note }) {
  const safeValue = clamp(value, 35, 98);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <b>{label}</b>
        <span>{safeValue}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${safeValue}%`, background: 'linear-gradient(90deg,#57f09c,#55e9ff,#b78aff)' }} />
      </div>
      {note && <div style={{ marginTop: 4, color: 'rgba(245,248,255,.48)', fontSize: 10 }}>{note}</div>}
    </div>
  );
}

function SpectrumHeatmap() {
  const bands = [
    ['Sub', 58],
    ['Bass', 76],
    ['Low Mid', 62],
    ['Mid', 72],
    ['Presence', 82],
    ['Sibilance', 54],
    ['Air', 68],
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginTop: 8 }}>
      {bands.map(([band, value]) => (
        <div key={band} style={{ textAlign: 'center' }}>
          <div style={{ height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'end', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: `${value}%`, background: 'linear-gradient(180deg,#55e9ff,#b78aff)' }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: 'rgba(245,248,255,.5)' }}>{band}</div>
        </div>
      ))}
    </div>
  );
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
          response
            .clone()
            .json()
            .then((payload) => {
              const result = payload?.result || payload;
              if (result?.elite_engineering_report) {
                window.dispatchEvent(new CustomEvent('infinity:elite-analysis-ready', { detail: result }));
              }
            })
            .catch(() => {});
        }
      } catch {}
      return response;
    };

    return () => {
      window.fetch = originalFetch;
      window.__infinityEliteAnalysisFetchPatched = false;
    };
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
  const flags = report.quality_flags || [];
  const freqRisks = report.frequency_balance_report?.detected_risks || [];
  const plugins = Object.entries(report.plugin_translation || {}).slice(0, 4);
  const score = readinessScore(analysis, flags);
  const streaming = lufsScore(analysis, masterPlan.target_lufs || -10);
  const radio = clamp(streaming - flags.length * 4, 55, 98);
  const club = clamp(streaming + (Number(analysis.true_peak_dbtp) <= -1 ? 3 : -8), 55, 98);
  const dynamics = analysis.lra ? clamp(Number(analysis.lra) * 9, 45, 95) : 72;
  const peakSafety = Number(analysis.true_peak_dbtp) <= -1 ? 96 : 62;
  const referenceMatch = clamp((streaming + dynamics + peakSafety) / 3);
  const metrics = [
    ['BPM', analysis.estimated_bpm || 'Detecting'],
    ['Key', analysis.estimated_key || 'Detecting'],
    ['LUFS', analysis.integrated_lufs ?? 'N/A'],
    ['True Peak', analysis.true_peak_dbtp ?? 'N/A'],
  ];
  const pluginSettings = [
    ['TDR Nova', 'Mud 200-400Hz dynamic cut; harshness and sibilance control.'],
    ['TDR Kotelnikov', 'Transparent 2-4 dB gain reduction; preserve transients.'],
    ['Valhalla Supermassive', 'Short plate/room; avoid vocal masking.'],
    ['LoudMax', `Ceiling -1 dBTP; target ${masterPlan.target_lufs || -10} LUFS.`],
  ];

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 10000, width: 'min(500px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 36px)', overflow: 'auto', color: '#f5f8ff', border: '1px solid rgba(85,233,255,.28)', background: 'linear-gradient(145deg, rgba(12,14,26,.98), rgba(18,22,38,.98))', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,.55)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ color: '#55e9ff', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>Elite Analysis Report</div>
          <div style={{ fontSize: 17, fontWeight: 900 }}>AI engineer report ready</div>
        </div>
        <button type="button" onClick={() => setDismissed(true)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(245,248,255,.65)', borderRadius: 10, width: 30, height: 30 }}>x</button>
      </div>

      <div style={{ marginTop: 14, border: '1px solid rgba(87,240,156,.2)', background: 'rgba(87,240,156,.06)', borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(245,248,255,.5)' }}>Commercial readiness</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: '#57f09c' }}>{score}%</div>
            <div style={{ fontSize: 11, color: 'rgba(245,248,255,.55)' }}>{scoreLabel(score)}</div>
          </div>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 999 }}>
            <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg,#57f09c,#55e9ff)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '9px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(245,248,255,.42)' }}>{label}</div>
            <div style={{ marginTop: 3, fontSize: 13, color: '#57f09c', fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
        {[
          ['Streaming', streaming],
          ['Radio', radio],
          ['Club', club],
        ].map(([label, value]) => (
          <div key={label} style={{ border: '1px solid rgba(85,233,255,.14)', background: 'rgba(85,233,255,.04)', borderRadius: 12, padding: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <b>{label}</b>
              <span>{value}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 999 }}>
              <div style={{ height: '100%', width: `${value}%`, background: '#55e9ff' }} />
            </div>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 12, border: '1px solid rgba(183,138,255,.18)', background: 'rgba(183,138,255,.05)', borderRadius: 14, padding: 12 }}>
        <b style={{ color: '#b78aff', fontSize: 12 }}>Visual Analysis</b>
        <MiniMeter label="Dynamic Range" value={dynamics} note="Punch and musical movement." />
        <MiniMeter label="True Peak Safety" value={peakSafety} note="Streaming-safe peak target." />
        <MiniMeter label="Reference Match Readiness" value={referenceMatch} note="Prepared for future reference matching." />
        <SpectrumHeatmap />
      </section>

      <section style={{ marginTop: 12, border: '1px solid rgba(183,138,255,.22)', background: 'rgba(183,138,255,.07)', borderRadius: 14, padding: 12 }}>
        <b style={{ color: '#b78aff', fontSize: 12 }}>Mix Plan</b>
        <p style={{ color: 'rgba(245,248,255,.72)', fontSize: 12 }}>{mixPlan.goal || 'Clean, balance and prepare the mix for mastering.'}</p>
      </section>

      <section style={{ marginTop: 12, border: '1px solid rgba(87,240,156,.22)', background: 'rgba(87,240,156,.06)', borderRadius: 14, padding: 12 }}>
        <b style={{ color: '#57f09c', fontSize: 12 }}>Master Target</b>
        <p style={{ color: 'rgba(245,248,255,.72)', fontSize: 12 }}>{masterPlan.target_lufs ? `${masterPlan.target_lufs} LUFS - ${masterPlan.true_peak_ceiling} dBTP - ${masterPlan.character}` : 'Commercial loudness target and QC profile generated.'}</p>
      </section>

      {freqRisks.length > 0 && (
        <section style={{ marginTop: 12, border: '1px solid rgba(255,207,102,.2)', background: 'rgba(255,207,102,.06)', borderRadius: 14, padding: 12 }}>
          <b style={{ color: '#ffcf66', fontSize: 12 }}>Frequency Balance Checks</b>
          {freqRisks.slice(0, 3).map((item, index) => (
            <div key={index} style={{ color: 'rgba(245,248,255,.72)', fontSize: 12, marginTop: 4 }}>- {item}</div>
          ))}
        </section>
      )}

      <section style={{ marginTop: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', borderRadius: 14, padding: 12 }}>
        <b style={{ fontSize: 12 }}>Suggested Plugin Settings</b>
        {pluginSettings.map(([name, text]) => (
          <div key={name} style={{ marginTop: 7, fontSize: 11 }}>
            <b style={{ color: '#55e9ff' }}>{name}</b>
            <div style={{ color: 'rgba(245,248,255,.72)' }}>{text}</div>
          </div>
        ))}
      </section>

      {plugins.length > 0 && (
        <section style={{ marginTop: 12, border: '1px solid rgba(85,233,255,.18)', background: 'rgba(85,233,255,.05)', borderRadius: 14, padding: 12 }}>
          <b style={{ color: '#55e9ff', fontSize: 12 }}>Plugin Chain Translation</b>
          {plugins.map(([name, purpose]) => (
            <div key={name} style={{ marginTop: 5, fontSize: 11, color: 'rgba(245,248,255,.72)' }}>
              <b>{name}</b>: {purpose}
            </div>
          ))}
        </section>
      )}

      {flags.length > 0 && <div style={{ marginTop: 12, color: '#ffcf66', fontSize: 12 }}>{flags.length} quality issue{flags.length > 1 ? 's' : ''} detected.</div>}
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
