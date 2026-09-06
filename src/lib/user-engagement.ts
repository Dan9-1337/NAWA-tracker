import type { ApplicationStatus } from '../../shared/contracts';
import { getTelegramUserId } from './telegram';
import type { UserEngagementSnapshot } from '../../shared/contribution-badges';

const KEY_PREFIX = 'nawa-engagement';

function storageKey(): string {
  return `${KEY_PREFIX}:${getTelegramUserId() ?? 'anon'}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function loadUserEngagement(): UserEngagementSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    return JSON.parse(raw) as UserEngagementSnapshot;
  } catch {
    return null;
  }
}

export function saveUserEngagement(snapshot: UserEngagementSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey(), JSON.stringify(snapshot));
}

export function clearUserEngagement(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(storageKey());
}

export type TouchEngagementInput = {
  countrySampleSize: number | null;
  /** Increment status update counter. */
  statusUpdated?: boolean;
  /** Increment profile update counter. */
  profileUpdated?: boolean;
  now?: Date;
};

/**
 * Records a dashboard visit / contribution event and returns the snapshot
 * used for badge resolution (including daysSincePreviousVisit before refresh).
 */
export function touchUserEngagement(input: TouchEngagementInput): UserEngagementSnapshot {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const previous = loadUserEngagement();

  if (!previous) {
    const created: UserEngagementSnapshot = {
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      statusUpdateCount: input.statusUpdated ? 1 : 0,
      profileUpdateCount: input.profileUpdated ? 1 : 0,
      firstSeenCountrySampleSize: input.countrySampleSize,
      sawDetailedStats: (input.countrySampleSize ?? 0) >= 10,
      daysSincePreviousVisit: 0,
    };
    saveUserEngagement(created);
    return created;
  }

  const lastSeen = new Date(previous.lastSeenAt);
  const daysSincePreviousVisit = Number.isNaN(lastSeen.getTime())
    ? 0
    : Math.floor((now.getTime() - lastSeen.getTime()) / DAY_MS);

  const next: UserEngagementSnapshot = {
    ...previous,
    lastSeenAt: nowIso,
    statusUpdateCount: previous.statusUpdateCount + (input.statusUpdated ? 1 : 0),
    profileUpdateCount: previous.profileUpdateCount + (input.profileUpdated ? 1 : 0),
    firstSeenCountrySampleSize:
      previous.firstSeenCountrySampleSize ?? input.countrySampleSize,
    sawDetailedStats:
      previous.sawDetailedStats || (input.countrySampleSize ?? 0) >= 10,
    daysSincePreviousVisit,
  };

  saveUserEngagement(next);
  return next;
}
