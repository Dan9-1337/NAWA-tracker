import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CohortOutcomesResult } from '../../../shared/contracts';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../../i18n';
import { OutcomesScreen } from './OutcomesScreen';

const api = vi.hoisted(() => ({ getCohortOutcomes: vi.fn(), getPrepCityDistribution: vi.fn() }));

vi.mock('../../lib/api-client', () => api);

function result(overrides: Partial<CohortOutcomesResult> = {}): CohortOutcomesResult {
  return {
    ownCountry: 'UA',
    scope: 'country',
    groupId: null,
    awardedCount: 12,
    notAwardedCount: 0,
    awardedRate: null,
    awardedBandLow: 80,
    awardedBandHigh: 95,
    notAwardedBandHigh: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
  setActiveLocale('ru');
});

describe('OutcomesScreen', () => {
  it('places the saved score inside the awarded band of the own country', async () => {
    api.getCohortOutcomes.mockResolvedValue(result());
    render(<OutcomesScreen userScore={85} />);

    expect(await screen.findByText(/ваш балл 85,00 внутри диапазона/)).toHaveTextContent('Это не прогноз');
    expect(screen.getByRole('img', { name: /Украина: баллы получивших стипендию, 80[,.]0–95[,.]0/ })).toBeInTheDocument();
    expect(screen.getByText('вы')).toBeInTheDocument();
  });

  it.each([
    [70, /ниже диапазона/],
    [99, /выше диапазона/],
  ])('describes a score of %s relative to the band', async (score, pattern) => {
    api.getCohortOutcomes.mockResolvedValue(result());
    render(<OutcomesScreen userScore={score} />);
    expect(await screen.findByText(pattern)).toBeInTheDocument();
  });

  it('names a pooled country group and shows the not-awarded evidence', async () => {
    api.getCohortOutcomes.mockResolvedValue(
      result({
        ownCountry: 'GE',
        scope: 'group',
        groupId: 'east',
        notAwardedCount: 4,
        awardedRate: 0.75,
        notAwardedBandHigh: 70,
      }),
    );
    render(<OutcomesScreen userScore={85} />);

    expect(await screen.findByText(/Восточная Европа и Центральная Азия: ваш балл/)).toBeInTheDocument();
    expect(screen.getByText(/Участникам с баллом до 70[,.]0 тоже не хватило места/)).toBeInTheDocument();
    expect(screen.getByText(/среди прошедших оценку: 75%/)).toBeInTheDocument();
  });

  it('shows an empty state and the official history when no cohort is disclosed', async () => {
    api.getCohortOutcomes.mockResolvedValue(
      result({ scope: null, awardedCount: 0, awardedBandLow: null, awardedBandHigh: null }),
    );
    render(<OutcomesScreen userScore={85} />);

    expect(await screen.findByText(/сообщено меньше трёх присуждённых стипендий/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Официальная история')).toBeInTheDocument();
    expect(screen.getByText(/Со стипендией: 619 из 1131 заявки \(55%\)/)).toBeInTheDocument();
  });

  it('reports a load failure and retries', async () => {
    api.getCohortOutcomes.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(result());
    const user = userEvent.setup();
    render(<OutcomesScreen userScore={85} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить итоги.');
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    await waitFor(() => expect(screen.getByText(/внутри диапазона/)).toBeInTheDocument());
  });

  it('shows the preparatory-course cities only when asked to', async () => {
    api.getCohortOutcomes.mockResolvedValue(result());
    api.getPrepCityDistribution.mockResolvedValue({
      studyField: '0613',
      level: 'detailed',
      groupCode: '0613',
      total: 3,
      cities: [{ city: 'Kraków', count: 3 }],
      otherCount: 0,
    });

    const { rerender } = render(<OutcomesScreen userScore={85} />);
    await screen.findByText(/ваш балл 85,00/);
    expect(api.getPrepCityDistribution).not.toHaveBeenCalled();

    rerender(<OutcomesScreen userScore={85} showPrepCities />);
    expect(await screen.findByText('Kraków')).toBeInTheDocument();
  });
});
