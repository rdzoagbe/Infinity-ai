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
  const metrics = [
    ['BPM', analysis.estimated_bpm || 'Detecting'],
    ['Key', analysis.estimated_key || 'Detecting'],
    ['LUFS', analysis.integrated_lufs ?? 'N/A'],
    ['True Peak', analysis.true_peak_dbtp ?? 'N/A'],
  ];

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 10000, width: 'min(420px, calc(100vw - 24px))', color: '#f5f8ff', border: '1px solid rgba(85,233,255,.28)', background: 'linear-gradient(145deg, rgba(12,14,26,.98), rgba(18,22,38,.98))', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,.55), 0 0 44px rgba(85,233,255,.12)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#55e9ff', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>Elite Analysis Report</div>
          <div style={{ fontSize: 17, fontWeight: 900 }}>AI engineer report ready</div>
        </div>
        <button type="button" onClick={() => setDismissed(true)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(245,248,255,.65)', borderRadius: 10, width: 30, height: 30, cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
        {metrics.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '9px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(245,248,255,.42)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
            <div style={{ marginTop: 3, fontSize: 13, color: '#57f09c', fontWeight: 900 }}>{value}</div>
          </div>
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
