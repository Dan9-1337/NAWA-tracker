import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { fineBuckets, makeStatisticsResult } from '../../../shared/test-statistics';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../../i18n';
import { pl } from '../../i18n/pl';
import { trackProductEvent } from '../../lib/product-events';
import { StatisticsDistribution, StatisticsPanel } from './StatisticsPanel';

vi.mock('../../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StatisticsPanel', () => {
  it('renders unavailable, loading, and error states inside the result card', () => {
    const { rerender } = render(<StatisticsPanel state={{ status: 'unavailable' }} profile={profile} />);

    expect(screen.getByText('Statystyki pojawią się po zapisaniu ankiety.')).toBeInTheDocument();
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('saved-score-chip')).toHaveTextContent(
      pl.scoreScreen.aboveThreshold('21,00', '60'),
    );
    expect(screen.getByTestId('saved-score-value').closest('section')).toContainElement(
      screen.getByText('Statystyki pojawią się po zapisaniu ankiety.'),
    );

    rerender(<StatisticsPanel state={{ status: 'loading' }} profile={profile} />);
    expect(screen.getByRole('status')).toHaveTextContent('Wczytywanie statystyk…');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('saved-score-value').closest('section')).toContainElement(
      screen.getByRole('status'),
    );

    rerender(<StatisticsPanel state={{ status: 'error' }} profile={profile} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać statystyk');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('saved-score-value').closest('section')).toContainElement(
      screen.getByRole('alert'),
    );
  });

  it('renders suppressed state with the score, chip and small-cohort text', () => {
    render(<StatisticsPanel state={{ status: 'suppressed', data: suppressedStatistics }} profile={profile} userScore={81} />);

    expect(screen.getByRole('heading', { name: 'Twój wynik', level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('saved-score-chip')).toBeInTheDocument();
    expect(screen.getByText(/Do rankingu krajowego potrzeba jeszcze 1 ankiet/)).toBeInTheDocument();
    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(pl.dashboard.hero.unofficialSample);
  });

  it('renders the position and the country caption for detailed cohorts', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Twój wynik', level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByText(/6\. z 30/)).toBeInTheDocument();
    expect(screen.getByText('Wyżej niż 65% grupy')).toBeInTheDocument();
    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(
      pl.dashboard.hero.unofficialCountrySample,
    );
    expect(screen.getByText(pl.dashboard.hero.unofficialCountrySample)).toHaveTextContent(
      'Nieoficjalnie · próba NAWAmeter w Twoim kraju',
    );
  });

  it('keeps the score breakdown and the source badges out of the result card', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(document.querySelector('details')).toBeNull();
    expect(document.querySelector('.stat-badge')).toBeNull();
  });

  it('renders the full-distribution disclosure separately from the result card', () => {
    render(
      <StatisticsDistribution
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByText('Pokaż pełny rozkład wyników')).toBeInTheDocument();
    expect(screen.queryByTestId('saved-score-value')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(pl.dashboard.hero.unofficialSample);
    expect(screen.queryByText(pl.dashboard.hero.unofficialCountrySample)).not.toBeInTheDocument();
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
    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(pl.dashboard.hero.unofficialSample);
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

  it('fires score_viewed and position_or_fallback_viewed exactly once each', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    const events = vi.mocked(trackProductEvent).mock.calls.map(([event]) => event.name);
    expect(events.filter((name) => name === 'score_viewed')).toHaveLength(1);
    expect(events.filter((name) => name === 'position_or_fallback_viewed')).toHaveLength(1);
  });

  it('does not count statistics events before a payload arrives', () => {
    render(<StatisticsPanel state={{ status: 'loading' }} profile={profile} userScore={81} />);

    expect(trackProductEvent).not.toHaveBeenCalled();
  });

  it('writes the D4 caption in Russian for a country and for a pooled cohort', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
    setActiveLocale('ru');

    const { rerender } = render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(
      'Неофициально · выборка NAWAmeter по стране',
    );

    rerender(
      <StatisticsPanel
        state={{ status: 'success', data: { ...groupStatistics, cohortScope: 'track', cohortGroupId: null } }}
        profile={{ ...profile, rankingCountry: 'GE', schoolCountry: 'GE' }}
        userScore={83.8}
      />,
    );

    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(/^Неофициально · выборка NAWAmeter$/);
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
