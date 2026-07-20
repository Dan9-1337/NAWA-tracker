import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import QRCode from 'qrcode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecoveryCredential, RestoreSessionResult } from '../../../shared/contracts';
import {
  createResponse,
  getCurrentResponse,
} from '../../lib/api-client';
import { takeRecoveryTokenFromFragment } from '../../lib/recovery-fragment';
import { pl } from '../../i18n/pl';
import { PrivacyNotice } from '../../components/PrivacyNotice';
import { RecoveryCard } from './RecoveryCard';
import { RestoreAccess } from './RestoreAccess';

const turnstileCallbacks = vi.hoisted(() => ({
  latestVerify: undefined as ((token: string) => void) | undefined,
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(),
    toString: vi.fn(),
  },
}));

vi.mock('../../components/TurnstileWidget', () => ({
  TurnstileWidget: ({
    onVerify,
    onExpire,
    onError,
    resetKey = 0,
  }: {
    onVerify?: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    resetKey?: number;
  }) => {
    turnstileCallbacks.latestVerify = onVerify;
    return <div data-testid="turnstile" data-reset-key={resetKey}>
      <button type="button" onClick={() => onVerify?.('turnstile-token')}>Zweryfikuj Turnstile</button>
      <button type="button" onClick={() => onVerify?.('')}>Pusty token Turnstile</button>
      <button type="button" onClick={() => { onVerify?.('duplicate-one'); onVerify?.('duplicate-two'); }}>
        Duplikuj Turnstile
      </button>
      <button type="button" onClick={onExpire}>Wygaś Turnstile</button>
      <button type="button" onClick={onError}>Błąd Turnstile</button>
    </div>;
  },
}));

const canonicalToken = 'A'.repeat(42) + 'E';
const recoveryUrl = `${window.location.origin}/#restore=${canonicalToken}`;

const response = {
  hasPolishCitizenship: false,
  rankingCountry: 'Polska',
  schoolCountry: 'Polska',
  scholarshipTrack: 'nawa_director' as const,
  studyRoute: 'direct_studies' as const,
  averageGrade: 85,
  maximumGrade: 100,
  polishSchoolLevel: 'secondary' as const,
  currentStatus: 'submitted' as const,
  statusChangedAt: '2026-07-13',
};

describe('typed API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses same-origin credentials and validates a success envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCurrentResponse()).resolves.toEqual({ response });
    expect(fetchMock).toHaveBeenCalledWith('/api/responses/current', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  });

  it('parses API error envelopes without logging credential bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'RECOVERY_FAILED', message: 'Bezpieczny komunikat' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const consoleSpies = ['log', 'debug', 'info', 'warn', 'error'].map((method) =>
      vi.spyOn(console, method as 'log').mockImplementation(() => undefined),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createResponse({ response, turnstileToken: 'secret-body' })).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        code: 'RECOVERY_FAILED',
        message: 'Bezpieczny komunikat',
      }),
    );
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('recovery fragment', () => {
  it('returns a canonical token and removes its exact fragment synchronously', () => {
    window.history.replaceState(null, '', `/ankieta?source=qr#restore=${canonicalToken}`);

    const token = takeRecoveryTokenFromFragment();

    expect(token).toBe(canonicalToken);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/ankieta?source=qr');
  });

  it('does not consume unrelated or non-canonical fragments', () => {
    window.history.replaceState(null, '', `/#other=${canonicalToken}`);
    expect(takeRecoveryTokenFromFragment()).toBeNull();
    expect(window.location.hash).toBe(`#other=${canonicalToken}`);
  });

  it('scrubs a matching restore fragment even when its token is malformed', () => {
    window.history.replaceState(null, '', '/app?source=qr#restore=not-a-valid-token');

    expect(takeRecoveryTokenFromFragment()).toBeNull();
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/app?source=qr');
  });
});

describe('privacy notice', () => {
  it('names the notice and explains cookie and one-time recovery handling', () => {
    render(<PrivacyNotice />);

    expect(screen.getByRole('complementary', { name: pl.privacyNotice.title })).toBeInTheDocument();
    expect(screen.getByText(/ciasteczko sesyjne HttpOnly/)).toBeInTheDocument();
    expect(screen.getByText(/pokazywany jest tylko raz/)).toBeInTheDocument();
    expect(screen.getByText(/Nie przechowujemy surowych kodów dostępu ani surowych adresów IP/)).toBeInTheDocument();
  });
});

describe('RecoveryCard', () => {
  const qrCode = vi.mocked(QRCode);
  const toDataUrlMock = vi.mocked(
    QRCode.toDataURL as (text: string, options?: QRCode.QRCodeToDataURLOptions) => Promise<string>,
  );
  const toStringMock = vi.mocked(
    QRCode.toString as (text: string, options: QRCode.QRCodeToStringOptions) => Promise<string>,
  );

  beforeEach(() => {
    toDataUrlMock.mockResolvedValue('data:image/png;base64,cXItY29kZQ==');
    toStringMock.mockResolvedValue('<svg>qr-code</svg>');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it.each([
    ['cross-origin URL', `https://evil.example/#restore=${canonicalToken}`],
    ['credentials', `http://user:password@localhost/#restore=${canonicalToken}`],
    ['query string', `${window.location.origin}/?source=secret#restore=${canonicalToken}`],
    ['wrong token', `${window.location.origin}/#restore=${'B'.repeat(42)}E`],
    ['wrong path', `${window.location.origin}/other/#restore=${canonicalToken}`],
  ])('rejects a recovery credential with %s before QR generation', async (_case, unsafeUrl) => {
    render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl: unsafeUrl }}
        onConfirm={() => undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.recovery.invalidCredential);
    expect(qrCode.toDataURL).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: pl.recovery.downloadQr })).toBeDisabled();
  });

  it('accepts the current origin and configured application sub-path', async () => {
    window.history.replaceState(null, '', '/nested/app/');
    const nestedUrl = `${window.location.origin}/nested/app/#restore=${canonicalToken}`;

    render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl: nestedUrl }}
        onConfirm={() => undefined}
      />,
    );

    await waitFor(() => expect(qrCode.toDataURL).toHaveBeenCalledWith(nestedUrl, expect.any(Object)));
  });

  it('encodes only the supplied fragment URL and clears every credential view on confirmation', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [credential, setCredential] = useState<RecoveryCredential | null>({
        recoveryToken: canonicalToken,
        recoveryUrl,
      });
      return credential ? (
        <RecoveryCard credential={credential} onConfirm={() => setCredential(null)} />
      ) : (
        <p>Potwierdzono</p>
      );
    }

    render(<Harness />);

    await waitFor(() => expect(qrCode.toDataURL).toHaveBeenCalledWith(recoveryUrl, expect.any(Object)));
    expect(qrCode.toDataURL).not.toHaveBeenCalledWith(expect.stringContaining(response.rankingCountry), expect.anything());
    expect(screen.getByText(canonicalToken)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.recovery.confirmSaved }));

    expect(screen.getByText('Potwierdzono')).toBeInTheDocument();
    expect(screen.queryByText(canonicalToken)).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: pl.recovery.qrAlt })).not.toBeInTheDocument();
  });

  it('replaces credential props without displaying or encoding the previous token', async () => {
    const replacementToken = `${'B'.repeat(42)}E`;
    const replacementUrl = `${window.location.origin}/#restore=${replacementToken}`;
    let resolveFirst!: (value: string) => void;
    let resolveReplacement!: (value: string) => void;
    toDataUrlMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveReplacement = resolve; }));
    const { rerender } = render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl }}
        onConfirm={() => undefined}
      />,
    );

    rerender(
      <RecoveryCard
        credential={{ recoveryToken: replacementToken, recoveryUrl: replacementUrl }}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.queryByText(canonicalToken)).not.toBeInTheDocument();
    expect(screen.getByText(replacementToken)).toBeInTheDocument();
    await waitFor(() => expect(toDataUrlMock).toHaveBeenCalledWith(replacementUrl, expect.any(Object)));

    await act(async () => resolveReplacement('data:image/png;base64,replacement'));
    expect(screen.getByRole('img', { name: pl.recovery.qrAlt })).toHaveAttribute(
      'src',
      'data:image/png;base64,replacement',
    );

    await act(async () => resolveFirst('data:image/png;base64,stale'));
    expect(screen.getByRole('img', { name: pl.recovery.qrAlt })).toHaveAttribute(
      'src',
      'data:image/png;base64,replacement',
    );
  });

  it('generates and displays QR content during React Strict Mode effect replay', async () => {
    render(
      <StrictMode>
        <RecoveryCard
          credential={{ recoveryToken: canonicalToken, recoveryUrl }}
          onConfirm={() => undefined}
        />
      </StrictMode>,
    );

    expect(await screen.findByRole('img', { name: pl.recovery.qrAlt })).toHaveAttribute(
      'src',
      'data:image/png;base64,cXItY29kZQ==',
    );
  });

  it('downloads QR content during React Strict Mode effect replay', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:strict-recovery-qr');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    render(
      <StrictMode>
        <RecoveryCard
          credential={{ recoveryToken: canonicalToken, recoveryUrl }}
          onConfirm={() => undefined}
        />
      </StrictMode>,
    );

    await user.click(screen.getByRole('button', { name: pl.recovery.downloadQr }));

    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:strict-recovery-qr');
  });

  it('downloads a generated QR image and revokes its object URL', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:recovery-qr');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl }}
        onConfirm={() => undefined}
      />,
    );
    await screen.findByRole('img', { name: pl.recovery.qrAlt });

    await user.click(screen.getByRole('button', { name: pl.recovery.downloadQr }));

    expect(qrCode.toString).toHaveBeenCalledWith(recoveryUrl, expect.objectContaining({ type: 'svg' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:recovery-qr');
  });

  it('copies the recovery token and announces success', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl }}
        onConfirm={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: pl.recovery.copyCode }));

    expect(writeText).toHaveBeenCalledWith(canonicalToken);
    expect(screen.getByRole('status')).toHaveTextContent(pl.recovery.copied);
  });

  it('shows an accessible error when QR generation fails', async () => {
    toDataUrlMock.mockRejectedValueOnce(new Error('raw QR details'));
    render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl }}
        onConfirm={() => undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.recovery.qrFailed);
    expect(screen.queryByText('raw QR details')).not.toBeInTheDocument();
  });

  it('shows a download error and cleans the anchor and object URL when clicking fails', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:recovery-qr');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('raw download details');
    });
    render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl }}
        onConfirm={() => undefined}
      />,
    );
    await screen.findByRole('img', { name: pl.recovery.qrAlt });

    await user.click(screen.getByRole('button', { name: pl.recovery.downloadQr }));

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.recovery.downloadFailed);
    expect(document.querySelector('a[download="kod-dostepu-nawa.svg"]')).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:recovery-qr');
  });

  it('does not create or click download DOM after unmount while SVG generation is pending', async () => {
    const user = userEvent.setup();
    let resolveSvg!: (value: string) => void;
    toStringMock.mockImplementationOnce(() => new Promise((resolve) => { resolveSvg = resolve; }));
    const createObjectURL = vi.fn(() => 'blob:recovery-qr');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    const { unmount } = render(
      <RecoveryCard
        credential={{ recoveryToken: canonicalToken, recoveryUrl }}
        onConfirm={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: pl.recovery.downloadQr }));
    expect(toStringMock).toHaveBeenCalledOnce();
    unmount();
    await act(async () => resolveSvg('<svg>late</svg>'));

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(document.querySelector('a[download="kod-dostepu-nawa.svg"]')).not.toBeInTheDocument();
  });
});

describe('RestoreAccess', () => {
  beforeEach(() => {
    turnstileCallbacks.latestVerify = undefined;
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('moves the fragment token to child memory, clears its parent, and never stores recovery credentials', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const clear = vi.spyOn(Storage.prototype, 'clear');
    const restore = vi.fn(async (): Promise<RestoreSessionResult> => ({ response }));
    const onRestored = vi.fn();
    const onRecoveryTokenConsumed = vi.fn();
    window.history.replaceState(null, '', `/#restore=${canonicalToken}`);
    const initialRecoveryToken = takeRecoveryTokenFromFragment();

    render(
      <RestoreAccess
        initialRecoveryToken={initialRecoveryToken}
        onRestored={onRestored}
        onRecoveryTokenConsumed={onRecoveryTokenConsumed}
        restore={restore}
        siteKey="site-key"
      />,
    );

    expect(window.location.hash).toBe('');
    expect(onRecoveryTokenConsumed).toHaveBeenCalledOnce();
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith({
      recoveryToken: canonicalToken,
      turnstileToken: 'turnstile-token',
    }));
    expect(onRestored).toHaveBeenCalledWith({ response });
    expect(clear).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    for (const call of getItem.mock.calls) {
      expect(call[0]).toBe('nawa-locale');
    }
    for (const call of setItem.mock.calls) {
      expect(call[0]).toBe('nawa-locale');
      expect(String(call[1])).not.toContain(canonicalToken);
    }
  });

  it('preserves the consumed fragment token when rendered in React Strict Mode', async () => {
    const restore = vi.fn(async (): Promise<RestoreSessionResult> => ({ response }));
    const onRestored = vi.fn();
    window.history.replaceState(null, '', `/#restore=${canonicalToken}`);
    const initialRecoveryToken = takeRecoveryTokenFromFragment();

    render(
      <StrictMode>
        <RestoreAccess
          initialRecoveryToken={initialRecoveryToken}
          onRestored={onRestored}
          onRecoveryTokenConsumed={() => undefined}
          restore={restore}
          siteKey="site-key"
        />
      </StrictMode>,
    );

    expect(window.location.hash).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith({
      recoveryToken: canonicalToken,
      turnstileToken: 'turnstile-token',
    }));
    expect(onRestored).toHaveBeenCalledWith({ response });
  });

  it('rejects an empty Turnstile success token for fragment restore', async () => {
    const restore = vi.fn();
    render(
      <RestoreAccess
        initialRecoveryToken={canonicalToken}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        restore={restore}
        siteKey="site-key"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Pusty token Turnstile' }));

    expect(restore).not.toHaveBeenCalled();
    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-reset-key', '1');
    expect(screen.getByRole('alert')).toHaveTextContent(pl.turnstile.error);
  });

  it('clears a manual code after failure and shows the generic Polish message', async () => {
    const user = userEvent.setup();
    const restore = vi.fn().mockRejectedValue(new Error('internal details'));

    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        restore={restore}
        siteKey="site-key"
      />,
    );

    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    await user.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));
    await user.click(screen.getByRole('button', { name: pl.recovery.restoreSubmit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.recovery.restoreError);
    expect(screen.getByLabelText(pl.recovery.codeLabel)).toHaveValue('');
    expect(screen.queryByText('internal details')).not.toBeInTheDocument();
    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-reset-key', '1');
  });

  it('invalidates expired challenges and prevents manual submission', async () => {
    const user = userEvent.setup();
    const restore = vi.fn();
    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        restore={restore}
        siteKey="site-key"
      />,
    );

    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    await user.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));
    expect(screen.getByRole('button', { name: pl.recovery.restoreSubmit })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Wygaś Turnstile' }));

    expect(screen.getByRole('button', { name: pl.recovery.restoreSubmit })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(pl.turnstile.expired);
    await user.click(screen.getByRole('button', { name: pl.recovery.restoreSubmit }));
    expect(restore).not.toHaveBeenCalled();
  });

  it('invalidates provider errors and exposes an accessible message', async () => {
    const user = userEvent.setup();
    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        siteKey="site-key"
      />,
    );
    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    await user.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));

    await user.click(screen.getByRole('button', { name: 'Błąd Turnstile' }));

    expect(screen.getByRole('button', { name: pl.recovery.restoreSubmit })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(pl.turnstile.error);
  });

  it('clears manual input before invoking cancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onCancel={onCancel}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        siteKey="site-key"
      />,
    );
    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);

    await user.click(screen.getByRole('button', { name: pl.recovery.cancelRestore }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(pl.recovery.codeLabel)).toHaveValue('');
  });

  it('announces pending restore state and marks the section busy', async () => {
    const user = userEvent.setup();
    let resolveRestore!: (result: RestoreSessionResult) => void;
    const restore = vi.fn(() => new Promise<RestoreSessionResult>((resolve) => {
      resolveRestore = resolve;
    }));
    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        restore={restore}
        siteKey="site-key"
      />,
    );
    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    await user.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));
    await user.click(screen.getByRole('button', { name: pl.recovery.restoreSubmit }));

    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(pl.recovery.restorePending);

    await act(async () => resolveRestore({ response }));
  });

  it('blocks cancellation while restore is pending and enables it after settlement', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    let rejectRestore!: (error: Error) => void;
    const restore = vi.fn(() => new Promise<RestoreSessionResult>((_resolve, reject) => {
      rejectRestore = reject;
    }));
    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onCancel={onCancel}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        restore={restore}
        siteKey="site-key"
      />,
    );
    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    await user.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));
    await user.click(screen.getByRole('button', { name: pl.recovery.restoreSubmit }));

    const cancel = screen.getByRole('button', { name: pl.recovery.cancelRestore });
    expect(cancel).toBeDisabled();
    await user.click(cancel);
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => rejectRestore(new Error('invalid')));
    expect(screen.getByRole('button', { name: pl.recovery.cancelRestore })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: pl.recovery.cancelRestore }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('ignores duplicate callbacks in flight and clears late challenge state in finally', async () => {
    const user = userEvent.setup();
    let resolveRestore!: (result: RestoreSessionResult) => void;
    const restore = vi.fn(() => new Promise<RestoreSessionResult>((resolve) => {
      resolveRestore = resolve;
    }));
    render(
      <RestoreAccess
        initialRecoveryToken={null}
        onRestored={() => undefined}
        onRecoveryTokenConsumed={() => undefined}
        restore={restore}
        siteKey="site-key"
      />,
    );
    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    await user.click(screen.getByRole('button', { name: 'Zweryfikuj Turnstile' }));
    const oldGenerationCallback = turnstileCallbacks.latestVerify;
    await user.click(screen.getByRole('button', { name: pl.recovery.restoreSubmit }));

    await user.click(screen.getByRole('button', { name: 'Duplikuj Turnstile' }));
    expect(restore).toHaveBeenCalledOnce();
    await act(async () => resolveRestore({ response }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    await act(async () => oldGenerationCallback?.('late-old-generation-token'));

    await user.type(screen.getByLabelText(pl.recovery.codeLabel), canonicalToken);
    expect(screen.getByRole('button', { name: pl.recovery.restoreSubmit })).toBeDisabled();
    expect(screen.getByTestId('turnstile')).toHaveAttribute('data-reset-key', '1');
  });
});
