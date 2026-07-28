import { useCallback, useEffect, useRef, useState } from 'react';

// Mirror of the backend's chains.VOCAL_BEAT_DEFAULTS (camelCase). The backend
// clamps again — these ranges keep the UI honest.
export const MIX_DEFAULTS = {
  vocalGain: 1.0,
  beatGain: 0.85,
  vocalMute: false,
  beatMute: false,
  presence: 2.0,
  air: 1.8,
  clarity: 0.0,
  warmth: 0.25,
  deess: 0.5,
  compression: 0.5,
  reverb: 0.2,
  delay: 0.0,
  beatStereoWidth: 1.5,
  busCompress: true,
};

export const MIX_RANGES = {
  vocalGain: [0, 2],
  beatGain: [0, 2],
  presence: [-6, 6],
  air: [0, 6],
  clarity: [-6, 6],
  warmth: [0, 1],
  deess: [0, 1],
  compression: [0, 1],
  reverb: [0, 1],
  delay: [0, 1],
  beatStereoWidth: [1, 3],
};

function clampValue(key, value) {
  if (typeof value === 'boolean') return value;
  const range = MIX_RANGES[key];
  if (!range) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return MIX_DEFAULTS[key];
  return Math.max(range[0], Math.min(range[1], n));
}

const storageKey = (projectKey) => `infinity_mix_params_v1_${projectKey || 'default'}`;
const HISTORY_LIMIT = 50;

/**
 * Mix parameter state with validation, undo/redo, reset, and per-project
 * persistence — parameters are restored when the project reopens.
 */
export function useMixParams(projectKey) {
  const [params, setParamsState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(projectKey));
      if (saved) return { ...MIX_DEFAULTS, ...JSON.parse(saved) };
    } catch {}
    return { ...MIX_DEFAULTS };
  });
  const historyRef = useRef({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);

  // Reload when switching projects.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(projectKey));
      setParamsState(saved ? { ...MIX_DEFAULTS, ...JSON.parse(saved) } : { ...MIX_DEFAULTS });
    } catch {
      setParamsState({ ...MIX_DEFAULTS });
    }
    historyRef.current = { past: [], future: [] };
    setHistoryVersion((v) => v + 1);
  }, [projectKey]);

  // Persist on change.
  useEffect(() => {
    try { localStorage.setItem(storageKey(projectKey), JSON.stringify(params)); } catch {}
  }, [params, projectKey]);

  const set = useCallback((key, value) => {
    setParamsState((current) => {
      const next = { ...current, [key]: clampValue(key, value) };
      const h = historyRef.current;
      h.past = [...h.past.slice(-HISTORY_LIMIT + 1), current];
      h.future = [];
      return next;
    });
    setHistoryVersion((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.past.length) return;
    setParamsState((current) => {
      const previous = h.past[h.past.length - 1];
      h.past = h.past.slice(0, -1);
      h.future = [current, ...h.future.slice(0, HISTORY_LIMIT - 1)];
      return previous;
    });
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (!h.future.length) return;
    setParamsState((current) => {
      const next = h.future[0];
      h.future = h.future.slice(1);
      h.past = [...h.past.slice(-HISTORY_LIMIT + 1), current];
      return next;
    });
    setHistoryVersion((v) => v + 1);
  }, []);

  const reset = useCallback(() => {
    setParamsState((current) => {
      const h = historyRef.current;
      h.past = [...h.past.slice(-HISTORY_LIMIT + 1), current];
      h.future = [];
      return { ...MIX_DEFAULTS };
    });
    setHistoryVersion((v) => v + 1);
  }, []);

  void historyVersion; // consumed so canUndo/canRedo re-render
  return {
    params, set, undo, redo, reset,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
  };
}
