export const communityMilestoneIds = [
  'apps_100',
  'apps_500',
  'apps_1000',
  'countries_10',
  'countries_20',
  'first_merit_outcomes',
  'detailed_cohorts_7',
] as const;

export type CommunityMilestoneId = (typeof communityMilestoneIds)[number];

export type ResolveCommunityMilestonesInput = {
  sampleSize: number | null;
  representedCountryCount: number | null;
  detailedCountriesCount: number | null;
  meritOutcomeCount: number;
};

export function resolveCommunityMilestones(input: ResolveCommunityMilestonesInput): {
  unlocked: CommunityMilestoneId[];
  latest: CommunityMilestoneId | null;
} {
  const unlocked: CommunityMilestoneId[] = [];

  if ((input.sampleSize ?? 0) >= 100) unlocked.push('apps_100');
  if ((input.sampleSize ?? 0) >= 500) unlocked.push('apps_500');
  if ((input.sampleSize ?? 0) >= 1000) unlocked.push('apps_1000');
  if ((input.representedCountryCount ?? 0) >= 10) unlocked.push('countries_10');
  if ((input.representedCountryCount ?? 0) >= 20) unlocked.push('countries_20');
  if (input.meritOutcomeCount > 0) unlocked.push('first_merit_outcomes');
  if ((input.detailedCountriesCount ?? 0) >= 7) unlocked.push('detailed_cohorts_7');

  return {
    unlocked,
    latest: unlocked.length > 0 ? unlocked[unlocked.length - 1]! : null,
  };
}
