import type { ApplicationStatus } from './contracts';
import { MIN_K_ANONYMITY } from './product-rules';
import { isTerminalApplicationStatus } from './status-transitions';

export const contributionBadgeIds = [
  'day_one',
  'cohort_og',
  'fresh_data',
  'status_scout',
  'comeback',
  'data_contributor',
  'final_form',
] as const;

export type ContributionBadgeId = (typeof contributionBadgeIds)[number];

export type UserEngagementSnapshot = {
  firstSeenAt: string;
  lastSeenAt: string;
  statusUpdateCount: number;
  profileUpdateCount: number;
  /** Country sample size when the user was first seen (null = unknown). */
  firstSeenCountrySampleSize: number | null;
  /** True once the user's country cohort has been observed at or above k. */
  sawDetailedStats: boolean;
  /**
   * Days between the previous visit and the current one, captured before
   * lastSeenAt is refreshed. Used for Comeback.
   */
  daysSincePreviousVisit?: number;
};

export type ResolveContributionBadgesInput = {
  engagement: UserEngagementSnapshot;
  applicationStatus: ApplicationStatus;
  /** ISO date (YYYY-MM-DD) or datetime of the latest status/profile confirmation. */
  lastConfirmedAt: string | null;
  now?: Date;
  /** Season start for Day One — early participants in the first two weeks. */
  seasonStartAt?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_DATA_DAYS = 7;
const COMEBACK_GAP_DAYS = 14;
const DAY_ONE_WINDOW_DAYS = 14;

function parseInstant(value: string): Date | null {
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Pure badge rules — gamifies contribution and return visits, never score.
 * Badges never gate access to statistics.
 */
export function resolveContributionBadges(
  input: ResolveContributionBadgesInput,
): ContributionBadgeId[] {
  const now = input.now ?? new Date();
  const unlocked = new Set<ContributionBadgeId>();
  const { engagement } = input;

  const firstSeen = parseInstant(engagement.firstSeenAt);
  const seasonStart = input.seasonStartAt ? parseInstant(input.seasonStartAt) : null;
  if (firstSeen && seasonStart) {
    const dayOneDeadline = new Date(seasonStart.getTime() + DAY_ONE_WINDOW_DAYS * DAY_MS);
    if (firstSeen >= seasonStart && firstSeen <= dayOneDeadline) {
      unlocked.add('day_one');
    }
  }

  if (
    engagement.firstSeenCountrySampleSize != null &&
    engagement.firstSeenCountrySampleSize < MIN_K_ANONYMITY &&
    engagement.sawDetailedStats
  ) {
    unlocked.add('cohort_og');
  }

  if (input.lastConfirmedAt) {
    const confirmed = parseInstant(input.lastConfirmedAt);
    if (confirmed && daysBetween(confirmed, now) <= FRESH_DATA_DAYS) {
      unlocked.add('fresh_data');
    }
  }

  if (engagement.statusUpdateCount >= 2) {
    unlocked.add('status_scout');
  }

  if (
    engagement.daysSincePreviousVisit != null &&
    engagement.daysSincePreviousVisit >= COMEBACK_GAP_DAYS
  ) {
    unlocked.add('comeback');
  }

  if (engagement.statusUpdateCount + engagement.profileUpdateCount >= 3) {
    unlocked.add('data_contributor');
  }

  if (isTerminalApplicationStatus(input.applicationStatus)) {
    unlocked.add('final_form');
  }

  return contributionBadgeIds.filter((id) => unlocked.has(id));
}
