import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateResponseResult, ResponseFormInput, StatisticsResult } from '../../shared/contracts';
import { emptyCountryContext, emptyGlobalBenchmark } from '../../shared/test-statistics';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { ApiClientError } from '../lib/api-client';
import type { TelegramWebAppBridge } from '../lib/telegram';
import { HomePage } from './HomePage';

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
}));

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  ...api,
}));

const currentResponse: ResponseFormInput = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
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
    gradesScore: null,
    polishSchoolBonus: null,
    trackWideMedian: null,
    scoreBuckets: null,
    cohortScores: null,
    growth7d: null,
    history: [],
    groupProgress: null,
    reportedMeritOutcomes: null,
    globalBenchmark: emptyGlobalBenchmark,
    countryContext: emptyCountryContext,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');

  const telegram = await import('../lib/telegram');
  vi.mocked(telegram.getTelegramWebApp).mockReturnValue(telegramTestState.webApp);
});

async function clickMain(user: ReturnType<typeof userEvent.setup>) {
  const buttons = await screen.findAllByRole('button', {
    name: /Zobacz mój wynik|Dalej|Zapisz odpowiedź/,
  });
  const button =
    buttons.find((candidate) => !(candidate as HTMLButtonElement).disabled) ?? buttons[buttons.length - 1];
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

async function pickSearchableOption(
  user: ReturnType<typeof userEvent.setup>,
  fieldLabel: string,
  optionName: string | RegExp,
) {
  await user.click(screen.getByLabelText(fieldLabel));
  await user.click(screen.getByRole('option', { name: optionName }));
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
    expect(await screen.findByText('Gdzie jesteś wśród kandydatów NAWA?')).toBeInTheDocument();
  });

  it('loads an authenticated profile and statistics', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockResolvedValue(statistics(12));
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Status wniosku')).toBeInTheDocument();
      expect(screen.getAllByText('Wniosek złożony').length).toBeGreaterThanOrEqual(1);
    });
    expect(api.getStatistics).toHaveBeenCalled();
  });

  it('creates a profile through the wizard flow', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));
    const createResult: CreateResponseResult = {
      created: true,
      statistics: statistics(12),
    };
    api.createResponse.mockResolvedValue(createResult);

    const user = userEvent.setup();
    render(<HomePage />);

    await screen.findByText('Gdzie jesteś wśród kandydatów NAWA?');
    await clickMain(user);

    for (let step = 0; step < 3; step += 1) {
      if (screen.queryByLabelText('Gdzie marzysz o studiach?')) {
        await pickSearchableOption(user, 'Gdzie marzysz o studiach?', /Uniwersytet Warszawski/i);
      }
      if (screen.queryByLabelText('Kraj obywatelstwa')) {
        await pickSearchableOption(user, 'Kraj obywatelstwa', 'Ukraina');
        await pickSearchableOption(user, 'W jakim kraju ukończyłeś/aś szkołę średnią?', 'Ukraina');
      }
      if (screen.queryByLabelText('Średnia ocen')) {
        const maximum = screen.getByLabelText('Maksymalna ocena w Twojej skali');
        if (!(maximum as HTMLInputElement).readOnly) {
          await user.clear(maximum);
          await user.type(maximum, '5');
        }
        await user.type(screen.getByLabelText('Średnia ocen'), '4.5');
      }
      await clickMain(user);
    }

    await waitFor(() => {
      expect(screen.getByText('Podsumowanie')).toBeInTheDocument();
    });
    await clickMain(user);

    await waitFor(() => {
      expect(api.createResponse).toHaveBeenCalled();
      expect(screen.getByText('Status wniosku')).toBeInTheDocument();
      expect(screen.getAllByText('Wniosek złożony').length).toBeGreaterThanOrEqual(1);
    });
  });
});
