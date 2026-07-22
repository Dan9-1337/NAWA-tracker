import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateResponseResult, ResponseFormInput, StatisticsResult } from '../../shared/contracts';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { ApiClientError } from '../lib/api-client';
import { HomePage } from './HomePage';

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

vi.mock('../lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/telegram')>();
  return {
    ...actual,
    initializeTelegramWebApp: vi.fn(),
    getTelegramInitData: vi.fn(() => 'signed-init-data'),
    getTelegramWebApp: vi.fn(() => actual.getTelegramWebApp()),
  };
});

const currentResponse: ResponseFormInput = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
};

function statistics(totalValidResponses: number): StatisticsResult {
  return {
    detailsAvailable: false,
    group: null,
    totalValidResponses,
    sameTrackCount: totalValidResponses,
    sameCountryCount: null,
    groupResponseCount: 0,
    medianScore: null,
    lowerScorePercentage: null,
    scoreBuckets: null,
    statusCounts: null,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');

  const actual = await vi.importActual<typeof import('../lib/telegram')>('../lib/telegram');
  const telegram = await import('../lib/telegram');
  vi.mocked(telegram.getTelegramWebApp).mockImplementation(() => actual.getTelegramWebApp());
});

async function clickMain(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole('button', {
    name: /Porównaj moją aplikację|Dalej|Zapisz odpowiedź/,
  });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
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
    expect(await screen.findByText('Porównaj swoją aplikację z innymi kandydatami')).toBeInTheDocument();
  });

  it('loads an authenticated profile and statistics', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockResolvedValue(statistics(12));
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Status wniosku')).toBeInTheDocument();
      expect(screen.getByText('Wniosek złożony')).toBeInTheDocument();
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

    await screen.findByText('Porównaj swoją aplikację z innymi kandydatami');
    await clickMain(user);

    for (let step = 0; step < 4; step += 1) {
      if (screen.queryAllByRole('combobox').length >= 2) {
        const countrySelects = screen.getAllByRole('combobox');
        await user.selectOptions(countrySelects[0], 'UA');
        await user.selectOptions(countrySelects[1], 'UA');
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
      expect(screen.getByText('Wniosek złożony')).toBeInTheDocument();
    });
  });
});
