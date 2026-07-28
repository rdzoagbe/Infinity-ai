import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Real A/B comparison player.
 *
 * - Decodes each source into an AudioBuffer (real waveform, not decoration)
 * - One shared playhead: switching sources continues from the same position
 * - Loudness matching: per-source gain from measured LUFS, displayed to the user
 * - Waveform seek, loop region (shift+drag on the waveform), keyboard shortcuts
 * - Only one source audible at a time — no overlapping playback
 *
 * sources: [{ id, label, url, lufs (nullable), color }]
 */
export default function ABPlayer({ sources, matchTargetLufs = null }) {
  const ctxRef = useRef(null);
  const buffersRef = useRef({});      // id -> AudioBuffer
  const nodeRef = useRef(null);       // current AudioBufferSourceNode
  const gainRef = useRef(null);
  const startedAtRef = useRef(0);     // ctx.currentTime when playback started
  const offsetRef = useRef(0);        // seconds into the track
  const rafRef = useRef(null);
  const loopRef = useRef(null);       // {start, end} | null
  const activeRef = useRef(null);
  const playingRef = useRef(false);

  const [loaded, setLoaded] = useState({});
  const [active, setActive] = useState(sources[0]?.id || null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(null);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  // The loudness-match reference: the quietest measured source, or an explicit target.
  const measured = sources.filter((s) => s.lufs != null);
  const refLufs = matchTargetLufs != null ? matchTargetLufs
    : measured.length ? Math.min(...measured.map((s) => s.lufs)) : null;

  const gainDbFor = useCallback((id) => {
    const src = sources.find((s) => s.id === id);
    if (!src || src.lufs == null || refLufs == null) return 0;
    return Math.max(-24, Math.min(6, refLufs - src.lufs));
  }, [sources, refLufs]);

  // Decode all sources.
  useEffect(() => {
    let cancelled = false;
    const ctx = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    sources.forEach(async (src) => {
      if (!src.url || buffersRef.current[src.id]) return;
      try {
        const res = await fetch(src.url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        if (cancelled) return;
        buffersRef.current[src.id] = buf;
        setLoaded((l) => ({ ...l, [src.id]: true }));
        setDuration((d) => Math.max(d, buf.duration));
      } catch {
        if (!cancelled) setError(`Could not load "${src.label}" for comparison.`);
      }
    });
    return () => { cancelled = true; };
  }, [sources]);

  const stopNode = () => {
    if (nodeRef.current) {
      try { nodeRef.current.onended = null; nodeRef.current.stop(); } catch {}
      nodeRef.current = null;
    }
  };

  const startAt = useCallback((id, offset) => {
    const ctx = ctxRef.current;
    const buf = buffersRef.current[id];
    if (!ctx || !buf) return false;
    if (ctx.state === 'suspended') ctx.resume();
    stopNode();
    const node = ctx.createBufferSource();
    node.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = Math.pow(10, gainDbFor(id) / 20);
    node.connect(gain).connect(ctx.destination);
    const safeOffset = Math.max(0, Math.min(offset, buf.duration - 0.05));
    node.start(0, safeOffset);
    node.onended = () => {
      if (nodeRef.current === node && playingRef.current) {
        const lp = loopRef.current;
        if (lp) { offsetRef.current = lp.start; startAt(activeRef.current, lp.start); }
        else { setPlaying(false); offsetRef.current = 0; setPosition(0); }
      }
    };
    nodeRef.current = node;
    gainRef.current = gain;
    startedAtRef.current = ctx.currentTime - safeOffset;
    offsetRef.current = safeOffset;
    return true;
  }, [gainDbFor]);

  const currentPos = useCallback(() => {
    if (!playingRef.current || !ctxRef.current) return offsetRef.current;
    return ctxRef.current.currentTime - startedAtRef.current;
  }, []);

  // Playhead ticker + loop-region enforcement.
  useEffect(() => {
    const tick = () => {
      const pos = currentPos();
      setPosition(pos);
      const lp = loopRef.current;
      if (playingRef.current && lp && pos >= lp.end) {
        offsetRef.current = lp.start;
        startAt(activeRef.current, lp.start);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentPos, startAt]);

  const play = useCallback(() => {
    if (startAt(activeRef.current, offsetRef.current)) setPlaying(true);
  }, [startAt]);

  const pause = useCallback(() => {
    offsetRef.current = currentPos();
    stopNode();
    setPlaying(false);
  }, [currentPos]);

  const switchTo = useCallback((id) => {
    if (id === activeRef.current) return;
    const pos = currentPos();
    offsetRef.current = pos;
    setActive(id);
    if (playingRef.current) startAt(id, pos);
  }, [currentPos, startAt]);

  const seek = useCallback((seconds) => {
    offsetRef.current = Math.max(0, Math.min(seconds, duration));
    setPosition(offsetRef.current);
    if (playingRef.current) startAt(activeRef.current, offsetRef.current);
  }, [duration, startAt]);

  // Keyboard shortcuts: Space play/pause, 1..n switch, L clears loop.
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playingRef.current ? pause() : play(); }
      else if (e.key.toLowerCase() === 'l') { setLoop(null); }
      else {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < sources.length && loaded[sources[idx].id]) switchTo(sources[idx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play, pause, switchTo, sources, loaded]);

  useEffect(() => () => { stopNode(); ctxRef.current?.close?.(); }, []);

  // Waveform render for the active source.
  useEffect(() => {
    const canvas = canvasRef.current;
    const buf = buffersRef.current[active];
    if (!canvas || !buf) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    canvas.width = w; canvas.height = h;
    const ctx2d = canvas.getContext('2d');
    ctx2d.clearRect(0, 0, w, h);
    const data = buf.getChannelData(0);
    const bars = Math.floor(canvas.clientWidth / 3);
    const step = Math.floor(data.length / bars);
    const color = sources.find((s) => s.id === active)?.color || '#55e9ff';
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const base = i * step;
      for (let j = 0; j < step; j += 32) peak = Math.max(peak, Math.abs(data[base + j] || 0));
      const bh = Math.max(2, peak * h * 0.92);
      ctx2d.fillStyle = color + '99';
      ctx2d.fillRect(i * 3 * dpr, (h - bh) / 2, 2 * dpr, bh);
    }
  }, [active, loaded, sources]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const anyLoaded = sources.some((s) => loaded[s.id]);
  const pctPos = duration ? Math.min(100, (position / duration) * 100) : 0;

  const canvasSeek = (e, isDown, isMove, isUp) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = frac * duration;
    if (e.shiftKey && isDown) { dragRef.current = t; return; }
    if (dragRef.current != null && isMove) return;
    if (dragRef.current != null && isUp) {
      const a = Math.min(dragRef.current, t); const b = Math.max(dragRef.current, t);
      if (b - a > 0.25) { setLoop({ start: a, end: b }); seek(a); }
      dragRef.current = null;
      return;
    }
    if (isDown) seek(t);
  };

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {sources.map((s, i) => (
          <button
            key={s.id}
            onClick={() => switchTo(s.id)}
            disabled={!loaded[s.id]}
            style={{
              flex: 1, minWidth: 90, padding: '9px 8px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: loaded[s.id] ? 'pointer' : 'wait',
              border: `1px solid ${active === s.id ? s.color : 'rgba(255,255,255,.12)'}`,
              background: active === s.id ? `${s.color}1f` : 'rgba(255,255,255,.04)',
              color: active === s.id ? s.color : loaded[s.id] ? '#f5f8ff' : 'rgba(245,248,255,.35)',
            }}
          >
            {i + 1} · {s.label}{!loaded[s.id] && s.url ? ' …' : ''}
            {loaded[s.id] && Math.abs(gainDbFor(s.id)) > 0.05 && (
              <span style={{ display: 'block', fontSize: 10, fontWeight: 600, opacity: .75 }}>
                match {gainDbFor(s.id) > 0 ? '+' : ''}{gainDbFor(s.id).toFixed(1)} dB
              </span>
            )}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 64, cursor: 'pointer', display: 'block', borderRadius: 8, background: 'rgba(0,0,0,.25)' }}
        onMouseDown={(e) => canvasSeek(e, true, false, false)}
        onMouseUp={(e) => canvasSeek(e, false, false, true)}
      />
      <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 99, marginTop: 6 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pctPos}%`, background: sources.find((s) => s.id === active)?.color || '#55e9ff', borderRadius: 99 }} />
        {loop && duration > 0 && (
          <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${(loop.start / duration) * 100}%`, width: `${((loop.end - loop.start) / duration) * 100}%`, border: '1px solid #ffcf66', borderRadius: 4 }} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => (playing ? pause() : play())}
          disabled={!anyLoaded}
          style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#55e9ff', color: '#08101c', fontSize: 17, fontWeight: 900, cursor: 'pointer' }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: 12, color: 'rgba(245,248,255,.6)', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(position)} / {fmt(duration)}
        </span>
        {loop ? (
          <button onClick={() => setLoop(null)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '1px solid #ffcf66', background: 'rgba(255,207,102,.12)', color: '#ffcf66', cursor: 'pointer' }}>
            Loop {fmt(loop.start)}–{fmt(loop.end)} ✕
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(245,248,255,.35)' }}>Shift+drag waveform to loop · Space play · 1/2/3 switch</span>
        )}
        {refLufs != null && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(245,248,255,.45)' }}>
            Loudness-matched to {refLufs.toFixed(1)} LUFS
          </span>
        )}
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#ffb4b4' }}>{error}</div>}
    </div>
  );
}
