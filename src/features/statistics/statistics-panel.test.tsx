import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { fineBuckets } from '../../../shared/test-statistics';
import { StatisticsPanel } from './StatisticsPanel';

const profile = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director' as const,
  studyRoute: 'direct_studies' as const,
  targetUniversity: 'science-096',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'none' as const,
  currentStatus: 'submitted' as const,
  statusChangedAt: '2026-07-13',
};

describe('StatisticsPanel', () => {
  it('renders unavailable, loading, and error states distinctly', () => {
    const { rerender } = render(<StatisticsPanel state={{ status: 'unavailable' }} profile={profile} />);

    expect(screen.getByText('Statystyki pojawią się po zapisaniu ankiety.')).toBeInTheDocument();

    rerender(<StatisticsPanel state={{ status: 'loading' }} profile={profile} />);
    expect(screen.getByRole('status')).toHaveTextContent('Wczytywanie statystyk…');

    rerender(<StatisticsPanel state={{ status: 'error' }} profile={profile} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać statystyk');
  });

  it('renders suppressed state as progress toward threshold', () => {
    render(<StatisticsPanel state={{ status: 'suppressed', data: suppressedStatistics }} profile={profile} />);

    expect(screen.getByText('Czekamy na więcej ankiet')).toBeInTheDocument();
    expect(screen.getByText(/W Twojej grupie: 9/)).toBeInTheDocument();
    expect(screen.getByText(/brakuje 1/)).toBeInTheDocument();
  });

  it('uses band hero for small cohorts and keeps exact percentile in details', async () => {
    const user = userEvent.setup();
    render(
      <StatisticsPanel
        state={{ status: 'success', data: qualitativeStatistics }}
        profile={profile}
        userScore={75}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Wyżej niż 95% grupy' })).toBeInTheDocument();
    expect(screen.getByText('Powyżej mediany')).toBeInTheDocument();
    expect(screen.getByText('Wiarygodność: średnia')).toBeInTheDocument();
    expect(screen.getByText('Ukraina')).toBeInTheDocument();
    expect(screen.queryByText('W górnej części grupy')).not.toBeInTheDocument();
    expect(screen.getByText('Rozkład wyników')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Dlaczego wiarygodność jest średnia/ }));
    expect(screen.getByText('Wyniki punktowe')).toBeInTheDocument();
    expect(screen.queryByText('Liczba odpowiedzi w grupie')).not.toBeInTheDocument();
  });

  it('shows percentile headline for detailed cohorts', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Wyżej niż 65% grupy' })).toBeInTheDocument();
    expect(screen.getByText(/powyżej mediany wśród 30 ankiet/)).toBeInTheDocument();
    expect(screen.getByText('Powyżej mediany')).toBeInTheDocument();
    expect(screen.queryByText('65%')).not.toBeInTheDocument();
  });

  it('combines weekly growth into one activity block', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: statisticsWithGrowth }}
        profile={profile}
        userScore={83.8}
        previousSnapshot={{
          groupResponseCount: 14,
          lowerScorePercentage: 65,
          medianScore: 76,
          sameTrackCount: 14,
          sameCountryCount: 14,
          fetchedAt: '2026-07-20T10:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText('Ostatnie 7 dni')).toBeInTheDocument();
    expect(screen.getByText('+14 ankiet w Twojej grupie · +25 łącznie')).toBeInTheDocument();
    expect(screen.getByText('Twoja pozycja nie zmieniła się istotnie')).toBeInTheDocument();
    expect(screen.queryByText('Bez zmian od ostatniej wizyty')).not.toBeInTheDocument();
  });
});

const suppressedStatistics: StatisticsResult = {
  detailsAvailable: false,
  totalValidResponses: 9,
  sameTrackCount: 9,
  sameCountryCount: null,
  groupResponseCount: 0,
  medianScore: null,
  lowerScorePercentage: null,
  scoreBuckets: null,
  growth7d: null,
  history: [],
};

const qualitativeStatistics: StatisticsResult = {
  detailsAvailable: true,
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 12,
  groupResponseCount: 19,
  medianScore: 82.5,
  lowerScorePercentage: 95,
  scoreBuckets: fineBuckets([1, 2, 4, 7, 5]),
  growth7d: null,
  history: [],
};

const detailedStatistics: StatisticsResult = {
  detailsAvailable: true,
  totalValidResponses: 40,
  sameTrackCount: 36,
  sameCountryCount: 30,
  groupResponseCount: 30,
  medianScore: 82.5,
  lowerScorePercentage: 65,
  scoreBuckets: fineBuckets([2, 4, 8, 10, 6]),
  growth7d: null,
  history: [],
};

const statisticsWithGrowth: StatisticsResult = {
  ...detailedStatistics,
  groupResponseCount: 14,
  growth7d: {
    newResponsesTotal: 25,
    newResponsesInGroup: 14,
    medianThen: 76,
    medianNow: 76.05,
    percentileThen: 65,
    percentileNow: 65,
  },
};
