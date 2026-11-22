import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateResponseResult, ResponseFormInput, StatisticsResult } from '../../shared/contracts';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { pl } from '../i18n/pl';
import { ApiClientError } from '../lib/api-client';
import { DRAFT_STORAGE_KEY_PREFIX, type WizardDraft } from '../lib/draft';
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
    sameCountryCount: null,
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
    { name: /Zobacz mój wynik|Dalej|Zapisz odpowiedź|Zaktualizuj dane|Zapisz i zmień grupę/ },
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
  api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));
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

  it('opens create mode with start screen when no profile exists', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));
    render(<HomePage />);
    expect(await screen.findByText(pl.start.title)).toBeInTheDocument();
  });

  it(
    'resumes a session saved on the removed confirm screen on the grades step',
    async () => {
      const telegram = await import('../lib/telegram');
      const userId = telegram.getTelegramUserId() ?? 'anon';
      localStorage.setItem(
        `${DRAFT_STORAGE_KEY_PREFIX}:${userId}`,
        JSON.stringify({ version: 2, draft: seededDraft, screen: 'confirm', stepIndex: 0 }),
      );
      api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));

      const user = userEvent.setup();
      render(<HomePage />);

      expect(await screen.findByText(pl.start.resumeTitle, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: pl.start.resumeContinue }));

      expect(
        await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT }),
      ).toHaveValue('9.5');
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
    expect(screen.queryByTestId('what-if-score-value')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zwiększ średnią' }));
    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByText('Zapisany wynik: 81,00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Wróć do zapisanej' }));
    expect(screen.queryByTestId('what-if-score-value')).not.toBeInTheDocument();
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
      expect(screen.getByLabelText(pl.labels.averageGrade)).toHaveValue('4.5');
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

      await user.click(await screen.findByRole('button', { name: '← Back' }, { timeout: UI_TIMEOUT }));
      expect(
        await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();

      await user.click(await screen.findByRole('button', { name: '← Back' }, { timeout: UI_TIMEOUT }));
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
});
