import { useEffect, useState } from 'react';
import BaseInfinityApp from './InfinityBase.jsx';
import AudioMVP from './AudioMVPV2.jsx';
import AuthDashboard from './AuthDashboardV122.jsx';
import BetaFeedback from './BetaFeedback.jsx';
import ReleaseWorkflowV12 from './ReleaseWorkflowV12.jsx';

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

export default function InfinityActionRouter() {
  const [audioMvpOpen, setAudioMvpOpen] = useState(false);

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
      <AudioMVP open={audioMvpOpen} onClose={() => setAudioMvpOpen(false)} />
      <ReleaseWorkflowV12 />
      <BetaFeedback />
    </>
  );
}
