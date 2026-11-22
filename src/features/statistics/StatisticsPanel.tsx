import { useEffect, useRef, type ReactNode } from 'react';
import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { MIN_COHORT_SIZE } from '../../../shared/product-rules';
import { isIntakeOpen, season2026 } from '../../../shared/season';
import { useI18n } from '../../i18n/context';
import { cohortLabel } from '../../lib/cohort-label';
import { formatDate } from '../../lib/format';
import { trackProductEvent } from '../../lib/product-events';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { scoreForAverage } from '../../lib/score-tape';
import { getCohortProgressCount } from '../../lib/stats-verdict';
import { DistributionDetailsSection } from '../dashboard/DistributionDetailsSection';
import { DetailedPosition, ResultCard, SmallCohortNotice } from '../dashboard/ResultHeroCard';

export type StatisticsState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'suppressed'; data: StatisticsResult }
  | { status: 'success'; data: StatisticsResult };

type StatisticsPanelProps = {
  state: StatisticsState;
  profile?: ResponseFormInput | null;
  userScore?: number | null;
};

export function statisticsStateFromResult(data: StatisticsResult): StatisticsState {
  return data.detailsAvailable ? { status: 'success', data } : { status: 'suppressed', data };
}

function statisticsData(state: StatisticsState): StatisticsResult | null {
  return state.status === 'success' || state.status === 'suppressed' ? state.data : null;
}

/**
 * The saved result card: score and threshold chip always, then the position in the cohort,
 * the small-cohort notice or the statistics-status line.
 */
export function StatisticsPanel({ state, profile, userScore }: StatisticsPanelProps) {
  const { t, locale } = useI18n();
  const trackedEvents = useRef(new Set<string>());
  const data = statisticsData(state);
  const isDirector = profile?.scholarshipTrack === 'nawa_director';

  useEffect(() => {
    if (!data || !profile || state.status === 'loading') return;
    const maybeTrack = (name: 'score_viewed' | 'position_or_fallback_viewed') => {
      if (trackedEvents.current.has(name)) return;
      trackedEvents.current.add(name);
      void trackProductEvent({ name });
    };
    if (isDirector) maybeTrack('score_viewed');
    maybeTrack('position_or_fallback_viewed');
  }, [data, isDirector, profile, state.status]);

  if (!profile) return null;

  const savedScore = scoreForAverage(profile.averageGrade, {
    maximumGrade: profile.maximumGrade,
    polishSchoolLevel: profile.polishSchoolLevel ?? 'none',
    rankingCountry: profile.rankingCountry,
  });

  const seasonLabel = isIntakeOpen()
    ? t.scoreScreen.seasonOpen(formatDate(season2026.documentsTo, locale))
    : t.scoreScreen.seasonClosed(String(season2026.year));

  let body: ReactNode = null;
  let caption: string | null = null;

  if (state.status === 'unavailable') {
    body = (
      <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
        {t.stats.unavailable}
      </p>
    );
  } else if (state.status === 'loading') {
    body = (
      <p
        className="text-sm text-[var(--tg-theme-subtitle-text-color)]"
        role="status"
        aria-label={t.stats.loadingAriaLabel}
        aria-live="polite"
      >
        {t.stats.loading}
      </p>
    );
  } else if (state.status === 'error') {
    body = (
      <p
        className="text-sm text-[var(--tg-theme-destructive-text-color)]"
        role="alert"
        aria-label={t.stats.errorAriaLabel}
      >
        {t.stats.error}
      </p>
    );
  } else if (data && isDirector && userScore != null) {
    const detailed = state.status === 'success' && data.groupResponseCount >= MIN_COHORT_SIZE;
    const label = cohortLabel(t, locale, data.cohortScope, profile.rankingCountry, data.cohortGroupId);
    const pooledNote =
      data.cohortScope === 'group'
        ? t.cohort.groupNote(label)
        : data.cohortScope === 'track'
          ? t.cohort.trackNote
          : null;

    caption =
      data.cohortScope === 'country'
        ? t.dashboard.hero.unofficialCountrySample
        : t.dashboard.hero.unofficialSample;

    body = detailed ? (
      <DetailedPosition
        data={data}
        userScore={userScore}
        rankingCountry={profile.rankingCountry}
        track={profile.scholarshipTrack}
        cohortLabel={label}
        cohortScope={data.cohortScope}
        pooledNote={pooledNote}
      />
    ) : (
      <SmallCohortNotice
        cohortLabel={label}
        participantCount={getCohortProgressCount(data)}
        userScore={userScore}
        trackWideMedian={data.trackWideMedian}
      />
    );
  }

  return (
    <ResultCard score={savedScore} seasonLabel={seasonLabel} caption={caption}>
      {body}
    </ResultCard>
  );
}

/** The full-distribution disclosure; it sits between the what-if and the profile block. */
export function StatisticsDistribution({ state, profile, userScore }: StatisticsPanelProps) {
  if (state.status !== 'success' || !profile || profile.scholarshipTrack !== 'nawa_director' || userScore == null) {
    return null;
  }

  const data = state.data;
  const groupSize = data.groupResponseCount;
  if (!canShowScoreDistribution(groupSize, data.scoreBuckets)) return null;

  return (
    <DistributionDetailsSection
      buckets={data.scoreBuckets}
      track={profile.scholarshipTrack}
      userScore={userScore}
      medianScore={data.medianScore}
      groupSize={groupSize}
    />
  );
}
