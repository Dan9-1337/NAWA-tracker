import { describe, expect, it } from 'vitest';
import {
  resolveContributionBadges,
  type UserEngagementSnapshot,
} from './contribution-badges';

const baseEngagement: UserEngagementSnapshot = {
  firstSeenAt: '2026-03-01T10:00:00.000Z',
  lastSeenAt: '2026-08-04T10:00:00.000Z',
  statusUpdateCount: 0,
  profileUpdateCount: 0,
  firstSeenCountrySampleSize: 4,
  sawDetailedStats: false,
};

describe('resolveContributionBadges', () => {
  it('never awards badges based on score', () => {
    const badges = resolveContributionBadges({
      engagement: baseEngagement,
      applicationStatus: 'submitted',
      lastConfirmedAt: null,
      now: new Date('2026-08-04T12:00:00.000Z'),
    });
    expect(badges).not.toContain('day_one');
    expect(badges.every((id) => id !== ('high_score' as never))).toBe(true);
  });

  it('awards Day One within the season window', () => {
    expect(
      resolveContributionBadges({
        engagement: { ...baseEngagement, firstSeenAt: '2026-03-05T10:00:00.000Z' },
        applicationStatus: 'submitted',
        lastConfirmedAt: null,
        seasonStartAt: '2026-03-01T00:00:00.000Z',
        now: new Date('2026-08-04T12:00:00.000Z'),
      }),
    ).toContain('day_one');
  });

  it('awards Cohort OG when the user joined before detailed stats', () => {
    expect(
      resolveContributionBadges({
        engagement: {
          ...baseEngagement,
          firstSeenCountrySampleSize: 6,
          sawDetailedStats: true,
        },
        applicationStatus: 'submitted',
        lastConfirmedAt: null,
      }),
    ).toContain('cohort_og');
  });

  it('awards Fresh Data, Status Scout, Comeback, Data Contributor, Final Form', () => {
    const badges = resolveContributionBadges({
      engagement: {
        ...baseEngagement,
        statusUpdateCount: 2,
        profileUpdateCount: 1,
        daysSincePreviousVisit: 20,
      },
      applicationStatus: 'scholarship_awarded',
      lastConfirmedAt: '2026-08-02',
      now: new Date('2026-08-04T12:00:00.000Z'),
    });

    expect(badges).toEqual([
      'fresh_data',
      'status_scout',
      'comeback',
      'data_contributor',
      'final_form',
    ]);
  });
});
