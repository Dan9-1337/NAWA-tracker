import { useEffect, useMemo, useRef } from 'react';
import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { getScoreBreakdown } from '../../../shared/nawa-score';
import { useI18n } from '../../i18n/context';
import { cohortLabel } from '../../lib/cohort-label';
import { trackProductEvent } from '../../lib/product-events';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { MIN_COHORT_SIZE } from '../../../shared/product-rules';
import { getCohortProgressCount } from '../../lib/stats-verdict';
import { DistributionDetailsSection } from '../dashboard/DistributionDetailsSection';
import { MeritNegativeOutcomeCard } from '../dashboard/MeritNegativeOutcomeCard';
import { NotAwardedOutcomeCard } from '../dashboard/NotAwardedOutcomeCard';
import { DetailedPosition, ResultHeroCard, SmallCohortNotice } from '../dashboard/ResultHeroCard';
import { ScholarshipAwardedCard } from '../dashboard/ScholarshipAwardedCard';

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

export function StatisticsPanel({ state, profile, userScore }: StatisticsPanelProps) {
  const { t, locale } = useI18n();
  const trackedEvents = useRef(new Set<string>());
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;
  const groupSize = data?.groupResponseCount ?? 0;

  const scoreBreakdown = useMemo(() => {
    if (!profile || profile.scholarshipTrack !== 'nawa_director') return null;
    return getScoreBreakdown(
      profile.averageGrade,
      profile.maximumGrade,
      profile.polishSchoolLevel ?? 'none',
      profile.rankingCountry,
      profile.applicantKind,
    );
  }, [profile]);

  useEffect(() => {
    if (!data || !profile || state.status === 'loading') return;
    const maybeTrack = (name: 'score_viewed' | 'position_or_fallback_viewed') => {
      if (trackedEvents.current.has(name)) return;
      trackedEvents.current.add(name);
      void trackProductEvent({ name });
    };
    if (scoreBreakdown) maybeTrack('score_viewed');
    maybeTrack('position_or_fallback_viewed');
  }, [data, profile, scoreBreakdown, state.status]);

  if (state.status === 'unavailable') {
    return (
      <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
        {t.stats.unavailable}
      </p>
    );
  }

  if (state.status === 'loading') {
    return (
      <p
        className="text-sm text-[var(--tg-theme-subtitle-text-color)]"
        role="status"
        aria-label={t.stats.loadingAriaLabel}
        aria-live="polite"
      >
        {t.stats.loading}
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <p
        className="text-sm text-[var(--tg-theme-destructive-text-color)]"
        role="alert"
        aria-label={t.stats.errorAriaLabel}
      >
        {t.stats.error}
      </p>
    );
  }

  if (!data || !profile || !scoreBreakdown || userScore == null) return null;

  const detailed = state.status === 'success' && groupSize >= MIN_COHORT_SIZE;
  const label = cohortLabel(t, locale, data.cohortScope, profile.rankingCountry, data.cohortGroupId);
  const pooledNote =
    data.cohortScope === 'group'
      ? t.cohort.groupNote(label)
      : data.cohortScope === 'track'
        ? t.cohort.trackNote
        : null;

  return (
    <section className="space-y-3" aria-label={t.stats.heroLabel}>
      {profile.currentStatus === 'merit_review_negative' ? <MeritNegativeOutcomeCard /> : null}
      {profile.currentStatus === 'scholarship_awarded' ? (
        <ScholarshipAwardedCard statusChangedAt={profile.statusChangedAt} />
      ) : null}
      {profile.currentStatus === 'scholarship_not_awarded' ? <NotAwardedOutcomeCard /> : null}

      <ResultHeroCard
        gradesScore={scoreBreakdown.gradesScore}
        polishSchoolBonus={scoreBreakdown.polishSchoolBonus}
        countrySample={detailed && data.cohortScope === 'country'}
      >
        {detailed ? (
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
        )}
      </ResultHeroCard>

      {detailed && data.scoreBuckets && canShowScoreDistribution(groupSize, data.scoreBuckets) ? (
        <DistributionDetailsSection
          buckets={data.scoreBuckets}
          track={profile.scholarshipTrack}
          userScore={userScore}
          medianScore={data.medianScore}
          groupSize={groupSize}
        />
      ) : null}
    </section>
  );
}
