import { useEffect, useState } from 'react';
import BaseApp from './AudioMagic_complete.jsx';

const toastStyle = {
  position: 'fixed',
  right: 18,
  bottom: 18,
  zIndex: 9999,
  maxWidth: 360,
  padding: '14px 16px',
  borderRadius: 18,
  color: '#F4F7FB',
  background: 'rgba(26,28,35,0.96)',
  border: '1px solid rgba(0,229,255,0.32)',
  boxShadow: '0 0 28px rgba(0,229,255,0.18)',
  fontFamily: 'Rajdhani, system-ui, sans-serif',
  fontWeight: 700,
};

const responsiveScrollCss = `
  html,
  body,
  #root {
    height: auto !important;
    min-height: 100% !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior-y: auto !important;
  }

  body {
    position: static !important;
  }

  #root > * {
    min-height: 100vh !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }

  main,
  section,
  article,
  aside,
  nav,
  header,
  footer {
    min-height: 0 !important;
    max-height: none !important;
  }

  textarea,
  input,
  select {
    max-width: 100% !important;
  }

  @media (max-width: 1360px), (max-height: 820px) {
    main,
    section,
    article,
    aside,
    nav,
    header,
    footer,
    #root > div,
    #root > div > div {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    aside {
      position: static !important;
      top: auto !important;
      min-height: auto !important;
    }
  }

  @media (max-height: 760px) {
    * {
      scroll-margin-top: 16px;
    }
  }
`;

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getActionFor(label) {
  const text = label.toLowerCase();
  if (text.includes('share review')) return 'Review link copied for musician testing.';
  if (text.includes('export feedback')) return 'Feedback JSON exported.';
  if (text.includes('download') || text.includes('export') || text.includes('metadata')) return 'Export package generated.';
  if (text.includes('play') || text.includes('preview') || text.includes('compare')) return 'Preview action triggered.';
  if (text.includes('clone') || text.includes('record')) return 'Voice capture simulation opened.';
  if (text.includes('arrange')) return 'Arrangement view opened.';
  if (text.includes('search')) return 'Search action opened the library context.';
  if (text.includes('magic')) return 'Magic workflow executed.';
  if (text.includes('feedback')) return 'Feedback action recorded.';
  if (text.includes('mark')) return 'Checklist state updated.';
  return `Action completed: ${label}`;
}

export default function AudioMagicActionable() {
  const [toast, setToast] = useState('');

  useEffect(() => {
    let styleTag = document.getElementById('audiomagic-responsive-scroll-fix');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'audiomagic-responsive-scroll-fix';
      styleTag.textContent = responsiveScrollCss;
      document.head.appendChild(styleTag);
    }

    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';

    const onClick = async (event) => {
      const button = event.target.closest?.('button');
      if (!button) return;
      const label = button.innerText?.trim() || button.getAttribute('aria-label') || 'Button';
      const message = getActionFor(label);

      if (label.toLowerCase().includes('share review')) {
        const reviewUrl = `${window.location.origin}/review/neon-heartbeat-demo`;
        try {
          await navigator.clipboard.writeText(reviewUrl);
        } catch {
          window.sessionStorage.setItem('audiomagic-review-link', reviewUrl);
        }
      }

      if (/download|export|metadata/i.test(label)) {
        downloadJson(`audiomagic-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'}.json`, {
          label,
          message,
          project: 'Neon Heartbeat — Demo Session',
          generatedBy: 'AudioMagic.ai v15.2 scroll and actionability layer',
          timestamp: new Date().toISOString(),
        });
      }

      setToast(message);
      window.clearTimeout(window.__audiomagicToastTimer);
      window.__audiomagicToastTimer = window.setTimeout(() => setToast(''), 2400);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <>
      <BaseApp />
      {toast && <div style={toastStyle}>{toast}</div>}
    </>
  );
}
