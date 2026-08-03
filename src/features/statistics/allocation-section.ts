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
import type { SeatAllocationEstimateView } from '../dashboard/allocation/AllocationEstimateCard';
import type { HistoricalSeatRecordView } from '../dashboard/allocation/HistoricalAllocationContext';

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

export function buildHistoricalRecords(rankingCountry: string): HistoricalSeatRecordView[] {
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

export function buildAllocationSection(
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
    if (groupRecord?.groupMembers && groupId) {
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
