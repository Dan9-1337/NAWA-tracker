import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { fineBuckets, makeStatisticsResult } from '../../../shared/test-statistics';
import { StatisticsPanel } from './StatisticsPanel';

const profile = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director' as const,
  studyRoute: 'direct_studies' as const,
  targetUniversity: 'science-096',
  studyField: '0613',
  gradeBasis: 'final_certificate' as const,
  applicantKind: 'school_leaver' as const,
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

    expect(screen.getByRole('heading', { name: 'Twój wynik', level: 2 })).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: 'Twój wynik', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/6\. z 30/)).toBeInTheDocument();
    expect(screen.getByText('Wyżej niż 65% grupy')).toBeInTheDocument();
    expect(screen.getByText('Pokaż pełny rozkład wyników')).toBeInTheDocument();
    expect(screen.getAllByText('Rozkład wyników w Twojej grupie').length).toBeGreaterThanOrEqual(1);
  });

  it('names the pooled country group when the own country is too small', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: groupStatistics }}
        profile={{ ...profile, rankingCountry: 'GE', schoolCountry: 'GE' }}
        userScore={83.8}
      />,
    );

    expect(screen.getByText(/w grupie: Europa Wschodnia i Azja Środkowa/)).toBeInTheDocument();
    expect(screen.getByText(/6\. z 12/)).toBeInTheDocument();
  });

  it('says so when the comparison falls back to all countries', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: { ...groupStatistics, cohortScope: 'track', cohortGroupId: null } }}
        profile={{ ...profile, rankingCountry: 'GE', schoolCountry: 'GE' }}
        userScore={83.8}
      />,
    );

    expect(screen.getByText(/porównujemy Cię ze wszystkimi krajami/)).toBeInTheDocument();
  });

  it('shows only the result hero whatever status an older profile carries', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={{ ...profile, currentStatus: 'scholarship_awarded' }}
        userScore={83.8}
      />,
    );

    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual(['Twój wynik']);
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
  cohortScope: 'country',
};

const groupStatistics: StatisticsResult = {
  ...makeStatisticsResult({ detailsAvailable: true }),
  totalValidResponses: 40,
  sameTrackCount: 36,
  sameCountryCount: null,
  groupResponseCount: 12,
  medianScore: 82.5,
  lowerScorePercentage: 55,
  rankPosition: 6,
  rankTotal: 12,
  trackWideMedian: 80,
  scoreBuckets: fineBuckets([1, 2, 4, 3, 2]),
  cohortScope: 'group',
  cohortGroupId: 'east',
};
