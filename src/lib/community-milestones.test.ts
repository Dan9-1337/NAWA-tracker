import { describe, expect, it } from 'vitest';
import { resolveCommunityMilestones } from './community-milestones';

describe('resolveCommunityMilestones', () => {
  it('unlocks milestones from global sample aggregates only', () => {
    const result = resolveCommunityMilestones({
      sampleSize: 520,
      representedCountryCount: 12,
      detailedCountriesCount: 7,
      meritOutcomeCount: 3,
    });

    expect(result.unlocked).toEqual([
      'apps_100',
      'apps_500',
      'countries_10',
      'first_merit_outcomes',
      'detailed_cohorts_7',
    ]);
    expect(result.latest).toBe('detailed_cohorts_7');
  });

  it('returns empty when the sample is too small', () => {
    expect(
      resolveCommunityMilestones({
        sampleSize: 40,
        representedCountryCount: 3,
        detailedCountriesCount: 1,
        meritOutcomeCount: 0,
      }).unlocked,
    ).toEqual([]);
  });
});
