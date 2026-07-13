import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import type { RestoreSessionResult } from '../../../shared/contracts';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { pl } from '../../i18n/pl';
import { restoreSession } from '../../lib/api-client';

type RestoreAccessProps = {
  onRestored: (result: RestoreSessionResult) => void;
  initialRecoveryToken: string | null;
  onRecoveryTokenConsumed: () => void;
  siteKey?: string;
  restore?: typeof restoreSession;
  onRestoreFailed?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export function RestoreAccess({
  onRestored,
  initialRecoveryToken,
  onRecoveryTokenConsumed,
  siteKey,
  restore = restoreSession,
  onRestoreFailed,
  onCancel,
}: RestoreAccessProps) {
  const [fragmentToken, setFragmentToken] = useState<string | null>(initialRecoveryToken);
  const parentTokenCleared = useRef(false);
  const manualTokenRef = useRef('');
  const [automatic, setAutomatic] = useState(initialRecoveryToken !== null);
  const [manualToken, setManualToken] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const turnstileGeneration = useRef(0);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const callbackGeneration = turnstileGeneration.current;

  useLayoutEffect(() => {
    if (fragmentToken && !parentTokenCleared.current) {
      parentTokenCleared.current = true;
      onRecoveryTokenConsumed();
    }
  }, [fragmentToken, onRecoveryTokenConsumed]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current = false;
      manualTokenRef.current = '';
    };
  }, []);

  function clearLocalCredentials() {
    setFragmentToken(null);
    manualTokenRef.current = '';
    setManualToken('');
  }

  function resetTurnstile() {
    const nextGeneration = turnstileGeneration.current + 1;
    turnstileGeneration.current = nextGeneration;
    setTurnstileResetKey(nextGeneration);
    setTurnstileToken(null);
  }

  async function attemptRestore(recoveryToken: string, challengeToken: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    clearLocalCredentials();
    setTurnstileToken(null);
    setPending(true);
    setError(null);
    try {
      const result = await restore({ recoveryToken, turnstileToken: challengeToken });
      if (mounted.current) onRestored(result);
    } catch {
      if (mounted.current) {
        setError(pl.recovery.restoreError);
        await onRestoreFailed?.();
      }
    } finally {
      if (mounted.current) {
        clearLocalCredentials();
        setAutomatic(false);
        resetTurnstile();
        setPending(false);
      }
      inFlight.current = false;
    }
  }

  function verifyTurnstile(token: string) {
    if (callbackGeneration !== turnstileGeneration.current) return;
    const challengeToken = token.trim();
    if (inFlight.current) return;
    if (!challengeToken) {
      resetTurnstile();
      setError(pl.turnstile.error);
      return;
    }
    setTurnstileToken(challengeToken);
    setError(null);
    if (fragmentToken) void attemptRestore(fragmentToken, challengeToken);
  }

  function expireTurnstile() {
    if (callbackGeneration !== turnstileGeneration.current || inFlight.current) return;
    resetTurnstile();
    setError(pl.turnstile.expired);
  }

  function failTurnstile() {
    if (callbackGeneration !== turnstileGeneration.current || inFlight.current) return;
    resetTurnstile();
    setError(pl.turnstile.error);
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken || !manualToken.trim()) return;
    void attemptRestore(manualTokenRef.current.trim(), turnstileToken);
  }

  function changeManualToken(value: string) {
    manualTokenRef.current = value;
    setManualToken(value);
  }

  function cancelRestore() {
    if (inFlight.current) return;
    clearLocalCredentials();
    resetTurnstile();
    setError(null);
    void onCancel?.();
  }

  return (
    <section
      aria-busy={pending}
      aria-labelledby="restore-access-title"
      className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{pl.recovery.restoreEyebrow}</p>
      <h2 id="restore-access-title" className="mt-3 text-2xl font-semibold text-slate-950">
        {automatic ? pl.recovery.restoreAutomaticTitle : pl.recovery.restoreTitle}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {automatic ? pl.recovery.restoreAutomaticDescription : pl.recovery.restoreDescription}
      </p>

      <form className="mt-6 space-y-5" onSubmit={submitManual}>
        {!automatic ? (
          <label className="block text-sm font-medium text-slate-700">
            {pl.recovery.codeLabel}
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              value={manualToken}
              onChange={(event) => changeManualToken(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
        ) : null}

        <TurnstileWidget
          key={turnstileResetKey}
          siteKey={siteKey}
          onVerify={verifyTurnstile}
          onExpire={expireTurnstile}
          onError={failTurnstile}
          resetKey={turnstileResetKey}
        />

        {!automatic ? (
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending || !turnstileToken || !manualToken.trim()}
          >
            {pending ? pl.recovery.restorePending : pl.recovery.restoreSubmit}
          </button>
        ) : null}
        {pending ? <p className="text-sm font-medium text-slate-600" role="status" aria-live="polite">{pl.recovery.restorePending}</p> : null}
      </form>

      {error ? <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950" role="alert">{error}</p> : null}
      {onCancel && !automatic ? (
        <button type="button" className="mt-5 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} onClick={cancelRestore}>
          {pl.recovery.cancelRestore}
        </button>
      ) : null}
    </section>
  );
}
