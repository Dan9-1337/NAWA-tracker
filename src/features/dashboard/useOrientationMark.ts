import { useEffect, useRef, useState } from 'react';

import type { OrientationMarkResult } from '../../../shared/contracts';
import { getOrientationMark } from '../../lib/api-client';

export type OrientationMarkState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: OrientationMarkResult | null;
};

const idleState: OrientationMarkState = { status: 'idle', data: null };

/**
 * Loads the `ориентир 2026` for a 2026 Director survey (ADR 0017). The holder score list is requested only once
 * the full distribution is on screen; a second request then adds the dots without hiding the mark meanwhile.
 * Any failure hides the feature instead of showing an error: it is an extra line, not the saved result.
 */
export function useOrientationMark(
  enabled: boolean,
  rankingCountry: string,
  includeScores: boolean,
  /** Changes when the caller's own report is created, edited or deleted, so their share of the mark appears at once. */
  reportRevision: string,
): OrientationMarkState {
  const [state, setState] = useState<OrientationMarkState>(idleState);
  /** Keeps the mark while only the score list is added, but drops another country's mark when the country changes. */
  const lastCountry = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastCountry.current = null;
      setState(idleState);
      return undefined;
    }

    let cancelled = false;
    const sameCountry = lastCountry.current === rankingCountry;
    lastCountry.current = rankingCountry;
    setState((current) => ({ status: 'loading', data: sameCountry ? current.data : null }));

    void (async () => {
      try {
        const data = await getOrientationMark(includeScores);
        if (!cancelled) setState({ status: 'ready', data });
      } catch {
        if (!cancelled) setState((current) => ({ status: 'error', data: current.data }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, rankingCountry, includeScores, reportRevision]);

  return state;
}
