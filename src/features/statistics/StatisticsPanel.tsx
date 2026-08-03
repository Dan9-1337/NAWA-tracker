import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { getScoreBreakdown } from '../../../shared/nawa-score';
import type { DashboardSectionId } from '../../../shared/dashboard-layout';
import { getDashboardSectionOrder } from '../../../shared/dashboard-layout';
import { PositionHistoryList } from '../../components/PositionHistoryList';
import { useI18n } from '../../i18n/context';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import type { StatsSnapshot } from '../../lib/stats-snapshot';
import { getCohortProgressCount, MIN_DETAILED_COHORT } from '../../lib/stats-verdict';
import { hasReturningVisitChanges } from '../../lib/position-change';
import { trackProductEvent } from '../../lib/product-events';
import { DistributionDetailsSection } from '../dashboard/DistributionDetailsSection';
import { MeritNegativeOutcomeCard } from '../dashboard/MeritNegativeOutcomeCard';
import { ProgressInGroupCard } from '../dashboard/ProgressInGroupCard';
import { ReportedMeritOutcomesCard } from '../dashboard/ReportedMeritOutcomesCard';
import { ResultHeroCard } from '../dashboard/ResultHeroCard';
import { ScholarshipAwardedCard } from '../dashboard/ScholarshipAwardedCard';
import { WhatChangedCard } from '../dashboard/WhatChangedCard';
import { AllocationEstimateCard } from '../dashboard/allocation/AllocationEstimateCard';
import { AllocationUnavailableNotice } from '../dashboard/allocation/AllocationUnavailableNotice';
import { HistoricalAllocationContext } from '../dashboard/allocation/HistoricalAllocationContext';
import { buildAllocationSection, buildHistoricalRecords } from './allocation-section';
import { useEffect, useMemo, useRef } from 'react';

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
  previousSnapshot?: StatsSnapshot | null;
};

export function statisticsStateFromResult(data: StatisticsResult): StatisticsState {
  return data.detailsAvailable ? { status: 'success', data } : { status: 'suppressed', data };
}

function usesSmallCountryHero(state: StatisticsState, data: StatisticsResult, groupSize: number): boolean {
  if (state.status === 'suppressed') return true;
  if (groupSize < MIN_DETAILED_COHORT) return true;
  return data.sameCountryCount != null && data.sameCountryCount < MIN_DETAILED_COHORT;
}

export function StatisticsPanel({ state, profile, userScore, previousSnapshot }: StatisticsPanelProps) {
  const { t } = useI18n();
  const trackedEvents = useRef(new Set<string>());
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;
  const isReturningVisit = previousSnapshot != null;
  const groupSize = data?.groupResponseCount ?? 0;
  const progressCount = data ? getCohortProgressCount(data) : 0;
  const hasChanges =
    isReturningVisit && data != null && hasReturningVisitChanges(previousSnapshot ?? null, data);

  const scoreBreakdown = useMemo(() => {
    if (!profile || profile.scholarshipTrack !== 'nawa_director') return null;
    return getScoreBreakdown(
      profile.averageGrade,
      profile.maximumGrade,
      profile.polishSchoolLevel ?? 'none',
    );
  }, [profile]);

  const allocation = useMemo(() => {
    if (!data || !profile) return null;
    return buildAllocationSection(data, profile);
  }, [data, profile]);

  const availableSections = useMemo(() => {
    const sections = new Set<DashboardSectionId>();
    if (!data || !profile || !scoreBreakdown || userScore == null) return sections;

    sections.add('result_hero');

    if (hasChanges) sections.add('what_changed');

    if (
      state.status === 'success' &&
      canShowScoreDistribution(groupSize, data.scoreBuckets)
    ) {
      sections.add('distribution_detailed');
    }

    if (
      hasChanges &&
      data.reportedMeritOutcomes &&
      data.reportedMeritOutcomes.positiveCount + data.reportedMeritOutcomes.negativeCount > 0
    ) {
      sections.add('reported_merit_outcomes');
    }

    if (isReturningVisit && data.groupProgress) sections.add('group_progress');

    if (allocation?.showEstimate || allocation?.unavailableExplanation) {
      sections.add('allocation');
    }

    return sections;
  }, [
    allocation?.showEstimate,
    allocation?.unavailableExplanation,
    data,
    groupSize,
    hasChanges,
    isReturningVisit,
    profile,
    scoreBreakdown,
    state.status,
    userScore,
  ]);

  const sectionOrder = useMemo(
    () =>
      getDashboardSectionOrder(
        { isReturningVisit, hasChanges },
        availableSections,
      ),
    [availableSections, hasChanges, isReturningVisit],
  );

  const heroVariant = useMemo(() => {
    if (!data) return 'small_country' as const;
    return usesSmallCountryHero(state, data, groupSize) ? 'small_country' : 'detailed';
  }, [data, groupSize, state]);

  useEffect(() => {
    if (!data || !profile || state.status === 'loading') return;

    const maybeTrack = (eventName: Parameters<typeof trackProductEvent>[0]) => {
      if (trackedEvents.current.has(eventName)) return;
      trackedEvents.current.add(eventName);
      void trackProductEvent(eventName);
    };

    if (scoreBreakdown) maybeTrack('score_viewed');

    if (availableSections.has('result_hero')) {
      maybeTrack('position_or_fallback_viewed');
    }

    if (isReturningVisit) maybeTrack('dashboard_revisit');
  }, [availableSections, data, isReturningVisit, profile, scoreBreakdown, state.status]);

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

  const historicalRecords = buildHistoricalRecords(profile.rankingCountry);
  const countryCount = data.sameCountryCount ?? progressCount;
  const showTerminalMeritNegative = profile.currentStatus === 'merit_review_negative';
  const showTerminalScholarship = profile.currentStatus === 'scholarship_awarded';

  return (
    <section className="space-y-3" aria-label={t.stats.heroLabel}>
      {showTerminalMeritNegative ? <MeritNegativeOutcomeCard /> : null}

      {showTerminalScholarship ? (
        <ScholarshipAwardedCard statusChangedAt={profile.statusChangedAt} />
      ) : null}

      {sectionOrder.map((sectionId) => {
        switch (sectionId) {
          case 'result_hero':
            return (
              <ResultHeroCard
                key={sectionId}
                variant={heroVariant}
                total={scoreBreakdown.total}
                gradesScore={scoreBreakdown.gradesScore}
                polishSchoolBonus={scoreBreakdown.polishSchoolBonus}
                rankingCountry={profile.rankingCountry}
                userScore={userScore}
                data={heroVariant === 'detailed' ? data : undefined}
                track={profile.scholarshipTrack}
                countryCount={countryCount}
                trackWideMedian={data.trackWideMedian}
              />
            );
          case 'distribution_detailed':
            return data.scoreBuckets ? (
              <DistributionDetailsSection
                key={sectionId}
                buckets={data.scoreBuckets}
                track={profile.scholarshipTrack}
                userScore={userScore}
                medianScore={data.medianScore}
                groupSize={groupSize}
              />
            ) : null;
          case 'what_changed':
            return <WhatChangedCard key={sectionId} previous={previousSnapshot ?? null} current={data} />;
          case 'reported_merit_outcomes':
            return data.reportedMeritOutcomes ? (
              <ReportedMeritOutcomesCard key={sectionId} stats={data.reportedMeritOutcomes} />
            ) : null;
          case 'group_progress':
            return data.groupProgress ? (
              <ProgressInGroupCard key={sectionId} progress={data.groupProgress} />
            ) : null;
          case 'allocation':
            if (allocation?.showEstimate && allocation.countryEstimate) {
              return (
                <div key={sectionId} className="space-y-3">
                  <AllocationEstimateCard
                    estimate={allocation.countryEstimate}
                    groupEstimate={allocation.groupEstimate}
                  />
                  <HistoricalAllocationContext records={historicalRecords} rankingCountry={profile.rankingCountry} />
                </div>
              );
            }
            if (allocation?.unavailableExplanation) {
              return (
                <AllocationUnavailableNotice
                  key={sectionId}
                  explanation={allocation.unavailableExplanation}
                />
              );
            }
            return null;
          default:
            return null;
        }
      })}

      {state.status === 'success' ? <PositionHistoryList history={data.history} /> : null}

      <p className="text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.disclaimerShort}</p>
    </section>
  );
}
