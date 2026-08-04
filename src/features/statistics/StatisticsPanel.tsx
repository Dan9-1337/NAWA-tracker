import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { getScoreBreakdown } from '../../../shared/nawa-score';
import type { DashboardSectionId } from '../../../shared/dashboard-layout';
import {
  getDashboardSectionOrder,
  resolveDashboardVisitMode,
} from '../../../shared/dashboard-layout';
import { PositionHistoryList } from '../../components/PositionHistoryList';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import type { StatsSnapshot } from '../../lib/stats-snapshot';
import { getCohortProgressCount, MIN_DETAILED_COHORT } from '../../lib/stats-verdict';
import { hasReturningVisitChanges } from '../../lib/position-change';
import { trackProductEvent } from '../../lib/product-events';
import { resolveContributionBadges } from '../../../shared/contribution-badges';
import { touchUserEngagement } from '../../lib/user-engagement';
import { CohortPulseCard } from '../dashboard/CohortPulseCard';
import { CommunityMilestonesCard } from '../dashboard/CommunityMilestonesCard';
import { ContributionBadgesRow } from '../dashboard/ContributionBadgesRow';
import { CountryContextCard } from '../dashboard/CountryContextCard';
import { DistributionDetailsSection } from '../dashboard/DistributionDetailsSection';
import { GlobalBenchmarkCard } from '../dashboard/GlobalBenchmarkCard';
import { MeritNegativeOutcomeCard } from '../dashboard/MeritNegativeOutcomeCard';
import { NawaPassport } from '../dashboard/NawaPassport';
import { ProgressInGroupCard } from '../dashboard/ProgressInGroupCard';
import { ReportedMeritOutcomesCard } from '../dashboard/ReportedMeritOutcomesCard';
import { ResultHeroCard } from '../dashboard/ResultHeroCard';
import { ScholarshipAwardedCard } from '../dashboard/ScholarshipAwardedCard';
import { WhatChangedCard } from '../dashboard/WhatChangedCard';
import { AllocationEstimateCard } from '../dashboard/allocation/AllocationEstimateCard';
import { AllocationUnavailableNotice } from '../dashboard/allocation/AllocationUnavailableNotice';
import { HistoricalAllocationContext } from '../dashboard/allocation/HistoricalAllocationContext';
import { buildAllocationSection, buildHistoricalRecords } from './allocation-section';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  /** True when the user just saved a formal/merit status in this session. */
  recentlyUpdatedStatus?: boolean;
};

export function statisticsStateFromResult(data: StatisticsResult): StatisticsState {
  return data.detailsAvailable ? { status: 'success', data } : { status: 'suppressed', data };
}

function usesSmallCountryHero(state: StatisticsState, data: StatisticsResult, groupSize: number): boolean {
  if (state.status === 'suppressed') return true;
  if (groupSize < MIN_DETAILED_COHORT) return true;
  return data.sameCountryCount != null && data.sameCountryCount < MIN_DETAILED_COHORT;
}

export function StatisticsPanel({
  state,
  profile,
  userScore,
  previousSnapshot,
  recentlyUpdatedStatus = false,
}: StatisticsPanelProps) {
  const { t, locale } = useI18n();
  const trackedEvents = useRef(new Set<string>());
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;
  const isReturningVisit = previousSnapshot != null;
  const groupSize = data?.groupResponseCount ?? 0;
  const progressCount = data ? getCohortProgressCount(data) : 0;
  const hasChanges =
    isReturningVisit && data != null && hasReturningVisitChanges(previousSnapshot ?? null, data);

  const visitMode = useMemo(() => {
    if (!profile) return 'first_result' as const;
    return resolveDashboardVisitMode({
      isReturningVisit,
      hasChanges,
      applicationStatus: profile.currentStatus,
      recentlyUpdatedStatus,
    });
  }, [hasChanges, isReturningVisit, profile, recentlyUpdatedStatus]);

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

  const [engagement, setEngagement] = useState<ReturnType<typeof touchUserEngagement> | null>(
    null,
  );

  useEffect(() => {
    if (!data || !profile) return;
    setEngagement(
      touchUserEngagement({
        countrySampleSize: data.sameCountryCount,
      }),
    );
  }, [data, profile]);

  const contributionBadges = useMemo(() => {
    if (!profile || !engagement) return [];
    return resolveContributionBadges({
      engagement,
      applicationStatus: profile.currentStatus,
      lastConfirmedAt: profile.statusChangedAt,
      seasonStartAt: '2026-03-01T00:00:00.000Z',
    });
  }, [engagement, profile]);

  const availableSections = useMemo(() => {
    const sections = new Set<DashboardSectionId>();
    if (!data || !profile || !scoreBreakdown || userScore == null) return sections;

    sections.add('result_hero');
    sections.add('nawa_passport');
    sections.add('global_benchmark');
    sections.add('country_context');

    if (contributionBadges.length > 0) {
      sections.add('contribution_badges');
    }

    if (data.globalBenchmark.sampleSize != null) {
      sections.add('community_milestones');
    }

    if (
      data.growth7d != null ||
      data.globalBenchmark.sampleSize != null ||
      data.globalBenchmark.representedCountryCount != null
    ) {
      sections.add('cohort_pulse');
    }

    if (hasChanges && visitMode !== 'terminal') sections.add('what_changed');

    if (
      state.status === 'success' &&
      canShowScoreDistribution(groupSize, data.scoreBuckets)
    ) {
      sections.add('distribution_detailed');
    }

    if (
      (hasChanges || visitMode === 'post_merit') &&
      data.reportedMeritOutcomes &&
      data.reportedMeritOutcomes.positiveCount + data.reportedMeritOutcomes.negativeCount > 0
    ) {
      sections.add('reported_merit_outcomes');
    }

    if (
      (isReturningVisit || visitMode === 'post_merit' || visitMode === 'terminal') &&
      data.groupProgress
    ) {
      sections.add('group_progress');
    }

    if (allocation?.showEstimate || allocation?.unavailableExplanation) {
      sections.add('allocation');
    }

    return sections;
  }, [
    allocation?.showEstimate,
    allocation?.unavailableExplanation,
    contributionBadges.length,
    data,
    groupSize,
    hasChanges,
    isReturningVisit,
    profile,
    scoreBreakdown,
    state.status,
    userScore,
    visitMode,
  ]);

  const sectionOrder = useMemo(
    () => getDashboardSectionOrder({ mode: visitMode }, availableSections),
    [availableSections, visitMode],
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
  const countryLabel = formatCountryLabel(profile.rankingCountry, locale);

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
                trackWideMedian={data.globalBenchmark.median ?? data.trackWideMedian}
                previousSnapshot={previousSnapshot}
              />
            );
          case 'nawa_passport':
            return (
              <NawaPassport
                key={sectionId}
                status={profile.currentStatus}
                statusChangedAt={profile.statusChangedAt}
                compact={visitMode === 'terminal'}
                celebrateNewStage={recentlyUpdatedStatus || visitMode === 'post_merit'}
              />
            );
          case 'contribution_badges':
            return <ContributionBadgesRow key={sectionId} badges={contributionBadges} />;
          case 'global_benchmark':
            return (
              <GlobalBenchmarkCard
                key={sectionId}
                userScore={userScore}
                benchmark={data.globalBenchmark}
                track={profile.scholarshipTrack}
              />
            );
          case 'country_context':
            return (
              <CountryContextCard
                key={sectionId}
                rankingCountry={profile.rankingCountry}
                countryContext={data.countryContext}
                globalBenchmark={data.globalBenchmark}
              />
            );
          case 'cohort_pulse':
            return (
              <CohortPulseCard
                key={sectionId}
                growth={data.growth7d}
                globalBenchmark={data.globalBenchmark}
                reportedMeritOutcomes={data.reportedMeritOutcomes}
                rankingCountryLabel={countryLabel}
              />
            );
          case 'community_milestones':
            return (
              <CommunityMilestonesCard
                key={sectionId}
                globalBenchmark={data.globalBenchmark}
                reportedMeritOutcomes={data.reportedMeritOutcomes}
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
            return (
              <WhatChangedCard key={sectionId} previous={previousSnapshot ?? null} current={data} />
            );
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
                  <HistoricalAllocationContext
                    records={historicalRecords}
                    rankingCountry={profile.rankingCountry}
                  />
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

      <p className="text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">
        {t.stats.disclaimerShort}
      </p>
    </section>
  );
}
