import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateResponseResult, ResponseFormInput, StatisticsResult } from '../../shared/contracts';
import { ApiClientError } from '../lib/api-client';
import { HomePage } from './HomePage';

const api = vi.hoisted(() => ({
  createResponse: vi.fn(),
  updateResponse: vi.fn(),
  getCurrentResponse: vi.fn(),
  getStatistics: vi.fn(),
}));

const telegram = vi.hoisted(() => ({
  getTelegramWebApp: vi.fn(),
}));

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  ...api,
}));

vi.mock('../lib/telegram', () => ({
  getTelegramWebApp: telegram.getTelegramWebApp,
  getTelegramInitData: vi.fn(() => 'signed-init-data'),
  initializeTelegramWebApp: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  telegram.getTelegramWebApp.mockReturnValue({
    initData: 'signed-init-data',
    ready: vi.fn(),
    expand: vi.fn(),
  });
});

describe('HomePage', () => {
  it('shows the Telegram gate outside WebView', () => {
    telegram.getTelegramWebApp.mockReturnValue(null);
    render(<HomePage />);
    expect(screen.getByText('Otwórz przez Telegram')).toBeInTheDocument();
  });

  it('opens create mode when no profile exists', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));
    render(<HomePage />);
    expect(await screen.findByText('Informacja o przetwarzaniu danych')).toBeInTheDocument();
  });

  it('loads an authenticated profile and statistics', async () => {
    api.getCurrentResponse.mockResolvedValue({ response: currentResponse });
    api.getStatistics.mockResolvedValue(statistics(12));
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Tryb aktualizacji')).toBeInTheDocument();
    });
    expect(api.getStatistics).toHaveBeenCalled();
  });

  it('creates a profile and lands in authenticated mode', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));
    const createResult: CreateResponseResult = {
      created: true,
      statistics: statistics(12),
    };
    api.createResponse.mockResolvedValue(createResult);

    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(await screen.findByLabelText('Zapoznałem się'));
    await user.click(screen.getByRole('button', { name: 'Rozpocznij' }));
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    await user.type(screen.getByLabelText('Kraj obywatelstwa (do grupy statystycznej)'), 'Ukraina');
    await user.type(screen.getByLabelText('Kraj ukończenia szkoły średniej'), 'Ukraina');
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    await user.clear(screen.getByLabelText('Maksymalna ocena w skali'));
    await user.type(screen.getByLabelText('Maksymalna ocena w skali'), '5');
    await user.clear(screen.getByLabelText('Średnia ocen'));
    await user.type(screen.getByLabelText('Średnia ocen'), '4.5');
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    await user.click(screen.getByRole('button', { name: 'Zapisz odpowiedź' }));

    await waitFor(() => {
      expect(api.createResponse).toHaveBeenCalled();
      expect(screen.getByText('Tryb aktualizacji')).toBeInTheDocument();
    });
  });
});
