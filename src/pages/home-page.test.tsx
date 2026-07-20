import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateResponseResult,
  RecoveryCredential,
  ResponseFormInput,
  StatisticsResult,
} from '../../shared/contracts';
import { ApiClientError } from '../lib/api-client';
import { HomePage } from './HomePage';

const api = vi.hoisted(() => ({
  createResponse: vi.fn(),
  updateResponse: vi.fn(),
  getCurrentResponse: vi.fn(),
  getStatistics: vi.fn(),
  rotateRecovery: vi.fn(),
  logoutSession: vi.fn(),
  restoreSession: vi.fn(),
}));

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  ...api,
}));

vi.mock('../components/TurnstileWidget', () => ({
  TurnstileWidget: ({ onVerify }: { onVerify?: (token: string) => void }) => (
    <button type="button" onClick={() => onVerify?.('challenge-token')}>verify</button>
  ),
}));

vi.mock('../features/recovery/RecoveryCard', () => ({
  RecoveryCard: ({
    credential,
    onConfirm,
    rotated,
  }: {
    credential: RecoveryCredential;
    onConfirm: () => void;
    rotated?: boolean;
  }) => (
    <section>
      <h2>Zapisz dostęp do swojej ankiety</h2>
      <span>{credential.recoveryToken}</span>
      {rotated ? <span>Poprzedni kod i QR przestały działać.</span> : null}
      <button type="button" onClick={onConfirm}>Zapisałem kod dostępu</button>
    </section>
  ),
}));

const currentResponse: ResponseFormInput = {
  hasPolishCitizenship: false,
  rankingCountry: 'Ukraina',
  schoolCountry: 'Ukraina',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  averageGrade: 85,
  maximumGrade: 100,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
};

function statistics(totalValidResponses: number): StatisticsResult {
  if (totalValidResponses < 10) {
    return {
      detailsAvailable: false,
      group: null,
      totalValidResponses,
      sameTrackCount: totalValidResponses,
      sameCountryCount: null,
      groupResponseCount: 0,
      medianScore: null,
      lowerScorePercentage: null,
      statusCounts: null,
    };
  }

  return {
    detailsAvailable: false,
    group: null,
    totalValidResponses,
    sameTrackCount: totalValidResponses,
    sameCountryCount: null,
    groupResponseCount: 0,
    medianScore: null,
    lowerScorePercentage: null,
    statusCounts: null,
  };
}

const firstCredential: RecoveryCredential = {
  recoveryToken: 'A'.repeat(43),
  recoveryUrl: `http://localhost/#restore=${'A'.repeat(43)}`,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function acceptPrivacyAndReachSummary(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByLabelText('Zapoznałem się'));
  await user.click(screen.getByRole('button', { name: 'Rozpocznij' }));

  // citizenship -> geography
  await user.click(screen.getByRole('button', { name: 'Dalej' }));
  await user.type(screen.getByLabelText('Kraj obywatelstwa (do grupy statystycznej)'), 'Ukraina');
  await user.type(screen.getByLabelText('Kraj ukończenia szkoły średniej'), 'Ukraina');
  await user.click(screen.getByRole('button', { name: 'Dalej' }));

  // grades
  await user.clear(screen.getByLabelText('Maksymalna ocena w skali'));
  await user.type(screen.getByLabelText('Maksymalna ocena w skali'), '100');
  await user.clear(screen.getByLabelText('Średnia ocen'));
  await user.type(screen.getByLabelText('Średnia ocen'), '85');
  await user.click(screen.getByRole('button', { name: 'Dalej' }));

  // nawa extra (default none already selected)
  await user.click(screen.getByRole('button', { name: 'Dalej' }));

  // status
  await user.click(screen.getByRole('button', { name: 'Dalej' }));
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.restoreSession.mockReset();
    api.getStatistics.mockResolvedValue(statistics(12));
    api.logoutSession.mockResolvedValue({ loggedOut: true });
  });

  it('gives a startup recovery fragment precedence and immediately releases the parent copy', async () => {
    render(<HomePage initialRecoveryToken={'R'.repeat(43)} />);

    expect(screen.getByText('Odzyskiwanie ankiety')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Twój wynik na tle innych zgłoszeń' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Wczytywanie statystyk' })).not.toBeInTheDocument();
    expect(screen.queryByText('Statystyki pojawią się po zapisaniu ankiety.')).not.toBeInTheDocument();
    expect(api.getCurrentResponse).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('keeps manual restore and the generic error after fragment failure with no cookie session', async () => {
    const user = userEvent.setup();
    api.restoreSession.mockRejectedValue(new Error('invalid recovery credential'));
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'internal'));
    render(<HomePage initialRecoveryToken={'R'.repeat(43)} />);

    await user.click(screen.getByRole('button', { name: 'verify' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nie udało się odzyskać ankiety. Sprawdź kod i spróbuj ponownie.',
    );
    expect(screen.getByLabelText('Kod dostępu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapisz odpowiedź' })).not.toBeInTheDocument();
    expect(api.getCurrentResponse).toHaveBeenCalledOnce();
  });

  it('recovers an existing cookie session after fragment restore failure', async () => {
    const user = userEvent.setup();
    api.restoreSession.mockRejectedValue(new Error('invalid recovery credential'));
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    render(<HomePage initialRecoveryToken={'R'.repeat(43)} />);

    await user.click(screen.getByRole('button', { name: 'verify' }));

    expect(await screen.findByLabelText('Status wniosku')).toHaveValue('submitted');
    expect(api.getCurrentResponse).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Zapisz odpowiedź' })).not.toBeInTheDocument();
  });

  it('serializes session reconciliation after repeated restore failures', async () => {
    const user = userEvent.setup();
    const current = deferred<{ response: ResponseFormInput }>();
    api.restoreSession.mockRejectedValue(new Error('invalid recovery credential'));
    api.getCurrentResponse.mockReturnValue(current.promise);
    render(<HomePage initialRecoveryToken={'R'.repeat(43)} />);

    const verify = screen.getByRole('button', { name: 'verify' });
    await user.click(verify);
    await user.click(verify);

    expect(api.restoreSession).toHaveBeenCalledOnce();
    expect(api.getCurrentResponse).toHaveBeenCalledOnce();
    current.resolve({ response: currentResponse });
    expect(await screen.findByLabelText('Status wniosku')).toHaveValue('submitted');
  });

  it('enters create mode after cancel reconciliation returns 401', async () => {
    const user = userEvent.setup();
    api.restoreSession.mockRejectedValue(new Error('invalid recovery credential'));
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'internal'));
    render(<HomePage initialRecoveryToken={'R'.repeat(43)} />);

    await user.click(screen.getByRole('button', { name: 'verify' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Wróć do nowej ankiety' }));

    expect(await screen.findByText('Informacja o przetwarzaniu danych')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rozpocznij' })).toBeInTheDocument();
  });

  it('shows create mode only for a current-session 401', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'internal'));
    render(<HomePage initialRecoveryToken={null} />);

    expect(await screen.findByText('Informacja o przetwarzaniu danych')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mam kod dostępu' })).toBeInTheDocument();
    expect(screen.getByText('Statystyki pojawią się po zapisaniu ankiety.')).toBeInTheDocument();
  });

  it('surfaces non-401 startup failures safely instead of treating them as create mode', async () => {
    api.getCurrentResponse.mockRejectedValue(new Error('database connection details'));
    render(<HomePage initialRecoveryToken={null} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać danych. Spróbuj ponownie.');
    expect(screen.queryByText(/database connection details/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Informacja o przetwarzaniu danych')).not.toBeInTheDocument();
  });

  it('loads cookie-backed values and statistics in update mode', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    render(<HomePage initialRecoveryToken={null} />);

    expect(await screen.findByLabelText('Status wniosku')).toHaveValue('submitted');
    expect(screen.getByRole('button', { name: 'Zaktualizuj dane' })).toBeInTheDocument();
    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0);
  });

  it('creates with Turnstile, retains the credential until confirmation, then shows results', async () => {
    const user = userEvent.setup();
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'internal'));
    api.createResponse.mockResolvedValue({
      created: true,
      ...firstCredential,
      statistics: statistics(21),
    } satisfies CreateResponseResult);
    render(<HomePage initialRecoveryToken={null} />);

    await acceptPrivacyAndReachSummary(user);
    await user.click(screen.getByRole('button', { name: 'verify' }));
    await user.click(screen.getByRole('button', { name: 'Zapisz odpowiedź' }));

    expect(await screen.findByText(firstCredential.recoveryToken)).toBeInTheDocument();
    expect(screen.getAllByText('21').length).toBeGreaterThan(0);
    expect(screen.queryByText('Statystyki pojawią się po zapisaniu ankiety.')).not.toBeInTheDocument();
    expect(api.createResponse).toHaveBeenCalledWith({ response: expect.any(Object), turnstileToken: 'challenge-token' });
    await user.click(screen.getByRole('button', { name: 'Zapisałem kod dostępu' }));
    expect(screen.queryByText(firstCredential.recoveryToken)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zaktualizuj dane' })).toBeInTheDocument();
    expect(screen.getAllByText('21').length).toBeGreaterThan(0);
  });

  it('updates status without Turnstile', async () => {
    const user = userEvent.setup();
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.updateResponse.mockResolvedValue({ updated: true, statistics: statistics(31) });
    render(<HomePage initialRecoveryToken={null} />);

    await user.selectOptions(await screen.findByLabelText('Status wniosku'), 'formal_review_in_progress');
    expect(screen.queryByRole('button', { name: 'verify' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));

    await waitFor(() =>
      expect(api.updateResponse).toHaveBeenCalledWith({
        response: expect.objectContaining({ currentStatus: 'formal_review_in_progress' }),
      }),
    );
    expect((await screen.findAllByText('31')).length).toBeGreaterThan(0);
  });

  it('shows a rotated credential once and clears it on confirmation', async () => {
    const user = userEvent.setup();
    const rotated = { recoveryToken: 'B'.repeat(43), recoveryUrl: `http://localhost/#restore=${'B'.repeat(43)}` };
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.rotateRecovery.mockResolvedValue(rotated);
    render(<HomePage initialRecoveryToken={null} />);

    await screen.findAllByText('12');
    await user.click(screen.getByRole('button', { name: 'Wygeneruj nowy kod dostępu' }));
    expect(await screen.findByText(rotated.recoveryToken)).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.queryByText('Statystyki pojawią się po zapisaniu ankiety.')).not.toBeInTheDocument();
    expect(screen.getByText('Poprzedni kod i QR przestały działać.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zapisałem kod dostępu' }));
    expect(screen.queryByText(rotated.recoveryToken)).not.toBeInTheDocument();
  });

  it('does not render create until logout settles', async () => {
    const user = userEvent.setup();
    const pendingLogout = deferred<{ loggedOut: true }>();
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.logoutSession.mockReturnValue(pendingLogout.promise);
    render(<HomePage initialRecoveryToken={null} />);

    await user.click(await screen.findByRole('button', { name: 'Wyloguj to urządzenie' }));
    expect(screen.queryByLabelText('Status wniosku')).not.toBeInTheDocument();
    expect(screen.queryByText('Informacja o przetwarzaniu danych')).not.toBeInTheDocument();
    expect(screen.getByText('Wylogowywanie urządzenia…')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('region', { name: 'Twój wynik na tle innych zgłoszeń' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Wczytywanie statystyk' })).not.toBeInTheDocument();
    expect(screen.queryByText('Statystyki pojawią się po zapisaniu ankiety.')).not.toBeInTheDocument();

    pendingLogout.resolve({ loggedOut: true });
    expect(await screen.findByText('Informacja o przetwarzaniu danych')).toBeInTheDocument();
  });

  it('does not let a stale statistics refresh overwrite newer update statistics', async () => {
    const user = userEvent.setup();
    const oldStatistics = deferred<StatisticsResult>();
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockReturnValue(oldStatistics.promise);
    api.updateResponse.mockResolvedValue({ updated: true, statistics: statistics(44) });
    render(<HomePage initialRecoveryToken={null} />);

    await user.click(await screen.findByRole('button', { name: 'Zaktualizuj dane' }));
    expect((await screen.findAllByText('44')).length).toBeGreaterThan(0);
    oldStatistics.resolve(statistics(999));
    await waitFor(() => expect(screen.queryByText('999')).not.toBeInTheDocument());
    expect(screen.getAllByText('44').length).toBeGreaterThan(0);
  });

  it('hides restore navigation while create is pending', async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<CreateResponseResult>();
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'internal'));
    api.createResponse.mockReturnValue(pendingCreate.promise);
    render(<HomePage initialRecoveryToken={null} />);

    await acceptPrivacyAndReachSummary(user);
    await user.click(screen.getByRole('button', { name: 'verify' }));
    await user.click(screen.getByRole('button', { name: 'Zapisz odpowiedź' }));
    expect(screen.queryByRole('button', { name: 'Mam kod dostępu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisywanie…' })).toBeDisabled();

    pendingCreate.resolve({ created: true, ...firstCredential, statistics: statistics(21) });
    expect(await screen.findByText(firstCredential.recoveryToken)).toBeInTheDocument();
  });

  it('blocks update and logout while rotation owns the operation slot', async () => {
    const user = userEvent.setup();
    const pendingRotation = deferred<RecoveryCredential>();
    const rotated = { recoveryToken: 'B'.repeat(43), recoveryUrl: `http://localhost/#restore=${'B'.repeat(43)}` };
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.rotateRecovery.mockReturnValue(pendingRotation.promise);
    render(<HomePage initialRecoveryToken={null} />);

    await user.click(await screen.findByRole('button', { name: 'Wygeneruj nowy kod dostępu' }));
    expect(screen.getByRole('button', { name: 'Zaktualizuj dane' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wyloguj to urządzenie' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));
    await user.click(screen.getByRole('button', { name: 'Wyloguj to urządzenie' }));
    expect(api.updateResponse).not.toHaveBeenCalled();
    expect(api.logoutSession).not.toHaveBeenCalled();

    pendingRotation.resolve(rotated);
    expect(await screen.findByText(rotated.recoveryToken)).toBeInTheDocument();
  });

  it('preserves current status values through rotation confirmation', async () => {
    const user = userEvent.setup();
    const rotated = { recoveryToken: 'B'.repeat(43), recoveryUrl: `http://localhost/#restore=${'B'.repeat(43)}` };
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.rotateRecovery.mockResolvedValue(rotated);
    render(<HomePage initialRecoveryToken={null} />);

    await user.selectOptions(await screen.findByLabelText('Status wniosku'), 'formal_review_in_progress');
    await user.click(screen.getByRole('button', { name: 'Wygeneruj nowy kod dostępu' }));
    await user.click(await screen.findByRole('button', { name: 'Zapisałem kod dostępu' }));

    // After rotation confirmation, form reloads from saved current (not unsaved draft)
    expect(screen.getByLabelText('Status wniosku')).toHaveValue('submitted');
  });

  it('shows statistics loading and error without suppression copy', async () => {
    const pendingStatistics = deferred<StatisticsResult>();
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockReturnValue(pendingStatistics.promise);
    render(<HomePage initialRecoveryToken={null} />);

    expect(await screen.findByRole('status', { name: 'Wczytywanie statystyk' })).toBeInTheDocument();
    expect(screen.queryByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).not.toBeInTheDocument();
    pendingStatistics.reject(new Error('unavailable'));
    expect(await screen.findByRole('alert', { name: 'Błąd statystyk' })).toBeInTheDocument();
    expect(screen.queryByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).not.toBeInTheDocument();
  });

  it('restarts invalidated statistics loading when rotation fails', async () => {
    const user = userEvent.setup();
    const oldStatistics = deferred<StatisticsResult>();
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics
      .mockReturnValueOnce(oldStatistics.promise)
      .mockResolvedValueOnce(statistics(55));
    api.rotateRecovery.mockRejectedValue(new Error('rotation failed'));
    render(<HomePage initialRecoveryToken={null} />);

    await user.click(await screen.findByRole('button', { name: 'Wygeneruj nowy kod dostępu' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wykonać tej operacji.');
    expect((await screen.findAllByText('55')).length).toBeGreaterThan(0);
    expect(api.getStatistics).toHaveBeenCalledTimes(2);
  });

  it('shows explicit statistics loading during startup session resolution', () => {
    api.getCurrentResponse.mockReturnValue(new Promise(() => undefined));
    render(<HomePage initialRecoveryToken={null} />);

    expect(screen.getByRole('status', { name: 'Wczytywanie statystyk' })).toBeInTheDocument();
    expect(screen.queryByText('Statystyki pojawią się po zapisaniu ankiety.')).not.toBeInTheDocument();
  });

  it('opens the gated edit-profile form from the status update view', async () => {
    const user = userEvent.setup();
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    render(<HomePage initialRecoveryToken={null} />);

    await user.click(await screen.findByRole('button', { name: 'Edytuj dane profilu' }));
    expect(screen.getByText(/Zmiana tych danych wpłynie na Twoją grupę statystyczną/)).toBeInTheDocument();
    expect(screen.getByLabelText('Kraj obywatelstwa (do grupy statystycznej)')).toHaveValue('Ukraina');
    await user.click(screen.getByRole('button', { name: 'Anuluj edycję' }));
    expect(screen.getByLabelText('Status wniosku')).toBeInTheDocument();
  });
});
