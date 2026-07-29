import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import {
  calculateCountryAllocation,
  calculateCountryGroupAllocation,
  getAllocationDisplayMode,
  getConfidenceExplanation,
  type SeatAllocationEstimate,
} from '../../../shared/allocation-calculator';
import { getIllustrativeGroupIdForCountry } from '../../../shared/country-allocation-profiles';
import {
  getCountryHistoricalSeatRecords,
  getHistoricalGroupsForCountry,
  getHistoricalSeatRecordByGroupId,
} from '../../../shared/historical-seat-records';
import { computeSampleCompositionQuality } from '../../../shared/sample-composition';
import { getDefaultTotalSeatScenario } from '../../../shared/total-seat-scenarios';
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
import {
  AllocationEstimateCard,
  type SeatAllocationEstimateView,
} from '../dashboard/allocation/AllocationEstimateCard';
import { AllocationUnavailableNotice } from '../dashboard/allocation/AllocationUnavailableNotice';
import {
  HistoricalAllocationContext,
  type HistoricalSeatRecordView,
} from '../dashboard/allocation/HistoricalAllocationContext';
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

function estimateSampleComposition(data: StatisticsResult, rankingCountry: string) {
  const countryCount = data.sameCountryCount ?? data.groupResponseCount;
  const remainder = Math.max(0, data.sameTrackCount - countryCount);
  const impliedCountries = Math.max(5, Math.min(12, Math.round(data.sameTrackCount / Math.max(countryCount, 1))));
  const otherShare = impliedCountries > 1 ? Math.floor(remainder / (impliedCountries - 1)) : 0;

  return computeSampleCompositionQuality({
    countryCounts: [
      { country: rankingCountry, applicationCount: countryCount },
      ...Array.from({ length: impliedCountries - 1 }, (_, index) => ({
        country: `OTHER_${index}`,
        applicationCount: otherShare,
      })),
    ],
    shareStability: 'stable',
    largestCohortsStable: true,
  });
}

function toEstimateView(
  estimate: SeatAllocationEstimate,
  sampleComposition: ReturnType<typeof estimateSampleComposition>,
  groupScenarioLabel?: string,
): SeatAllocationEstimateView {
  return {
    scope: estimate.scope,
    applicationCount: estimate.applicationCount,
    totalApplicationCount: estimate.totalApplicationCount,
    applicationShare: estimate.applicationShare,
    estimatedSeatRange: estimate.estimatedSeatRange,
    userRankInScope: estimate.userRankInScope,
    sampleSize: estimate.sampleSize,
    dataBasis: estimate.dataBasis,
    confidenceExplanation: getConfidenceExplanation(estimate, sampleComposition),
    groupScenarioLabel,
  };
}

function buildHistoricalRecords(rankingCountry: string): HistoricalSeatRecordView[] {
  const records: HistoricalSeatRecordView[] = [];

  for (const record of getCountryHistoricalSeatRecords(rankingCountry)) {
    records.push({
      year: record.year,
      scope: record.scope,
      seats: record.seats,
      sourceLabel: record.sourceLabel,
      sourceNote: record.sourceNote,
      country: record.country,
    });
  }

  for (const record of getHistoricalGroupsForCountry(rankingCountry)) {
    records.push({
      year: record.year,
      scope: record.scope,
      seats: record.seats,
      sourceLabel: record.sourceLabel,
      sourceNote: record.sourceNote,
      groupMembers: record.groupMembers,
    });
  }

  return records;
}

function buildAllocationSection(
  data: StatisticsResult,
  profile: ResponseFormInput,
): {
  showEstimate: boolean;
  countryEstimate: SeatAllocationEstimateView | null;
  groupEstimate: SeatAllocationEstimateView | null;
  unavailableExplanation: string | null;
} {
  const applicationCountInScope = data.sameCountryCount ?? data.groupResponseCount;
  const totalApplicationCount = data.sameTrackCount;
  const sampleComposition = estimateSampleComposition(data, profile.rankingCountry);
  const displayMode = getAllocationDisplayMode({
    country: profile.rankingCountry,
    applicationCountInScope,
    totalApplicationCount,
    scopeShareStability: 'stable',
    sampleComposition,
  });

  if (displayMode === 'insufficient_data') {
    return {
      showEstimate: false,
      countryEstimate: null,
      groupEstimate: null,
      unavailableExplanation: getConfidenceExplanation(
        calculateCountryAllocation({
          country: profile.rankingCountry,
          applicationCountInScope,
          totalApplicationCount,
          totalSeatScenario: getDefaultTotalSeatScenario().totalSeats,
        }),
        sampleComposition,
      ),
    };
  }

  const totalSeatScenario = getDefaultTotalSeatScenario().totalSeats;
  const countryEstimate = calculateCountryAllocation({
    country: profile.rankingCountry,
    applicationCountInScope,
    totalApplicationCount,
    totalSeatScenario,
    userRankInScope: data.rankPosition,
  });

  let groupEstimate: SeatAllocationEstimate | null = null;
  if (displayMode === 'country_and_group_estimate') {
    const groupId = getIllustrativeGroupIdForCountry(profile.rankingCountry);
    const groupRecord = groupId ? getHistoricalSeatRecordByGroupId(groupId) : null;
    if (groupRecord?.groupMembers) {
      const groupApplicationCount = Math.max(
        applicationCountInScope,
        Math.round(totalApplicationCount * (groupRecord.groupMembers.length / 20)),
      );
      groupEstimate = calculateCountryGroupAllocation({
        groupId,
        applicationCountInScope: groupApplicationCount,
        totalApplicationCount,
        totalSeatScenario,
        userRankInScope: data.rankPosition,
      });
    }
  }

  return {
    showEstimate: true,
    countryEstimate: toEstimateView(countryEstimate, sampleComposition),
    groupEstimate: groupEstimate
      ? toEstimateView(groupEstimate, sampleComposition, groupEstimate.scopeId)
      : null,
    unavailableExplanation: null,
  };
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
