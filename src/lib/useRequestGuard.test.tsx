import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRequestGuard } from './useRequestGuard';

describe('useRequestGuard', () => {
  it('invalidates an older generation as soon as a newer one begins', () => {
    const { result } = renderHook(() => useRequestGuard<'a' | 'b'>());
    const first = result.current.begin();
    expect(result.current.isCurrent(first)).toBe(true);

    const second = result.current.begin();
    expect(result.current.isCurrent(first)).toBe(false);
    expect(result.current.isCurrent(second)).toBe(true);
  });

  it('allows one mutation at a time and only the holder can release it', () => {
    const { result } = renderHook(() => useRequestGuard<'create' | 'update'>());

    expect(result.current.acquire('create')).toBe(true);
    expect(result.current.isBusy()).toBe(true);
    expect(result.current.acquire('update')).toBe(false);

    result.current.release('update');
    expect(result.current.isBusy()).toBe(true);

    result.current.release('create');
    expect(result.current.isBusy()).toBe(false);
    expect(result.current.acquire('update')).toBe(true);
  });

  it('treats every pending result as stale after unmount', () => {
    const { result, unmount } = renderHook(() => useRequestGuard<'a'>());
    const id = result.current.begin();
    const { isCurrent } = result.current;

    unmount();

    expect(isCurrent(id)).toBe(false);
  });
});
