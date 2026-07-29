import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { fineBuckets, makeStatisticsResult } from '../../../shared/test-statistics';
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

  it('renders suppressed state with small-country hero', () => {
    render(<StatisticsPanel state={{ status: 'suppressed', data: suppressedStatistics }} profile={profile} userScore={81} />);

    expect(screen.getByText('Twój wynik')).toBeInTheDocument();
    expect(screen.getByText(/Do rankingu krajowego potrzeba jeszcze 1 ankiet/)).toBeInTheDocument();
    expect(screen.queryByText('Pokaż pełny rozkład wyników')).not.toBeInTheDocument();
  });

  it('renders result hero with rank and expandable distribution for detailed cohorts', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByText('Twój wynik')).toBeInTheDocument();
    expect(screen.getByText(/6\. z 30/)).toBeInTheDocument();
    expect(screen.getByText('Wyżej niż 65% grupy')).toBeInTheDocument();
    expect(screen.getByText('Pokaż pełny rozkład wyników')).toBeInTheDocument();
    expect(screen.getByText('Rozkład wyników w Twojej grupie')).toBeInTheDocument();
  });

  it('shows what changed before hero on returning visits with changes', () => {
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

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings.indexOf('Od ostatniej wizyty')).toBeLessThan(headings.indexOf('Twój wynik'));
  });

  it('renders terminal merit-negative screen with result hero', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={{ ...profile, currentStatus: 'merit_review_negative' }}
        userScore={83.8}
      />,
    );

    expect(screen.getByText('Ocena merytoryczna zakończona negatywnie')).toBeInTheDocument();
    expect(screen.getByText('Twój wynik')).toBeInTheDocument();
  });

  it('renders scholarship awarded outcome before result hero', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={{ ...profile, currentStatus: 'scholarship_awarded' }}
        userScore={83.8}
      />,
    );

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings.indexOf('Stypendium przyznane')).toBeLessThan(headings.indexOf('Twój wynik'));
  });
});

const suppressedStatistics = makeStatisticsResult({
  detailsAvailable: false,
  totalValidResponses: 9,
  sameTrackCount: 9,
  groupResponseCount: 9,
});

const detailedStatistics: StatisticsResult = {
  ...makeStatisticsResult({ detailsAvailable: true }),
  totalValidResponses: 40,
  sameTrackCount: 36,
  sameCountryCount: 30,
  groupResponseCount: 30,
  medianScore: 82.5,
  lowerScorePercentage: 65,
  rankPosition: 6,
  rankTotal: 30,
  trackWideMedian: 80,
  scoreBuckets: fineBuckets([2, 4, 8, 10, 6]),
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
