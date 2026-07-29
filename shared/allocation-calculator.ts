import { shouldUseCountryAndGroupEstimate } from './country-allocation-profiles';
import type { SampleCompositionQuality } from './sample-composition';
import type { ShareStability } from './sample-composition';

export type AllocationDataBasis = 'submitted_proxy' | 'reported_formal_positive';

export type AllocationConfidence = 'insufficient' | 'low' | 'medium' | 'higher';

export type EstimatedSeatRange = { min: number; max: number };

export type AllocationDisplayMode =
  | 'insufficient_data'
  | 'country_estimate'
  | 'country_and_group_estimate';

export type SeatAllocationEstimate = {
  scope: 'country' | 'country_group';
  scopeId: string;
  applicationCount: number;
  totalApplicationCount: number;
  applicationShare: number;
  totalSeatScenario: number;
  estimatedSeatRange: EstimatedSeatRange;
  userRankInScope: number | null;
  sampleSize: number;
  dataBasis: AllocationDataBasis;
  confidence: AllocationConfidence;
  isOfficial: false;
};

const MIN_TOTAL_APPLICATION_COUNT = 150;
const MIN_APPLICATION_COUNT_IN_SCOPE = 10;
const RANGE_MARGIN_FRACTION = 0.1;
const MIN_RANGE_WIDTH = 2;

export function calculateApplicationShare(
  applicationCountInScope: number,
  totalApplicationCount: number,
): number {
  if (totalApplicationCount <= 0) return 0;
  return applicationCountInScope / totalApplicationCount;
}

export function calculateAllocationRange(
  applicationShare: number,
  totalSeatScenario: number,
): EstimatedSeatRange {
  const raw = applicationShare * totalSeatScenario;
  if (raw <= 0) {
    return { min: 0, max: 0 };
  }

  const margin = Math.max(MIN_RANGE_WIDTH, Math.round(raw * RANGE_MARGIN_FRACTION));
  const center = Math.round(raw);
  const min = Math.max(0, center - margin);
  const max = Math.max(min, center + margin);

  return { min, max };
}

export function calculateCountryAllocation(input: {
  country: string;
  applicationCountInScope: number;
  totalApplicationCount: number;
  totalSeatScenario: number;
  userRankInScope?: number | null;
  dataBasis?: AllocationDataBasis;
}): SeatAllocationEstimate {
  const applicationShare = calculateApplicationShare(
    input.applicationCountInScope,
    input.totalApplicationCount,
  );

  return {
    scope: 'country',
    scopeId: input.country,
    applicationCount: input.applicationCountInScope,
    totalApplicationCount: input.totalApplicationCount,
    applicationShare,
    totalSeatScenario: input.totalSeatScenario,
    estimatedSeatRange: calculateAllocationRange(applicationShare, input.totalSeatScenario),
    userRankInScope: input.userRankInScope ?? null,
    sampleSize: input.applicationCountInScope,
    dataBasis: input.dataBasis ?? 'submitted_proxy',
    confidence: resolveConfidence({
      applicationCountInScope: input.applicationCountInScope,
      totalApplicationCount: input.totalApplicationCount,
      applicationShare,
    }),
    isOfficial: false,
  };
}

export function calculateCountryGroupAllocation(input: {
  groupId: string;
  applicationCountInScope: number;
  totalApplicationCount: number;
  totalSeatScenario: number;
  userRankInScope?: number | null;
  dataBasis?: AllocationDataBasis;
}): SeatAllocationEstimate {
  const applicationShare = calculateApplicationShare(
    input.applicationCountInScope,
    input.totalApplicationCount,
  );

  return {
    scope: 'country_group',
    scopeId: input.groupId,
    applicationCount: input.applicationCountInScope,
    totalApplicationCount: input.totalApplicationCount,
    applicationShare,
    totalSeatScenario: input.totalSeatScenario,
    estimatedSeatRange: calculateAllocationRange(applicationShare, input.totalSeatScenario),
    userRankInScope: input.userRankInScope ?? null,
    sampleSize: input.applicationCountInScope,
    dataBasis: input.dataBasis ?? 'submitted_proxy',
    confidence: resolveConfidence({
      applicationCountInScope: input.applicationCountInScope,
      totalApplicationCount: input.totalApplicationCount,
      applicationShare,
    }),
    isOfficial: false,
  };
}

export function shouldShowAllocationEstimate(input: {
  totalApplicationCount: number;
  applicationCountInScope: number;
  scopeShareStability: ShareStability;
  sampleComposition: SampleCompositionQuality;
}): boolean {
  if (input.totalApplicationCount < MIN_TOTAL_APPLICATION_COUNT) return false;
  if (input.applicationCountInScope < MIN_APPLICATION_COUNT_IN_SCOPE) return false;
  if (input.sampleComposition.level === 'insufficient') return false;
  if (!input.sampleComposition.sufficientCrossCountryCoverage) return false;
  if (!input.sampleComposition.largestCohortsStable) return false;
  if (input.sampleComposition.shareStability === 'volatile') return false;
  if (input.scopeShareStability === 'volatile') return false;
  return true;
}

export function getAllocationDisplayMode(input: {
  country: string;
  applicationCountInScope: number;
  totalApplicationCount: number;
  scopeShareStability: ShareStability;
  sampleComposition: SampleCompositionQuality;
}): AllocationDisplayMode {
  if (
    !shouldShowAllocationEstimate({
      totalApplicationCount: input.totalApplicationCount,
      applicationCountInScope: input.applicationCountInScope,
      scopeShareStability: input.scopeShareStability,
      sampleComposition: input.sampleComposition,
    })
  ) {
    return 'insufficient_data';
  }

  const applicationShare = calculateApplicationShare(
    input.applicationCountInScope,
    input.totalApplicationCount,
  );

  if (
    shouldUseCountryAndGroupEstimate({
      country: input.country,
      applicationCountInScope: input.applicationCountInScope,
      applicationShare,
      totalApplicationCount: input.totalApplicationCount,
    })
  ) {
    return 'country_and_group_estimate';
  }

  return 'country_estimate';
}

export function getConfidenceExplanation(
  estimate: SeatAllocationEstimate,
  sampleComposition: SampleCompositionQuality,
): string {
  if (estimate.confidence === 'insufficient') {
    if (sampleComposition.totalApplicationCount < MIN_TOTAL_APPLICATION_COUNT) {
      return `The overall NAWAmeter sample is still small (${sampleComposition.totalApplicationCount} applications from ${sampleComposition.representedCountryCount} countries).`;
    }
    return 'There is not yet enough data to explain this allocation estimate reliably.';
  }

  if (estimate.confidence === 'low') {
    if (sampleComposition.shareStability === 'volatile') {
      return `Preliminary estimate: ${sampleComposition.totalApplicationCount} applications from ${sampleComposition.representedCountryCount} countries, but country shares are still shifting quickly.`;
    }
    return `Preliminary estimate based on ${sampleComposition.totalApplicationCount} applications across ${sampleComposition.representedCountryCount} countries.`;
  }

  if (estimate.confidence === 'medium') {
    return `Estimate based on ${sampleComposition.totalApplicationCount} applications from ${sampleComposition.representedCountryCount} countries with moderate sample coverage.`;
  }

  return `Estimate based on a broad sample of ${sampleComposition.totalApplicationCount} applications from ${sampleComposition.representedCountryCount} countries.`;
}

function resolveConfidence(input: {
  applicationCountInScope: number;
  totalApplicationCount: number;
  applicationShare: number;
}): AllocationConfidence {
  if (
    input.totalApplicationCount < MIN_TOTAL_APPLICATION_COUNT ||
    input.applicationCountInScope < MIN_APPLICATION_COUNT_IN_SCOPE
  ) {
    return 'insufficient';
  }

  if (input.applicationCountInScope < 20 || input.applicationShare < 0.02) {
    return 'low';
  }

  if (input.applicationCountInScope < 35 || input.totalApplicationCount < 250) {
    return 'medium';
  }

  return 'higher';
}
