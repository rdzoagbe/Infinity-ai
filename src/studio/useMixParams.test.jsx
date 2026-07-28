// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIX_DEFAULTS, useMixParams } from './useMixParams.js';

describe('useMixParams', () => {
  beforeEach(() => localStorage.clear());

  it('starts from defaults', () => {
    const { result } = renderHook(() => useMixParams('t1'));
    expect(result.current.params).toEqual(MIX_DEFAULTS);
  });

  it('clamps values to safe ranges', () => {
    const { result } = renderHook(() => useMixParams('t2'));
    act(() => result.current.set('vocalGain', 99));
    expect(result.current.params.vocalGain).toBe(2);
    act(() => result.current.set('presence', -100));
    expect(result.current.params.presence).toBe(-6);
    act(() => result.current.set('warmth', 'garbage'));
    expect(result.current.params.warmth).toBe(MIX_DEFAULTS.warmth);
  });

  it('undo and redo walk the history', () => {
    const { result } = renderHook(() => useMixParams('t3'));
    act(() => result.current.set('reverb', 0.8));
    act(() => result.current.set('delay', 0.4));
    expect(result.current.params.delay).toBe(0.4);
    act(() => result.current.undo());
    expect(result.current.params.delay).toBe(MIX_DEFAULTS.delay);
    expect(result.current.params.reverb).toBe(0.8);
    act(() => result.current.redo());
    expect(result.current.params.delay).toBe(0.4);
  });

  it('reset returns to defaults but stays undoable', () => {
    const { result } = renderHook(() => useMixParams('t4'));
    act(() => result.current.set('compression', 0.9));
    act(() => result.current.reset());
    expect(result.current.params).toEqual(MIX_DEFAULTS);
    act(() => result.current.undo());
    expect(result.current.params.compression).toBe(0.9);
  });

  it('persists per project and restores on remount', () => {
    const first = renderHook(() => useMixParams('proj-a'));
    act(() => first.result.current.set('air', 4.2));
    first.unmount();
    const second = renderHook(() => useMixParams('proj-a'));
    expect(second.result.current.params.air).toBe(4.2);
    const other = renderHook(() => useMixParams('proj-b'));
    expect(other.result.current.params.air).toBe(MIX_DEFAULTS.air);
  });
});
