import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { fineBuckets, makeStatisticsResult } from '../../../shared/test-statistics';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../../i18n';
import { pl } from '../../i18n/pl';
import { trackProductEvent } from '../../lib/product-events';
import { StatisticsDistribution, StatisticsPanel, statisticsStateFromResult } from './StatisticsPanel';

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
    expect(screen.getByRole('status', { name: pl.stats.loadingAriaLabel })).toBeInTheDocument();
    expect(screen.getByRole('status').querySelectorAll('[aria-hidden="true"].skeleton-block').length).toBeGreaterThan(0);
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

  it('labels the season by the year the server reported, with the 2026 closing copy unchanged', () => {
    render(<StatisticsPanel state={{ status: 'unavailable' }} profile={profile} />);

    expect(screen.getByText(pl.scoreScreen.seasonClosed('2026'))).toBeInTheDocument();
  });

  it('shows "intake closed" without dates for a server year that has none, and does not crash', () => {
    const { rerender } = render(
      <StatisticsPanel state={{ status: 'unavailable' }} profile={{ ...profile, intakeYear: 2027 }} />,
    );
    expect(screen.getByText(pl.scoreScreen.seasonClosed('2027'))).toBeInTheDocument();

    // A year that is not listed in `seasons` at all falls back the same way.
    rerender(<StatisticsPanel state={{ status: 'unavailable' }} profile={{ ...profile, intakeYear: 2031 }} />);
    expect(screen.getByText(pl.scoreScreen.seasonClosed('2031'))).toBeInTheDocument();
  });

  it('shows the score, the chip and one line when the country has only this survey', () => {
    render(
      <StatisticsPanel
        state={{ status: 'suppressed', data: onlyYouStatistics }}
        profile={profile}
        userScore={81}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Twój wynik', level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    expect(screen.getByTestId('saved-score-chip')).toBeInTheDocument();
    expect(screen.getByTestId('only-you-notice')).toHaveTextContent(
      'Ukraina: na razie tylko Twoja ankieta w naborze 2026.',
    );
    expect(screen.getByTestId('only-you-notice')).toHaveTextContent(
      pl.dashboard.hero.onlyYou('Ukraina', '2026'),
    );

    // Nothing else: no rank, percentile, median, distribution or unofficial-sample caption.
    expect(screen.queryByText(pl.dashboard.position.percentileLine('50'))).not.toBeInTheDocument();
    expect(screen.queryByText(pl.stats.chartMedianLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(pl.dashboard.hero.densityHint)).not.toBeInTheDocument();
    expect(screen.queryByTestId('result-card-caption')).not.toBeInTheDocument();
  });

  it('shows the full position when the country has exactly two surveys', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: twoSurveyStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByText(/1\. z 2 · Ukraina/)).toBeInTheDocument();
    expect(screen.getByText('Wyżej niż 50% grupy')).toBeInTheDocument();
    expect(screen.getByText(pl.stats.chartMedianLabel)).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.hero.densityHint)).toBeInTheDocument();
    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(
      pl.dashboard.hero.unofficialCountrySample,
    );
    expect(screen.queryByTestId('only-you-notice')).not.toBeInTheDocument();
  });

  it('treats nine surveys the same as a larger country cohort', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: nineSurveyStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByText(/6\. z 9 · Ukraina/)).toBeInTheDocument();
    expect(screen.getByText('Wyżej niż 65% grupy')).toBeInTheDocument();
    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(
      pl.dashboard.hero.unofficialCountrySample,
    );
    expect(screen.queryByText(/Do rankingu krajowego/)).not.toBeInTheDocument();
    expect(screen.queryByText(/w grupie:|wszystkimi krajami/)).not.toBeInTheDocument();
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
        state={{ status: 'success', data: twoSurveyStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByText('Pokaż pełny rozkład wyników')).toBeInTheDocument();
    expect(screen.queryByTestId('saved-score-value')).not.toBeInTheDocument();
  });

  it('has no full-distribution disclosure on the "only you" card', () => {
    render(
      <StatisticsDistribution
        state={{ status: 'suppressed', data: onlyYouStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.queryByText(pl.dashboard.hero.expandDistribution)).not.toBeInTheDocument();
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

  it('maps detailsAvailable onto the success and suppressed states', () => {
    expect(statisticsStateFromResult(twoSurveyStatistics).status).toBe('success');
    expect(statisticsStateFromResult(onlyYouStatistics).status).toBe('suppressed');
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

  it('writes the D4 country caption in Russian', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
    setActiveLocale('ru');

    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={83.8}
      />,
    );

    expect(screen.getByTestId('result-card-caption')).toHaveTextContent(
      'Неофициально · выборка NAWAmeter по стране',
    );
  });
});

/** One valid survey in the country: the applicant's own, so the card shows the "only you" line. */
const onlyYouStatistics = makeStatisticsResult({
  detailsAvailable: false,
  totalValidResponses: 1,
  sameTrackCount: 1,
  sameCountryCount: 1,
});

/** Exactly two valid surveys in the country: the smallest cohort with a full position. */
const twoSurveyStatistics: StatisticsResult = {
  ...makeStatisticsResult({ detailsAvailable: true }),
  totalValidResponses: 4,
  sameTrackCount: 3,
  sameCountryCount: 2,
  groupResponseCount: 2,
  medianScore: 78,
  lowerScorePercentage: 50,
  rankPosition: 1,
  rankTotal: 2,
  scoreBuckets: fineBuckets([1, 1]),
};

const nineSurveyStatistics: StatisticsResult = {
  ...makeStatisticsResult({ detailsAvailable: true }),
  totalValidResponses: 20,
  sameTrackCount: 14,
  sameCountryCount: 9,
  groupResponseCount: 9,
  medianScore: 78,
  lowerScorePercentage: 65,
  rankPosition: 6,
  rankTotal: 9,
  scoreBuckets: fineBuckets([1, 2, 3, 2, 1]),
};

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
  scoreBuckets: fineBuckets([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1]),
};
