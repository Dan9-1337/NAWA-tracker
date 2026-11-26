import { useCallback, useEffect, useRef } from 'react';

/**
 * Guards against stale async results and overlapping writes.
 *  - `begin()` starts a new generation; `isCurrent(id)` is false once a newer one began or the component unmounted,
 *    so a slow response can never overwrite newer state.
 *  - `acquire(name)` / `release(name)` allow one mutation at a time.
 */
export function useRequestGuard<Mutation extends string>() {
  const epoch = useRef(0);
  const mutation = useRef<Mutation | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      mutation.current = null;
      epoch.current += 1;
    };
  }, []);

  const begin = useCallback(() => {
    epoch.current += 1;
    return epoch.current;
  }, []);

  const isCurrent = useCallback((id: number) => mounted.current && epoch.current === id, []);

  const acquire = useCallback((next: Mutation) => {
    if (mutation.current) return false;
    mutation.current = next;
    return true;
  }, []);

  const release = useCallback((active: Mutation) => {
    if (mutation.current === active) mutation.current = null;
  }, []);

  const isBusy = useCallback(() => mutation.current !== null, []);

  return { begin, isCurrent, acquire, release, isBusy };
}
