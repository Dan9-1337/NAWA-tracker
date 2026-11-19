import { useCallback, useRef, useState } from 'react';
import { getTelegramWebApp } from './telegram';

/**
 * Runs an async save at most once at a time, tracks the pending flag, and gives the matching haptic feedback.
 * `run` resolves to true when the action succeeded.
 */
export function useGuardedSubmit() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    try {
      await action();
      getTelegramWebApp()?.haptic.notification('success');
      return true;
    } catch {
      getTelegramWebApp()?.haptic.notification('error');
      return false;
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, []);

  return { pending, run };
}
