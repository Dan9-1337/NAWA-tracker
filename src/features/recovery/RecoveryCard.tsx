import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { RecoveryCredential } from '../../../shared/contracts';
import { canonicalOpaqueTokenPattern } from '../../../shared/validation';
import { pl } from '../../i18n/pl';

type RecoveryCardProps = {
  credential: RecoveryCredential;
  onConfirm: () => void;
  rotated?: boolean;
};

type ScopedState = {
  identity: string;
  value: string;
};

function normalizedPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function isSafeRecoveryCredential(credential: RecoveryCredential): boolean {
  if (!canonicalOpaqueTokenPattern.test(credential.recoveryToken)) return false;
  try {
    const url = new URL(credential.recoveryUrl);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin === window.location.origin &&
      normalizedPath(url.pathname) === normalizedPath(window.location.pathname) &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === `#restore=${credential.recoveryToken}`
    );
  } catch {
    return false;
  }
}

export function RecoveryCard({ credential, onConfirm, rotated = false }: RecoveryCardProps) {
  const identity = `${credential.recoveryToken}\n${credential.recoveryUrl}`;
  const [confirmed, setConfirmed] = useState(false);
  const [qrState, setQrState] = useState<ScopedState | null>(null);
  const [copyState, setCopyState] = useState<ScopedState | null>(null);
  const [errorState, setErrorState] = useState<ScopedState | null>(null);
  const mounted = useRef(false);
  const activeIdentity = useRef<string | null>(identity);
  const generation = useRef(0);
  const credentialIsSafe = isSafeRecoveryCredential(credential);
  const cleared = confirmed;
  if (!cleared) activeIdentity.current = identity;

  const qrDataUrl = qrState?.identity === identity ? qrState.value : null;
  const copyStatus = copyState?.identity === identity ? copyState.value : null;
  const operationError = errorState?.identity === identity ? errorState.value : null;

  useEffect(() => {
    mounted.current = true;
    if (!cleared) activeIdentity.current = identity;
    return () => {
      mounted.current = false;
      activeIdentity.current = null;
      generation.current += 1;
    };
  }, [cleared, identity]);

  useEffect(() => {
    if (cleared || !credentialIsSafe) return;
    const currentGeneration = generation.current + 1;
    generation.current = currentGeneration;
    const recoveryUrl = credential.recoveryUrl;
    void QRCode.toDataURL(recoveryUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    })
      .then((dataUrl) => {
        if (
          mounted.current &&
          activeIdentity.current === identity &&
          generation.current === currentGeneration
        ) {
          setQrState({ identity, value: dataUrl });
        }
      })
      .catch(() => {
        if (
          mounted.current &&
          activeIdentity.current === identity &&
          generation.current === currentGeneration
        ) {
          setErrorState({ identity, value: pl.recovery.qrFailed });
        }
      });
    return () => {
      if (generation.current === currentGeneration) generation.current += 1;
    };
  }, [cleared, credential.recoveryUrl, credentialIsSafe, identity]);

  if (cleared) return null;

  async function copyCode() {
    const token = credential.recoveryToken;
    try {
      await navigator.clipboard.writeText(token);
      if (mounted.current && activeIdentity.current === identity) {
        setCopyState({ identity, value: pl.recovery.copied });
      }
    } catch {
      if (mounted.current && activeIdentity.current === identity) {
        setCopyState({ identity, value: pl.recovery.copyFailed });
      }
    }
  }

  async function downloadQr() {
    if (!credentialIsSafe) return;
    let link: HTMLAnchorElement | null = null;
    let objectUrl: string | null = null;
    const recoveryUrl = credential.recoveryUrl;
    setErrorState(null);
    try {
      const svg = await QRCode.toString(recoveryUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 640,
      });
      if (!mounted.current || activeIdentity.current !== identity) return;
      objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'kod-dostepu-nawa.svg';
      document.body.append(link);
      link.click();
    } catch {
      if (mounted.current && activeIdentity.current === identity) {
        setErrorState({ identity, value: pl.recovery.downloadFailed });
      }
    } finally {
      link?.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  function confirmSaved() {
    activeIdentity.current = null;
    generation.current += 1;
    setCopyState(null);
    setErrorState(null);
    setQrState(null);
    setConfirmed(true);
    onConfirm();
  }

  return (
    <section className="rounded-[2rem] border border-amber-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">{pl.recovery.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">{pl.recovery.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{pl.recovery.description}</p>

      {rotated ? (
        <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
          {pl.recovery.rotationWarning}
        </p>
      ) : null}

      <div className="mt-6 grid items-center gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white p-4">
          {qrDataUrl ? (
            <img className="h-auto w-full max-w-72" src={qrDataUrl} alt={pl.recovery.qrAlt} />
          ) : operationError || !credentialIsSafe ? (
            <span className="text-sm text-slate-500">{pl.recovery.qrUnavailable}</span>
          ) : (
            <span className="text-sm text-slate-500">{pl.recovery.qrLoading}</span>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">{pl.recovery.codeLabel}</p>
          <code className="mt-2 block break-all rounded-2xl bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-white">
            {credential.recoveryToken}
          </code>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white" onClick={copyCode}>
              {pl.recovery.copyCode}
            </button>
            <button type="button" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={downloadQr} disabled={!credentialIsSafe}>
              {pl.recovery.downloadQr}
            </button>
          </div>
          {copyStatus ? <p className="mt-3 text-sm text-slate-600" role="status" aria-live="polite">{copyStatus}</p> : null}
          {!credentialIsSafe || operationError ? (
            <p className="mt-3 text-sm text-rose-800" role="alert">
              {!credentialIsSafe ? pl.recovery.invalidCredential : operationError}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium leading-6 text-rose-950">
        {pl.recovery.requiredWarning}
      </p>
      <button type="button" className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white sm:w-auto" onClick={confirmSaved}>
        {pl.recovery.confirmSaved}
      </button>
    </section>
  );
}
