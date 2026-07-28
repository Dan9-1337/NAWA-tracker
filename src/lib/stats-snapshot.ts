import type { StatisticsResult } from '../../shared/contracts';
import { getTelegramUserId } from './telegram';

const SNAPSHOT_KEY_PREFIX = 'nawa-stats-snapshot';

// Scoped by Telegram user id so one account never sees another account's cached snapshot.
function snapshotStorageKey(): string {
  return `${SNAPSHOT_KEY_PREFIX}:${getTelegramUserId() ?? 'anon'}`;
}

export type StatsSnapshot = {
  groupResponseCount: number;
  lowerScorePercentage: number | null;
  medianScore: number | null;
  sameTrackCount: number;
  sameCountryCount: number | null;
  fetchedAt: string;
};

export function snapshotFromStatistics(data: StatisticsResult): StatsSnapshot {
  return {
    groupResponseCount: data.groupResponseCount,
    lowerScorePercentage: data.lowerScorePercentage,
    medianScore: data.medianScore,
    sameTrackCount: data.sameTrackCount,
    sameCountryCount: data.sameCountryCount,
    fetchedAt: new Date().toISOString(),
  };
}

export function loadStatsSnapshot(): StatsSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(snapshotStorageKey());
    if (!raw) return null;
    return JSON.parse(raw) as StatsSnapshot;
  } catch {
    return null;
  }
}

export function saveStatsSnapshot(snapshot: StatsSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(snapshotStorageKey(), JSON.stringify(snapshot));
}

export function clearStatsSnapshot(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(snapshotStorageKey());
}
