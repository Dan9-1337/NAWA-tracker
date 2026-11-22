import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { fineBuckets, makeStatisticsResult } from '../../../shared/test-statistics';
import { pl } from '../../i18n/pl';
import { trackProductEvent } from '../../lib/product-events';
import { ProfileDashboard } from '../ProfileDashboard';
import type { StatisticsState } from '../statistics/StatisticsPanel';
import { ScoreScreen } from './ScoreScreen';

vi.mock('../../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

const trackedEvents = vi.mocked(trackProductEvent);

function countTracked(name: string): number {
  return trackedEvents.mock.calls.filter(([event]) => event.name === name).length;
}

beforeEach(() => {
  vi.clearAllMocks();
});

const current: ResponseFormInput = {
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

/**
 * Thirty surveys in the country: sixteen buckets that sum to thirty, so a what-if score of 81.9 sits at the
 * 58.4th percentile and the band is 50–60.
 */
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

const detailedState: StatisticsState = { status: 'success', data: detailedStatistics };

/** Two surveys in the country: the smallest cohort that still gets a position and a what-if band. */
const twoSurveyStatistics: StatisticsResult = {
  ...makeStatisticsResult({ detailsAvailable: true }),
  totalValidResponses: 3,
  sameTrackCount: 3,
  sameCountryCount: 2,
  groupResponseCount: 2,
  medianScore: 70,
  lowerScorePercentage: 50,
  rankPosition: 1,
  rankTotal: 2,
  scoreBuckets: fineBuckets([1, 1]),
};

function renderScore(statistics: StatisticsState = detailedState) {
  return render(<ScoreScreen current={current} statistics={statistics} />);
}

function renderDashboard(statistics: StatisticsState = detailedState) {
  return render(<ProfileDashboard current={current} statistics={statistics} onSubmit={vi.fn()} />);
}

/** `compareDocumentPosition` bit 4 means the second node follows the first in document order. */
function expectBefore(first: Element, second: Element) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe('ScoreScreen what-if percentile band', () => {
  it('shows the decile band for a what-if score at or above the axis origin', async () => {
    const user = userEvent.setup();
    renderScore();

    expect(screen.queryByTestId('what-if-percentile-band')).not.toBeInTheDocument();
    expect(screen.queryByTestId('what-if-score-value')).not.toBeInTheDocument();

    // One step: 4.50 → 4.55 average, 81.00 → 81.90 score.
    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));

    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByText(pl.scoreScreen.savedScore('81,00'))).toBeInTheDocument();
    expect(screen.getByText('≈ wyżej niż 50–60% grupy')).toBeInTheDocument();
    expect(screen.getByTestId('what-if-percentile-band')).toHaveTextContent(
      pl.scoreScreen.percentileBand(50, 60),
    );
  });

  it('shows the band for a country cohort of exactly two surveys', async () => {
    const user = userEvent.setup();
    renderScore({ status: 'success', data: twoSurveyStatistics });

    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));

    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByTestId('what-if-percentile-band')).toBeInTheDocument();
  });

  it('says the score is below the axis instead of showing a band under 60', async () => {
    const user = userEvent.setup();
    renderScore();

    const input = screen.getByLabelText(pl.scoreScreen.averageInputLabel);
    await user.clear(input);
    await user.type(input, '3');

    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('54,00');
    const line = screen.getByTestId('what-if-percentile-band');
    expect(line).toHaveTextContent(pl.scoreScreen.belowAxis);
    expect(line).not.toHaveTextContent('%');
  });

  it('shows neither a what-if score nor a band for the saved average', () => {
    renderScore();

    expect(screen.queryByTestId('what-if-score-value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('what-if-threshold-chip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('what-if-percentile-band')).not.toBeInTheDocument();
  });

  const hiddenBandStates: Array<[string, StatisticsState]> = [
    ['loading', { status: 'loading' }],
    ['error', { status: 'error' }],
    [
      'the "only you" card',
      {
        status: 'suppressed',
        data: makeStatisticsResult({
          detailsAvailable: false,
          totalValidResponses: 1,
          sameTrackCount: 1,
          sameCountryCount: 1,
        }),
      },
    ],
    [
      'statistics without details',
      {
        status: 'success',
        data: { ...twoSurveyStatistics, detailsAvailable: false },
      },
    ],
    [
      'missing buckets',
      {
        status: 'success',
        data: { ...detailedStatistics, scoreBuckets: null },
      },
    ],
    [
      'buckets that are not the fine sixteen',
      {
        status: 'success',
        data: { ...detailedStatistics, scoreBuckets: [1, 2, 3] },
      },
    ],
  ];

  it.each(hiddenBandStates)('shows no band while statistics are %s', async (_name, statistics) => {
    const user = userEvent.setup();
    renderScore(statistics);

    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));

    expect(screen.queryByTestId('what-if-percentile-band')).not.toBeInTheDocument();
    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByText(pl.scoreScreen.savedScore('81,00'))).toBeInTheDocument();
  });

  it('removes the band when the saved average is restored', async () => {
    const user = userEvent.setup();
    renderScore();

    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));
    expect(screen.getByTestId('what-if-percentile-band')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.scoreScreen.reset }));

    expect(screen.queryByTestId('what-if-percentile-band')).not.toBeInTheDocument();
    expect(screen.queryByTestId('what-if-score-value')).not.toBeInTheDocument();
    expect(screen.queryByText(pl.scoreScreen.savedScore('81,00'))).not.toBeInTheDocument();
  });
});

describe('what-if analytics', () => {
  it('records what_if_used once per dashboard mount and ignores invalid or unchanged values', () => {
    renderDashboard();
    const input = screen.getByLabelText(pl.scoreScreen.averageInputLabel);

    fireEvent.change(input, { target: { value: '7' } });
    expect(countTracked('what_if_used')).toBe(0);

    fireEvent.change(input, { target: { value: '4,5' } });
    expect(countTracked('what_if_used')).toBe(0);

    fireEvent.change(input, { target: { value: '4,2' } });
    expect(countTracked('what_if_used')).toBe(1);

    fireEvent.change(input, { target: { value: '4,1' } });
    fireEvent.change(input, { target: { value: '4,0' } });
    expect(countTracked('what_if_used')).toBe(1);
    expect(trackedEvents).toHaveBeenCalledWith({ name: 'what_if_used' });
  });

  it('counts several ruler steps as one what-if use per dashboard mount', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const ruler = screen.getByRole('slider');

    ruler.focus();
    await user.keyboard('{ArrowRight}');

    expect(countTracked('what_if_used')).toBe(1);

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');

    expect(countTracked('what_if_used')).toBe(1);
  });
});

describe('dashboard layout', () => {
  it('orders the saved result card, what-if, distribution and profile block top to bottom', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const card = screen.getByTestId('saved-score-value');
    const whatIf = screen.getByTestId('what-if-block');
    const distribution = screen.getByRole('button', { name: pl.dashboard.hero.expandDistribution });
    const profileBlock = screen.getByTestId('profile-block');

    expectBefore(card, whatIf);
    expectBefore(whatIf, distribution);
    expectBefore(distribution, profileBlock);

    // Inside the card: score → chip → rank → percentile → median.
    const chip = screen.getByTestId('saved-score-chip');
    const rank = screen.getByText(/6\. z 30/);
    const percentile = screen.getByText('Wyżej niż 65% grupy');
    const median = screen.getByText('Poniżej mediany o 1,5 pkt');

    expectBefore(card, chip);
    expectBefore(chip, rank);
    expectBefore(rank, percentile);
    expectBefore(percentile, median);

    // The what-if block is below the card and does not move the card's contents.
    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
  });

  it('keeps the saved score, chip, rank and percentile while the what-if changes the score', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const assertSavedResult = () => {
      expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
      expect(screen.getByTestId('saved-score-chip')).toHaveTextContent(
        pl.scoreScreen.aboveThreshold('21,00', '60'),
      );
      expect(screen.getByText(/6\. z 30/)).toBeInTheDocument();
      expect(screen.getByText('Wyżej niż 65% grupy')).toBeInTheDocument();
      expect(screen.getByText('Poniżej mediany o 1,5 pkt')).toBeInTheDocument();
      expect(screen.getAllByText(pl.dashboard.hero.densityHint).length).toBeGreaterThan(0);
    };

    assertSavedResult();
    const stripCount = screen.getAllByText(pl.dashboard.hero.densityHint).length;

    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));

    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByTestId('what-if-threshold-chip')).toHaveTextContent(
      pl.scoreScreen.aboveThreshold('21,90', '60'),
    );
    expect(screen.getByTestId('what-if-percentile-band')).toBeInTheDocument();
    assertSavedResult();
    expect(screen.getAllByText(pl.dashboard.hero.densityHint)).toHaveLength(stripCount);
  });

  it('shows only the tape, hint and input when no what-if is active', () => {
    renderDashboard();

    const whatIf = screen.getByTestId('what-if-block');
    expect(whatIf).toContainElement(screen.getByRole('slider'));
    expect(whatIf).toContainElement(screen.getByText(pl.scoreScreen.tapeHint('0,05')));
    expect(whatIf).toContainElement(screen.getByLabelText(pl.scoreScreen.averageInputLabel));

    expect(screen.queryByTestId('what-if-score-value')).not.toBeInTheDocument();
    expect(screen.queryByTestId('what-if-threshold-chip')).not.toBeInTheDocument();

    // D1: the saved score is a display size between 56 and 64 px.
    expect(screen.getByTestId('saved-score-value')).toHaveClass('text-[clamp(56px,16vw,64px)]');
  });

  it('keeps the what-if usable while statistics load and shows the status inside the card', async () => {
    const user = userEvent.setup();
    renderDashboard({ status: 'loading' });

    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
    const card = screen.getByTestId('saved-score-value').closest('section');
    expect(card).toContainElement(screen.getByRole('status'));

    await user.click(screen.getByRole('button', { name: pl.scoreScreen.increase }));

    expect(screen.getByTestId('what-if-score-value')).toHaveTextContent('81,90');
    expect(screen.getByTestId('saved-score-value')).toHaveTextContent('81,00');
  });
});
