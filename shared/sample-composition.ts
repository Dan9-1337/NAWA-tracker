export type ShareStability = 'stable' | 'volatile' | 'unknown';

export type SampleCompositionLevel = 'insufficient' | 'partial' | 'broad';

export type CountryShareEntry = {
  country: string;
  share: number;
  applicationCount: number;
};

export type SampleCompositionQuality = {
  totalApplicationCount: number;
  representedCountryCount: number;
  countryShares: CountryShareEntry[];
  /** Inverse Herfindahl index — distinguishes 200 apps from 2 countries vs 10 countries. */
  effectiveCountryCount: number;
  shareStability: ShareStability;
  largestCohortsStable: boolean;
  sufficientCrossCountryCoverage: boolean;
  level: SampleCompositionLevel;
};

export type ComputeSampleCompositionInput = {
  countryCounts: Array<{ country: string; applicationCount: number }>;
  shareStability?: ShareStability;
  largestCohortsStable?: boolean;
};

const MIN_TOTAL_FOR_BROAD = 150;
const MIN_TOTAL_FOR_PARTIAL = 100;
const MIN_EFFECTIVE_COUNTRIES_FOR_COVERAGE = 2.5;
const MIN_REPRESENTED_COUNTRIES_FOR_COVERAGE = 4;
const MIN_EFFECTIVE_COUNTRIES_FOR_BROAD = 2.5;
const MIN_REPRESENTED_COUNTRIES_FOR_BROAD = 5;

export function computeEffectiveCountryCount(shares: number[]): number {
  if (shares.length === 0) return 0;
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);
  if (hhi <= 0) return 0;
  return 1 / hhi;
}

export function computeSampleCompositionQuality(
  input: ComputeSampleCompositionInput,
): SampleCompositionQuality {
  const totalApplicationCount = input.countryCounts.reduce(
    (sum, entry) => sum + entry.applicationCount,
    0,
  );

  const countryShares: CountryShareEntry[] = input.countryCounts
    .filter((entry) => entry.applicationCount > 0)
    .map((entry) => ({
      country: entry.country,
      share: totalApplicationCount > 0 ? entry.applicationCount / totalApplicationCount : 0,
      applicationCount: entry.applicationCount,
    }))
    .sort((a, b) => b.applicationCount - a.applicationCount);

  const representedCountryCount = countryShares.length;
  const effectiveCountryCount = computeEffectiveCountryCount(
    countryShares.map((entry) => entry.share),
  );

  const shareStability = input.shareStability ?? 'unknown';
  const largestCohortsStable = input.largestCohortsStable ?? shareStability !== 'volatile';

  const sufficientCrossCountryCoverage =
    effectiveCountryCount >= MIN_EFFECTIVE_COUNTRIES_FOR_COVERAGE &&
    representedCountryCount >= MIN_REPRESENTED_COUNTRIES_FOR_COVERAGE;

  const level = resolveCompositionLevel({
    totalApplicationCount,
    effectiveCountryCount,
    representedCountryCount,
    sufficientCrossCountryCoverage,
    shareStability,
    largestCohortsStable,
  });

  return {
    totalApplicationCount,
    representedCountryCount,
    countryShares,
    effectiveCountryCount,
    shareStability,
    largestCohortsStable,
    sufficientCrossCountryCoverage,
    level,
  };
}

function resolveCompositionLevel(input: {
  totalApplicationCount: number;
  effectiveCountryCount: number;
  representedCountryCount: number;
  sufficientCrossCountryCoverage: boolean;
  shareStability: ShareStability;
  largestCohortsStable: boolean;
}): SampleCompositionLevel {
  if (
    input.totalApplicationCount < MIN_TOTAL_FOR_PARTIAL ||
    input.effectiveCountryCount < 2 ||
    input.representedCountryCount < 3
  ) {
    return 'insufficient';
  }

  const meetsBroadThresholds =
    input.totalApplicationCount >= MIN_TOTAL_FOR_BROAD &&
    input.effectiveCountryCount >= MIN_EFFECTIVE_COUNTRIES_FOR_BROAD &&
    input.representedCountryCount >= MIN_REPRESENTED_COUNTRIES_FOR_BROAD &&
    input.sufficientCrossCountryCoverage &&
    input.shareStability !== 'volatile' &&
    input.largestCohortsStable;

  return meetsBroadThresholds ? 'broad' : 'partial';
}
