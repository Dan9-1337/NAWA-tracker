import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateResponseResult, ResponseFormInput, StatisticsResult } from '../../shared/contracts';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { pl } from '../i18n/pl';
import { ApiClientError } from '../lib/api-client';
import { DRAFT_STORAGE_KEY_PREFIX, type WizardDraft } from '../lib/draft';
import { formatClockTime, formatDate } from '../lib/format';
import { trackProductEvent } from '../lib/product-events';
import type { TelegramWebAppBridge } from '../lib/telegram';
import { HomePage } from './HomePage';

/** jsdom renders the full country list, so keep generous timeouts for slower CI machines. */
const UI_TIMEOUT = 15_000;
const TEST_TIMEOUT = 40_000;

const telegramTestState = vi.hoisted(() => ({
  webApp: null as TelegramWebAppBridge | null,
  initData: 'user=%7B%22id%22%3A900000001%7D',
}));

vi.mock('../lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/telegram')>();
  telegramTestState.webApp = actual.createDevTelegramWebApp(telegramTestState.initData);
  return {
    ...actual,
    initializeTelegramWebApp: vi.fn(),
    getTelegramInitData: vi.fn(() => 'signed-init-data'),
    getTelegramWebApp: vi.fn(() => telegramTestState.webApp),
  };
});

const api = vi.hoisted(() => ({
  createResponse: vi.fn(),
  updateResponse: vi.fn(),
  deleteResponse: vi.fn(),
  getCurrentResponse: vi.fn(),
  getStatistics: vi.fn(),
  getCohortOutcomes: vi.fn(),
  getIntakeSummary: vi.fn(),
}));

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  ...api,
}));

vi.mock('../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

const trackedEvents = vi.mocked(trackProductEvent);

function countTracked(name: string): number {
  return trackedEvents.mock.calls.filter(([event]) => event.name === name).length;
}

const currentResponse: ResponseFormInput = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
  studyField: '0613',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
};

function statistics(totalValidResponses: number): StatisticsResult {
  return {
    detailsAvailable: false,
    totalValidResponses,
    sameTrackCount: totalValidResponses,
    sameCountryCount: 0,
    groupResponseCount: 0,
    medianScore: null,
    lowerScorePercentage: null,
    rankPosition: null,
    rankTotal: null,
    trackWideMedian: null,
    scoreBuckets: null,
    cohortScope: null,
    cohortGroupId: null,
  };
}

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The server's answer for an account without a survey (task 062); a 401 now means the session expired. */
function notFound() {
  return new ApiClientError(404, 'PROFILE_NOT_FOUND', 'No survey was found for this Telegram account.');
}

function unauthorized() {
  return new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized');
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');

  const telegram = await import('../lib/telegram');
  vi.mocked(telegram.getTelegramWebApp).mockReturnValue(telegramTestState.webApp);
  api.getCohortOutcomes.mockResolvedValue({
    ownCountry: 'UA',
    scope: null,
    groupId: null,
    awardedCount: 0,
    notAwardedCount: 0,
    awardedRate: null,
    awardedBandLow: null,
    awardedBandHigh: null,
    notAwardedBandHigh: null,
  });
  // The landing counter is another task's feature; keep it from hitting the network in these tests.
  api.getIntakeSummary.mockResolvedValue({ intakeYear: 2026, responseCount: 12 });
});

async function clickMain(user: ReturnType<typeof userEvent.setup>) {
  const buttons = await screen.findAllByRole(
    'button',
    { name: /Zobacz mój wynik|Dalej|Zapisz ankietę|Zaktualizuj ankietę|Zapisz i zmień grupę/ },
    { timeout: UI_TIMEOUT },
  );
  const button =
    buttons.find((candidate) => !(candidate as HTMLButtonElement).disabled) ?? buttons[buttons.length - 1];
  await waitFor(() => expect(button).toBeEnabled(), { timeout: UI_TIMEOUT });
  await user.click(button);
}

async function pickSearchableOption(
  user: ReturnType<typeof userEvent.setup>,
  fieldLabel: string,
  optionName: string | RegExp,
) {
  await user.click(await screen.findByRole('button', { name: fieldLabel }, { timeout: UI_TIMEOUT }));
  await user.click(await screen.findByRole('option', { name: optionName }, { timeout: UI_TIMEOUT }));
}

const seededDraft: WizardDraft = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: '',
  studyField: '',
  prepCourseCity: '',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: 9.5,
  maximumGrade: 12,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
};

/** Creates a new user, starts the wizard, fills education and stops on the grades step. */
async function openCreateGradesStep() {
  api.getCurrentResponse.mockRejectedValue(notFound());
  const user = userEvent.setup();
  render(<HomePage />);

  await screen.findByText(pl.start.title, {}, { timeout: UI_TIMEOUT });
  await clickMain(user);

  await pickSearchableOption(user, pl.labels.rankingCountry, 'Ukraina');
  await pickSearchableOption(user, pl.labels.schoolCountry, 'Ukraina');
  await clickMain(user);

  await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
  return user;
}

describe('HomePage', () => {
  it('shows the Telegram gate outside WebView', async () => {
    const telegram = await import('../lib/telegram');
    vi.mocked(telegram.getTelegramWebApp).mockReturnValue(null);
    render(<HomePage />);
    expect(screen.getByRole('link', { name: 'Otwórz w Telegramie' })).toBeInTheDocument();
  });

  it('shows a skeleton with the loading status while the current survey is pending', async () => {
    api.getCurrentResponse.mockReturnValueOnce(new Promise(() => {}));
    render(<HomePage />);

    const status = screen.getByRole('status', { name: pl.home.loading });
    expect(status.querySelectorAll('[aria-hidden="true"].skeleton-block').length).toBeGreaterThan(0);
  });

  it('shows the load error alert and hint when the current survey request fails', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(500, 'SERVER_ERROR', 'boom'));
    render(<HomePage />);

    const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
    expect(alert).toHaveTextContent(pl.home.loadError);
    expect(alert).toHaveTextContent(pl.home.loadErrorHint);
    expect(screen.queryByRole('status', { name: pl.home.loading })).not.toBeInTheDocument();
  });

  it('opens create mode with start screen when no profile exists', async () => {
    api.getCurrentResponse.mockRejectedValue(notFound());
    render(<HomePage />);
    expect(await screen.findByText(pl.start.title)).toBeInTheDocument();
  });

  it(
    'records wizard_education_completed once when a valid education step opens grades',
    async () => {
      const user = await openCreateGradesStep();

      expect(countTracked('wizard_education_completed')).toBe(1);

      await user.click(await screen.findByRole('button', { name: `← ${pl.settings.back}` }, { timeout: UI_TIMEOUT }));
      expect(
        await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      await clickMain(user);

      expect(
        await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      expect(countTracked('wizard_education_completed')).toBe(1);
    },
    TEST_TIMEOUT,
  );

  it(
    'records no wizard_education_completed while the education step is invalid',
    async () => {
      api.getCurrentResponse.mockRejectedValue(notFound());
      const user = userEvent.setup();
      render(<HomePage />);

      await screen.findByText(pl.start.title, {}, { timeout: UI_TIMEOUT });
      await clickMain(user);

      const next = await screen.findByRole('button', { name: pl.wizard.next }, { timeout: UI_TIMEOUT });
      expect(next).toBeDisabled();
      await user.click(next);

      expect(countTracked('wizard_education_completed')).toBe(0);
      expect(screen.queryByLabelText(pl.labels.averageGrade)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'resumes on grades without wizard_education_completed and counts the save as wizard_completed',
    async () => {
      const telegram = await import('../lib/telegram');
      const userId = telegram.getTelegramUserId() ?? 'anon';
      localStorage.setItem(
        `${DRAFT_STORAGE_KEY_PREFIX}:${userId}`,
        JSON.stringify({ version: 2, draft: seededDraft, screen: 'confirm', stepIndex: 0 }),
      );
      api.getCurrentResponse.mockRejectedValue(notFound());
      api.createResponse.mockResolvedValue({ created: true, statistics: statistics(12) });

      const user = userEvent.setup();
      render(<HomePage />);

      expect(await screen.findByText(pl.start.resumeTitle, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: pl.start.resumeContinue }));
      await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });

      expect(countTracked('wizard_education_completed')).toBe(0);
      await clickMain(user);

      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(countTracked('wizard_completed')).toBe(1);
      expect(countTracked('wizard_education_completed')).toBe(0);
    },
    TEST_TIMEOUT,
  );

  it(
    'resumes a session saved on the removed confirm screen on the grades step',
    async () => {
      const telegram = await import('../lib/telegram');
      const userId = telegram.getTelegramUserId() ?? 'anon';
      localStorage.setItem(
        `${DRAFT_STORAGE_KEY_PREFIX}:${userId}`,
        JSON.stringify({ version: 2, draft: seededDraft, screen: 'confirm', stepIndex: 0 }),
      );
      api.getCurrentResponse.mockRejectedValue(notFound());

      const user = userEvent.setup();
      render(<HomePage />);

      expect(await screen.findByText(pl.start.resumeTitle, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: pl.start.resumeContinue }));

      expect(
        await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT }),
      ).toHaveValue('9,5');
      // The draft is intact and the session resumes on grades, not on a summary screen.
      expect(screen.queryByText(pl.wizard.summaryTitle)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it('loads an authenticated profile and statistics', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockResolvedValue(statistics(12));
    render(<HomePage />);

    expect(await screen.findByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(api.getStatistics).toHaveBeenCalled();
  });

  it('previews a different average on the tape without saving it or moving the saved result', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockResolvedValue(statistics(12));
    const user = userEvent.setup();
    render(<HomePage />);

    expect(await screen.findByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,00');

    await user.click(screen.getByRole('button', { name: 'Zwiększ średnią' }));
    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByText('Zapisany wynik: 81,00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Wróć do zapisanej' }));
    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(api.updateResponse).not.toHaveBeenCalled();
  });

  it('accepts a typed average and rejects values outside the scale', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockResolvedValue(statistics(12));
    const user = userEvent.setup();
    render(<HomePage />);
    await screen.findByTestId('saved-score-value');

    const input = screen.getByLabelText('Średnia do symulacji');
    await user.clear(input);
    await user.type(input, '4,2');
    expect(input).toHaveValue('4,2');
    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('75,60');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');

    await user.clear(input);
    await user.type(input, '7');
    expect(screen.getByRole('alert')).toHaveTextContent('Wpisz liczbę od 0 do 5');
  });

  it(
    'saves a new profile directly from the grades step without a summary screen',
    async () => {
      const createResult: CreateResponseResult = {
        created: true,
        statistics: statistics(12),
      };
      api.createResponse.mockResolvedValue(createResult);
      const user = await openCreateGradesStep();

      // The grades step is the last one: its MainButton saves instead of advancing.
      const save = await screen.findByRole('button', { name: pl.form.submitCreate }, { timeout: UI_TIMEOUT });
      expect(save).toBeDisabled();
      await waitFor(
        () => expect(screen.queryByRole('button', { name: pl.wizard.next })).not.toBeInTheDocument(),
        { timeout: UI_TIMEOUT },
      );

      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');

      await waitFor(() => expect(save).toBeEnabled(), { timeout: UI_TIMEOUT });
      expect(screen.queryByText(pl.wizard.summaryTitle)).not.toBeInTheDocument();

      await clickMain(user);

      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByText(pl.wizard.summaryTitle)).not.toBeInTheDocument();

      // The wizard no longer asks for a university or a field; the server contract gets neutral defaults.
      const [{ response: saved }] = api.createResponse.mock.calls[0];
      expect(saved).not.toHaveProperty('targetUniversity');
      expect(saved).toMatchObject({
        studyField: 'other',
        currentStatus: 'submitted',
        studyRoute: 'direct_studies',
        averageGrade: 4.5,
      });
    },
    TEST_TIMEOUT,
  );

  it(
    'saves a new survey with the intake year the server reported, not one from the code (ADR 0018)',
    async () => {
      api.getIntakeSummary.mockResolvedValue({ intakeYear: 2027, responseCount: null });
      api.createResponse.mockResolvedValue({ created: true, statistics: statistics(12) } satisfies CreateResponseResult);
      const user = await openCreateGradesStep();

      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');
      await clickMain(user);

      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      const [{ response: saved }] = api.createResponse.mock.calls[0];
      expect(saved.intakeYear).toBe(2027);
    },
    TEST_TIMEOUT,
  );

  it(
    'never sends a save before the year is known: a failed year lookup shows the save error and the button retries it',
    async () => {
      api.getIntakeSummary.mockRejectedValue(new Error('offline'));
      api.createResponse.mockResolvedValue({ created: true, statistics: statistics(12) } satisfies CreateResponseResult);
      const user = await openCreateGradesStep();

      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');
      await clickMain(user);

      expect(await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT })).toHaveTextContent(pl.form.saveError);
      expect(api.createResponse).not.toHaveBeenCalled();

      api.getIntakeSummary.mockResolvedValue({ intakeYear: 2027, responseCount: null });
      await clickMain(user);

      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(api.createResponse.mock.calls[0][0].response.intakeYear).toBe(2027);
    },
    TEST_TIMEOUT,
  );

  it(
    'keeps the save button disabled on grades while the average is empty or above the scale',
    async () => {
      const user = await openCreateGradesStep();

      const save = await screen.findByRole('button', { name: pl.form.submitCreate }, { timeout: UI_TIMEOUT });
      expect(save).toBeDisabled();

      await user.type(screen.getByLabelText(pl.labels.averageGrade), '20');

      expect(save).toBeDisabled();
      expect(api.createResponse).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );

  it(
    'stays on the grades step with the values intact when the create request fails, then retries',
    async () => {
      api.createResponse
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue({ created: true, statistics: statistics(12) } satisfies CreateResponseResult);
      const user = await openCreateGradesStep();

      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');
      await clickMain(user);

      const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
      expect(alert).toHaveTextContent(pl.form.saveError);
      expect(alert).toHaveTextContent(pl.form.saveErrorDraft);
      expect(screen.getByLabelText(pl.labels.averageGrade)).toHaveValue('4,5');
      expect(api.createResponse).toHaveBeenCalledTimes(1);

      await clickMain(user);

      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(2), { timeout: UI_TIMEOUT });
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'walks back from grades to education and to the start screen',
    async () => {
      const user = await openCreateGradesStep();

      await user.click(await screen.findByRole('button', { name: `← ${pl.settings.back}` }, { timeout: UI_TIMEOUT }));
      expect(
        await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();

      await user.click(await screen.findByRole('button', { name: `← ${pl.settings.back}` }, { timeout: UI_TIMEOUT }));
      expect(await screen.findByText(pl.start.title, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'updates the average from the grades step of the edit wizard',
    async () => {
      api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
      api.getStatistics.mockResolvedValue(statistics(12));
      api.updateResponse.mockResolvedValue({ updated: true, statistics: statistics(12) });

      const user = userEvent.setup();
      render(<HomePage />);
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });

      // A dashboard profile row opens the wizard on its own step.
      await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
      const average = await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
      await user.clear(average);
      await user.type(average, '4,8');

      const save = await screen.findByRole('button', { name: pl.form.submitUpdate }, { timeout: UI_TIMEOUT });
      await waitFor(() => expect(save).toBeEnabled(), { timeout: UI_TIMEOUT });

      await clickMain(user);

      await waitFor(() => expect(api.updateResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(api.updateResponse.mock.calls[0]![0].response).toMatchObject({
        averageGrade: 4.8,
        rankingCountry: 'UA',
      });
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.getByText(new RegExp(pl.form.saved))).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'shows the localized score-change limit and keeps the edit values when an edit is blocked',
    async () => {
      const retry = new Date();
      retry.setHours(23, 59, 0, 0);
      const retryAt = retry.toISOString();

      api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
      api.getStatistics.mockResolvedValue(statistics(12));
      api.updateResponse.mockRejectedValue(
        new ApiClientError(429, 'EDIT_LIMIT_REACHED', 'Too many score changes.', retryAt),
      );

      const user = userEvent.setup();
      render(<HomePage />);
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });

      await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
      const average = await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
      await user.clear(average);
      await user.type(average, '4,8');

      const save = await screen.findByRole('button', { name: pl.form.submitUpdate }, { timeout: UI_TIMEOUT });
      await waitFor(() => expect(save).toBeEnabled(), { timeout: UI_TIMEOUT });
      await clickMain(user);

      const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
      expect(alert).toHaveTextContent(pl.form.editLimitToday(formatClockTime(retryAt, 'pl')));
      expect(screen.getByLabelText(pl.labels.averageGrade)).toHaveValue('4,8');
      expect(countTracked('survey_updated')).toBe(0);
      expect(api.updateResponse).toHaveBeenCalledTimes(1);
    },
    TEST_TIMEOUT,
  );

  it(
    'includes the date in the score-change limit when the retry time is not today',
    async () => {
      const retry = new Date();
      retry.setDate(retry.getDate() + 1);
      retry.setHours(9, 30, 0, 0);
      const retryAt = retry.toISOString();

      api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
      api.getStatistics.mockResolvedValue(statistics(12));
      api.updateResponse.mockRejectedValue(
        new ApiClientError(429, 'EDIT_LIMIT_REACHED', 'Too many score changes.', retryAt),
      );

      const user = userEvent.setup();
      render(<HomePage />);
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });

      await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
      const average = await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
      await user.clear(average);
      await user.type(average, '4,8');

      const save = await screen.findByRole('button', { name: pl.form.submitUpdate }, { timeout: UI_TIMEOUT });
      await waitFor(() => expect(save).toBeEnabled(), { timeout: UI_TIMEOUT });
      await clickMain(user);

      const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
      expect(alert).toHaveTextContent(
        pl.form.editLimitDate(`${formatDate(localIsoDate(retry), 'pl')}, ${formatClockTime(retryAt, 'pl')}`),
      );
    },
    TEST_TIMEOUT,
  );

  it(
    'shows the score-change limit when a re-create is blocked and keeps the draft on the device',
    async () => {
      const retry = new Date();
      retry.setHours(23, 59, 0, 0);
      const retryAt = retry.toISOString();

      api.createResponse.mockRejectedValue(
        new ApiClientError(429, 'EDIT_LIMIT_REACHED', 'Too many score changes.', retryAt),
      );

      const user = await openCreateGradesStep();
      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');
      await clickMain(user);

      const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
      expect(alert).toHaveTextContent(pl.form.editLimitToday(formatClockTime(retryAt, 'pl')));
      expect(screen.getByLabelText(pl.labels.averageGrade)).toHaveValue('4,5');
      expect(countTracked('wizard_completed')).toBe(0);
      expect(api.createResponse).toHaveBeenCalledTimes(1);

      const telegram = await import('../lib/telegram');
      const userId = telegram.getTelegramUserId() ?? 'anon';
      const stored = JSON.parse(
        localStorage.getItem(`${DRAFT_STORAGE_KEY_PREFIX}:${userId}`) ?? 'null',
      ) as { draft?: { averageGrade?: number } } | null;
      expect(stored?.draft?.averageGrade).toBe(4.5);
    },
    TEST_TIMEOUT,
  );
});

function wizardDraftKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '').filter((key) =>
    key.startsWith(`${DRAFT_STORAGE_KEY_PREFIX}:`),
  );
}

function appScrollContainer(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-app-scroll]')!;
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: pl.settings.open }, { timeout: UI_TIMEOUT }));
}

/** Settings -> "edit the survey": the request that bumps `editRequestNonce`. */
async function openEditFromSettings(user: ReturnType<typeof userEvent.setup>) {
  await openSettings(user);
  await user.click(await screen.findByRole('button', { name: pl.settings.editProfile }, { timeout: UI_TIMEOUT }));
  await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT });
}

/** From education (step 1) of the edit wizard to a saved survey. */
async function saveEditFromFirstStep(user: ReturnType<typeof userEvent.setup>) {
  await clickMain(user);
  await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
  await clickMain(user);
}

async function renderReturningUser() {
  api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
  api.getStatistics.mockResolvedValue(statistics(12));
  // A real request settles in a later task than the click, not in the same microtask run.
  api.updateResponse.mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ updated: true, statistics: statistics(12) }), 20);
      }),
  );
  const user = userEvent.setup();
  const view = render(<HomePage />);
  await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });
  return { user, view };
}

describe('HomePage save flow returns to the dashboard', () => {
  it(
    'shows the dashboard at its top with the saved line after an edit opened from Settings, then opens the wizard again on request',
    async () => {
      const { user } = await renderReturningUser();
      await openEditFromSettings(user);
      appScrollContainer().scrollTop = 400;

      await saveEditFromFirstStep(user);

      await waitFor(() => expect(api.updateResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(await screen.findByText(new RegExp(pl.form.saved), {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.getByTestId('saved-score-value')).toBeInTheDocument();
      expect(screen.queryByLabelText(pl.labels.averageGrade)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: pl.form.submitUpdate })).not.toBeInTheDocument();
      expect(appScrollContainer().scrollTop).toBe(0);

      // One request opens the wizard once: it stays on screen after the next renders.
      await openEditFromSettings(user);
      expect(screen.queryByTestId('saved-score-value')).not.toBeInTheDocument();
      await clickMain(user);
      expect(await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByTestId('saved-score-value')).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'shows the new survey dashboard at its top after Settings edit, delete and create in one session',
    async () => {
      api.deleteResponse.mockResolvedValue(undefined);
      api.createResponse.mockResolvedValue({ created: true, statistics: statistics(12) });
      const { user } = await renderReturningUser();
      await openEditFromSettings(user);
      await saveEditFromFirstStep(user);
      await screen.findByText(new RegExp(pl.form.saved), {}, { timeout: UI_TIMEOUT });

      await openSettings(user);
      await user.click(await screen.findByRole('button', { name: pl.settings.viewData }));
      await user.click(await screen.findByRole('button', { name: pl.settings.deleteData }));
      await user.click(await screen.findByRole('button', { name: pl.form.deleteConfirmPermanent }));
      await screen.findByText(pl.start.title, {}, { timeout: UI_TIMEOUT });

      await clickMain(user);
      await pickSearchableOption(user, pl.labels.rankingCountry, 'Ukraina');
      await pickSearchableOption(user, pl.labels.schoolCountry, 'Ukraina');
      await clickMain(user);
      await user.type(await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT }), '4.5');
      appScrollContainer().scrollTop = 400;
      await clickMain(user);

      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByLabelText(pl.labels.averageGrade)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: pl.form.submitCreate })).not.toBeInTheDocument();
      expect(appScrollContainer().scrollTop).toBe(0);
    },
    TEST_TIMEOUT,
  );

  it(
    'leaves no wizard draft after an edit is saved or left with Back',
    async () => {
      const { user } = await renderReturningUser();

      await openEditFromSettings(user);
      await saveEditFromFirstStep(user);
      await screen.findByText(new RegExp(pl.form.saved), {}, { timeout: UI_TIMEOUT });
      expect(wizardDraftKeys()).toEqual([]);

      await openEditFromSettings(user);
      await user.click(await screen.findByRole('button', { name: `← ${pl.settings.back}` }, { timeout: UI_TIMEOUT }));
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(wizardDraftKeys()).toEqual([]);
    },
    TEST_TIMEOUT,
  );

  it(
    'does not offer an interrupted edit as saved progress once the survey is gone',
    async () => {
      const { user, view } = await renderReturningUser();
      await openEditFromSettings(user);
      view.unmount();

      api.getCurrentResponse.mockRejectedValue(notFound());
      render(<HomePage />);

      expect(await screen.findByText(pl.start.title, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByText(pl.start.resumeTitle)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'brings the save error into view once when a create fails',
    async () => {
      const scrollIntoView = vi.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoView;
      try {
        api.createResponse.mockRejectedValue(new Error('offline'));
        const user = await openCreateGradesStep();
        await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');
        await clickMain(user);

        const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(alert);
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    },
    TEST_TIMEOUT,
  );
});

describe('HomePage new-survey wizard product events for validation and save errors', () => {
  it(
    'records the average-above-maximum error once however often it reappears (A1)',
    async () => {
      const user = await openCreateGradesStep();
      const average = screen.getByLabelText(pl.labels.averageGrade);

      await user.type(average, '13');
      expect(await screen.findByText(pl.wizard.averageAboveMaximum, { selector: '[role="alert"]' })).toBeInTheDocument();
      expect(countTracked('wizard_average_above_maximum_shown')).toBe(1);

      await user.clear(average);
      await user.type(average, '14');
      await user.clear(average);
      await user.type(average, '15');
      expect(screen.getByText(pl.wizard.averageAboveMaximum, { selector: '[role="alert"]' })).toBeInTheDocument();
      expect(countTracked('wizard_average_above_maximum_shown')).toBe(1);
      expect(countTracked('wizard_low_score_warning_shown')).toBe(0);
    },
    TEST_TIMEOUT,
  );

  it(
    'records the low-score warning once when it becomes visible twice (A2)',
    async () => {
      const user = await openCreateGradesStep();
      const average = screen.getByLabelText(pl.labels.averageGrade);
      const lowScoreNotice = () => screen.queryByText(/poniżej progu 60/);

      await user.type(average, '3,2');
      expect(countTracked('wizard_low_score_warning_shown')).toBe(0);
      await user.tab();
      expect(lowScoreNotice()).toBeInTheDocument();
      expect(countTracked('wizard_low_score_warning_shown')).toBe(1);

      await user.clear(average);
      await user.type(average, '10');
      expect(lowScoreNotice()).not.toBeInTheDocument();

      await user.clear(average);
      await user.type(average, '3,2');
      expect(lowScoreNotice()).toBeInTheDocument();
      expect(countTracked('wizard_low_score_warning_shown')).toBe(1);
      expect(countTracked('wizard_average_above_maximum_shown')).toBe(0);
    },
    TEST_TIMEOUT,
  );

  it(
    'records wizard_save_failed once per failed save and wizard_completed on none of them (A3)',
    async () => {
      api.createResponse
        .mockRejectedValueOnce(new ApiClientError(500, 'INTERNAL_ERROR', 'boom'))
        .mockRejectedValueOnce(new ApiClientError(429, 'SCORE_CHANGE_LIMIT', 'limit'));
      const user = await openCreateGradesStep();
      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');

      await clickMain(user);
      await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
      expect(api.createResponse).toHaveBeenCalledTimes(1);
      expect(countTracked('wizard_save_failed')).toBe(1);

      await clickMain(user);
      await waitFor(() => expect(api.createResponse).toHaveBeenCalledTimes(2), { timeout: UI_TIMEOUT });
      await waitFor(() => expect(countTracked('wizard_save_failed')).toBe(2), { timeout: UI_TIMEOUT });
      expect(countTracked('wizard_completed')).toBe(0);
    },
    TEST_TIMEOUT,
  );
});

describe('HomePage session and duplicate-create handling (task 062)', () => {
  it('opens the start screen on 404 PROFILE_NOT_FOUND (A3)', async () => {
    api.getCurrentResponse.mockRejectedValue(notFound());
    render(<HomePage />);

    expect(await screen.findByText(pl.start.title, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
    expect(screen.queryByText(pl.home.sessionExpired)).not.toBeInTheDocument();
  });

  it('shows the session-expired state on a 401 load, not the wizard, and reloads on the button (A4)', async () => {
    api.getCurrentResponse.mockRejectedValue(unauthorized());
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    try {
      const user = userEvent.setup();
      render(<HomePage />);

      const alert = await screen.findByRole('alert', {}, { timeout: UI_TIMEOUT });
      expect(alert).toHaveTextContent(pl.home.sessionExpired);
      expect(screen.queryByText(pl.start.title)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: pl.settings.open })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: pl.home.sessionExpiredAction }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it(
    'loads the saved survey and clears the draft when create returns 409 PROFILE_EXISTS (A5)',
    async () => {
      api.getCurrentResponse.mockRejectedValueOnce(notFound());
      api.createResponse.mockRejectedValue(new ApiClientError(409, 'PROFILE_EXISTS', 'exists'));
      api.getStatistics.mockResolvedValue(statistics(12));
      const user = await openCreateGradesStep();
      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');
      api.getCurrentResponse.mockResolvedValue({ response: currentResponse });

      await clickMain(user);

      expect(await screen.findByText(pl.home.alreadySaved, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(api.createResponse).toHaveBeenCalledTimes(1);
      expect(
        Object.keys(localStorage).filter((key) => key.startsWith(DRAFT_STORAGE_KEY_PREFIX)),
      ).toEqual([]);
    },
    TEST_TIMEOUT,
  );

  it(
    'shows the session-expired state, not the save error, when create returns 401 (A6)',
    async () => {
      api.createResponse.mockRejectedValue(unauthorized());
      const user = await openCreateGradesStep();
      await user.type(screen.getByLabelText(pl.labels.averageGrade), '4.5');

      await clickMain(user);

      expect(await screen.findByText(pl.home.sessionExpired, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByText(pl.form.saveError)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'shows the session-expired state, not the action error, when update returns 401 (A6)',
    async () => {
      const { user } = await renderReturningUser();
      api.updateResponse.mockRejectedValue(unauthorized());
      await openEditFromSettings(user);

      await saveEditFromFirstStep(user);

      expect(await screen.findByText(pl.home.sessionExpired, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByText(pl.home.actionError)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});
