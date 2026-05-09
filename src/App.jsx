import { useEffect, useRef, useState } from 'react';
import BaseInfinityApp from './InfinityBase.jsx';
import AudioMVP from './AudioMVP.jsx';
import AuthDashboard from './AuthDashboard.jsx';
import BetaFeedback from './BetaFeedback.jsx';

const NAV_MAP = {
  mix: 'AI Mix & Master',
  daw: 'AI DAW',
  generator: 'AI Sound Generator',
  exports: 'Export System',
  engine: 'AI Architecture',
  overview: 'Overview',
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

function downloadPlaceholder(label) {
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'infinity-export';
  const payload = {
    product: 'Infinity',
    action: label,
    status: 'frontend-placeholder',
    note: 'This confirms the button is wired. Real audio rendering/export is handled by the backend phase.',
    createdAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safe}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function routeForLabel(label) {
  const text = label.toLowerCase();

  if (text.includes('overview')) return { page: 'overview', message: 'Opening Infinity overview.' };
  if (text.includes('architecture') || text.includes('engine') || text.includes('backend') || text.includes('ai analysis')) {
    return { page: 'engine', message: 'Opening AI Architecture roadmap.' };
  }
  if (text.includes('daw') || text.includes('live preview') || text.includes('send sounds')) {
    return { page: 'daw', message: 'Opening AI DAW / Sound Creator.' };
  }
  if (text.includes('generate') || text.includes('regenerate') || text.includes('sound') || text.includes('credits')) {
    return { page: 'generator', message: 'Opening AI Sound Generator.' };
  }
  if (text.includes('export') || text.includes('download') || text.includes('free tier') || text.includes('cloud') || text.includes('version')) {
    return { page: 'exports', message: 'Opening Export System.' };
  }
  if (text.includes('mix') || text.includes('master') || text.includes('upload') || text.includes('before') || text.includes('after') || text.includes('premium')) {
    return {
      page: 'mix',
      audioMvp: text.includes('upload') || text.includes('start mix') || text.includes('mix & master'),
      message: 'Opening AI Mix & Master. Audio upload/player/analyzer is available.',
    };
  }
  if (text.includes('preview') || text.includes('play')) {
    return { page: null, message: 'Preview action is wired. Real audio playback appears after audio is loaded.' };
  }

  return { page: null, message: `Action wired: ${label}` };
}

function Notice({ message, onClose }) {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 10000,
        maxWidth: 390,
        padding: '14px 16px',
        borderRadius: 18,
        color: '#f5f8ff',
        background: 'rgba(17,20,33,.97)',
        border: '1px solid rgba(85,233,255,.35)',
        boxShadow: '0 22px 80px rgba(0,0,0,.42),0 0 34px rgba(85,233,255,.18)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        fontWeight: 700,
        lineHeight: 1.45,
      }}
    >
      <span style={{ color: '#55e9ff' }}>i</span>
      <span>{message}</span>
      <button
        aria-label="Close notification"
        onClick={onClose}
        style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#f5f8ff', cursor: 'pointer', padding: 0, fontSize: 18 }}
      >
        x
      </button>
    </div>
  );
}

export default function InfinityActionRouter() {
  const [notice, setNotice] = useState('');
  const [audioMvpOpen, setAudioMvpOpen] = useState(false);
  const timer = useRef(null);

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(''), 3200);
  };

  useEffect(() => {
    const handler = (event) => {
      const button = event.target.closest?.('button');
      if (!button) return;

      if (button.closest('[data-infinity-auth="true"]')) return;
      if (button.closest('[data-infinity-local-action="true"]')) return;
      if (!button.closest('.app')) return;

      const label = button.textContent?.replace(/\s+/g, ' ').trim();
      if (!label) return;

      if (button.closest('nav')) {
        showNotice(`Opening ${label}.`);
        return;
      }

      const route = routeForLabel(label);

      if (route.audioMvp) {
        window.setTimeout(() => setAudioMvpOpen(true), 180);
      }

      if (label.toLowerCase().includes('download') || label.toLowerCase().includes('export')) {
        downloadPlaceholder(label);
      }

      if (route.page) {
        window.setTimeout(() => clickNav(NAV_MAP[route.page]), 0);
      }

      showNotice(route.message);
    };

    document.addEventListener('click', handler, true);
    return () => {
      document.removeEventListener('click', handler, true);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <AuthDashboard>
        <BaseInfinityApp />
      </AuthDashboard>
      <AudioMVP open={audioMvpOpen} onClose={() => setAudioMvpOpen(false)} />
      <BetaFeedback />
      <Notice message={notice} onClose={() => setNotice('')} />
    </>
  );
}
