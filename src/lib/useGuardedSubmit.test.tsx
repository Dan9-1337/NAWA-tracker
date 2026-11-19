import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGuardedSubmit } from './useGuardedSubmit';

describe('useGuardedSubmit', () => {
  it('reports success, toggles pending around the action, and ignores a second call while it runs', async () => {
    const { result } = renderHook(() => useGuardedSubmit());
    let release: () => void = () => undefined;
    const slow = () => new Promise<void>((resolve) => void (release = resolve));
    let calls = 0;

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.run(async () => {
        calls += 1;
        await slow();
      });
    });
    expect(result.current.pending).toBe(true);

    let second = true;
    await act(async () => {
      second = await result.current.run(async () => void (calls += 1));
    });
    expect(second).toBe(false);

    await act(async () => {
      release();
      await first;
    });
    expect(await first).toBe(true);
    expect(calls).toBe(1);
    expect(result.current.pending).toBe(false);
  });

  it('resolves to false when the action throws and frees the guard', async () => {
    const { result } = renderHook(() => useGuardedSubmit());

    let ok = true;
    await act(async () => {
      ok = await result.current.run(async () => {
        throw new Error('save failed');
      });
    });
    expect(ok).toBe(false);
    expect(result.current.pending).toBe(false);

    await act(async () => {
      ok = await result.current.run(async () => undefined);
    });
    expect(ok).toBe(true);
  });
});
