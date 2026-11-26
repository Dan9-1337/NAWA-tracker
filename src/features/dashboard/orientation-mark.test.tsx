import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrientationMarkResult, ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { fineBuckets, makeStatisticsResult } from '../../../shared/test-statistics';
import { pl } from '../../i18n/pl';
import { ProfileDashboard } from '../ProfileDashboard';
import type { StatisticsState } from '../statistics/StatisticsPanel';

const api = vi.hoisted(() => ({
  getOrientationMark: vi.fn(),
  getScholarshipReport: vi.fn(),
  createScholarshipReport: vi.fn(),
  updateScholarshipReport: vi.fn(),
  deleteScholarshipReport: vi.fn(),
  getScholarshipReportSummary: vi.fn(),
}));

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  ...api,
}));

const UI_TIMEOUT = 15_000;

const byProfile: ResponseFormInput = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'BY',
  schoolCountry: 'BY',
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

/** Three BY surveys in the country: the smallest cohort with a full distribution and the dots. */
const byStatistics: StatisticsResult = {
  ...makeStatisticsResult({ detailsAvailable: true }),
  totalValidResponses: 4,
  sameTrackCount: 4,
  sameCountryCount: 3,
  groupResponseCount: 3,
  medianScore: 80,
  lowerScorePercentage: 33,
  rankPosition: 1,
  rankTotal: 3,
  scoreBuckets: fineBuckets([1, 1, 1]),
};

const detailedState: StatisticsState = { status: 'success', data: byStatistics };

const onlyYouState: StatisticsState = {
  status: 'suppressed',
  data: makeStatisticsResult({
    detailsAvailable: false,
    totalValidResponses: 1,
    sameTrackCount: 1,
    sameCountryCount: 1,
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getScholarshipReport.mockResolvedValue({ report: null });
});

function mockMark(withoutScores: OrientationMarkResult, withScores: OrientationMarkResult = withoutScores) {
  api.getOrientationMark.mockImplementation((includeScores: boolean) =>
    Promise.resolve(includeScores ? withScores : withoutScores),
  );
}

function renderDashboard(profile: ResponseFormInput = byProfile, statistics: StatisticsState = detailedState) {
  render(<ProfileDashboard current={profile} statistics={statistics} onSubmit={vi.fn()} />);
}

const country = 'Białoruś';

describe('ориентир 2026 on the saved result card', () => {
  it('shows the line with (3), the ruler mark at 72 and three labelled dots', async () => {
    const user = userEvent.setup();
    mockMark({ mark: 72, n: 3 }, { mark: 72, n: 3, scores: [72, 80, 95] });
    renderDashboard();

    expect(await screen.findByTestId('orientation-mark-line', {}, { timeout: UI_TIMEOUT })).toHaveTextContent(
      pl.dashboard.hero.orientationMarkLine(country, '3'),
    );
    expect(screen.getByTestId('orientation-mark-line')).toHaveTextContent('(3)');
    expect(screen.getByTestId('orientation-mark-ruler')).toHaveTextContent(
      pl.scoreScreen.orientationMarkLabel,
    );

    await user.click(screen.getByRole('button', { name: pl.dashboard.hero.expandDistribution }));

    expect(screen.getAllByTestId('orientation-mark-dot')).toHaveLength(3);
    expect(screen.getByTestId('orientation-mark-dot-label')).toHaveTextContent(
      pl.stats.chartHolderLabel,
    );
    expect(api.getOrientationMark).toHaveBeenCalledWith(true);
  });

  it('shows a single holder with (1) and the mark', async () => {
    mockMark({ mark: 88, n: 1 });
    renderDashboard();

    expect(await screen.findByTestId('orientation-mark-line', {}, { timeout: UI_TIMEOUT })).toHaveTextContent(
      '(1)',
    );
    expect(screen.getByTestId('orientation-mark-ruler')).toBeInTheDocument();
  });

  it('shows no mark when the country has no counted holder', async () => {
    mockMark({ mark: null, n: 0 });
    renderDashboard();

    expect(await screen.findByTestId('orientation-mark-line', {}, { timeout: UI_TIMEOUT })).toHaveTextContent(
      pl.dashboard.hero.orientationMarkMissing(country),
    );
    expect(screen.queryByTestId('orientation-mark-ruler')).not.toBeInTheDocument();
    expect(screen.queryByTestId('orientation-mark-dot')).not.toBeInTheDocument();
  });

  it('adds the invitation at 60 or above and opens the holder flow', async () => {
    const user = userEvent.setup();
    mockMark({ mark: null, n: 0 });
    renderDashboard();

    await screen.findByTestId('orientation-mark-line', {}, { timeout: UI_TIMEOUT });
    await waitFor(
      () =>
        expect(screen.getByTestId('orientation-mark-line')).toHaveTextContent(
          `${pl.dashboard.hero.orientationMarkMissing(country)} ${pl.dashboard.hero.orientationMarkInvitation}`,
        ),
      { timeout: UI_TIMEOUT },
    );

    await user.click(screen.getByTestId('orientation-mark-line'));

    expect(await screen.findByTestId('scholarship-flow', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
  });

  it('leaves the invitation out below 60', async () => {
    mockMark({ mark: null, n: 0 });
    renderDashboard({ ...byProfile, averageGrade: 3 }, onlyYouState);

    const line = await screen.findByTestId('orientation-mark-line', {}, { timeout: UI_TIMEOUT });
    expect(line).toHaveTextContent(pl.dashboard.hero.orientationMarkMissing(country));
    expect(line).not.toHaveTextContent(pl.dashboard.hero.orientationMarkInvitation);
    expect(screen.queryByTestId('orientation-mark-ruler')).not.toBeInTheDocument();
  });

  it('shows the line and the ruler mark on the "only you" card without a distribution', async () => {
    mockMark({ mark: 88, n: 1 });
    renderDashboard(byProfile, onlyYouState);

    expect(await screen.findByTestId('only-you-notice', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
    expect(await screen.findByTestId('orientation-mark-line', {}, { timeout: UI_TIMEOUT })).toHaveTextContent(
      pl.dashboard.hero.orientationMarkLine(country, '1'),
    );
    expect(screen.getByTestId('orientation-mark-ruler')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: pl.dashboard.hero.expandDistribution })).not.toBeInTheDocument();
  });

  it('shows nothing of the feature for another intake year', async () => {
    mockMark({ mark: 72, n: 3 });
    renderDashboard({ ...byProfile, intakeYear: 2027 }, onlyYouState);

    await screen.findByTestId('only-you-notice', {}, { timeout: UI_TIMEOUT });

    expect(screen.queryByTestId('orientation-mark-line')).not.toBeInTheDocument();
    expect(screen.queryByTestId('orientation-mark-ruler')).not.toBeInTheDocument();
    expect(api.getOrientationMark).not.toHaveBeenCalled();
  });
});
