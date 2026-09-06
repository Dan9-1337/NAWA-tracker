import type { ApplicationStatus } from '../../shared/contracts';
import { getTelegramUserId } from './telegram';

export const passportStageIds = [
  'profile_created',
  'submitted',
  'formal_positive',
  'merit_review',
  'decision',
] as const;

export type PassportStageId = (typeof passportStageIds)[number];

export type PassportStageState = 'completed' | 'current' | 'upcoming' | 'skipped';

export type PassportStage = {
  id: PassportStageId;
  state: PassportStageState;
  reachedAt: string | null;
  daysFromPrevious: number | null;
  tone: 'neutral' | 'positive' | 'negative';
};

const KEY_PREFIX = 'nawa-passport-dates';

function datesKey(): string {
  return `${KEY_PREFIX}:${getTelegramUserId() ?? 'anon'}`;
}

type PassportDates = Partial<Record<PassportStageId, string>>;

export function loadPassportDates(): PassportDates {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(datesKey());
    if (!raw) return {};
    return JSON.parse(raw) as PassportDates;
  } catch {
    return {};
  }
}

export function savePassportDates(dates: PassportDates): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(datesKey(), JSON.stringify(dates));
}

export function clearPassportDates(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(datesKey());
}

function stageReachedByStatus(status: ApplicationStatus): Set<PassportStageId> {
  const reached = new Set<PassportStageId>(['profile_created', 'submitted']);

  if (status === 'submitted') return reached;

  reached.add('formal_positive');

  if (
    status === 'merit_review_positive' ||
    status === 'merit_review_negative' ||
    status === 'scholarship_awarded'
  ) {
    reached.add('merit_review');
  }

  if (status === 'scholarship_awarded') {
    reached.add('decision');
  }

  return reached;
}

function currentStageId(status: ApplicationStatus): PassportStageId {
  if (status === 'submitted') return 'submitted';
  if (status === 'formal_review_positive') return 'formal_positive';
  if (status === 'merit_review_positive' || status === 'merit_review_negative') {
    return 'merit_review';
  }
  return 'decision';
}

function stageTone(status: ApplicationStatus, stageId: PassportStageId): PassportStage['tone'] {
  if (stageId === 'merit_review' && status === 'merit_review_negative') return 'negative';
  if (stageId === 'decision' && status === 'scholarship_awarded') return 'positive';
  if (stageId === 'merit_review' && status === 'merit_review_positive') return 'positive';
  return 'neutral';
}

function daysBetweenDates(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso.includes('T') ? fromIso : `${fromIso}T12:00:00`);
  const to = new Date(toIso.includes('T') ? toIso : `${toIso}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * Syncs reached stage dates into localStorage and returns the passport model.
 * Newly reached stages get `statusChangedAt` (or now) stamped once.
 */
export function buildPassportStages(
  status: ApplicationStatus,
  statusChangedAt: string,
  options?: { now?: Date },
): { stages: PassportStage[]; newlyStamped: PassportStageId[] } {
  const nowIso = (options?.now ?? new Date()).toISOString();
  const stamp = statusChangedAt || nowIso.slice(0, 10);
  const reached = stageReachedByStatus(status);
  const current = currentStageId(status);
  const stored = loadPassportDates();
  const newlyStamped: PassportStageId[] = [];

  for (const id of passportStageIds) {
    if (reached.has(id) && !stored[id]) {
      stored[id] = id === current ? stamp : stored[id] ?? stamp;
      newlyStamped.push(id);
    }
  }

  // Profile + submitted are always present for an authenticated user.
  if (!stored.profile_created) {
    stored.profile_created = stored.submitted ?? stamp;
  }
  if (!stored.submitted) {
    stored.submitted = stamp;
  }

  savePassportDates(stored);

  const visibleIds: PassportStageId[] =
    status === 'merit_review_negative'
      ? ['profile_created', 'submitted', 'formal_positive', 'merit_review']
      : [...passportStageIds];

  const stages: PassportStage[] = visibleIds.map((id, index) => {
    let state: PassportStageState;
    if (reached.has(id) && id === current) state = 'current';
    else if (reached.has(id)) state = 'completed';
    else state = 'upcoming';

    const reachedAt = stored[id] ?? null;
    const previousId = index > 0 ? visibleIds[index - 1] : null;
    const previousAt = previousId ? stored[previousId] ?? null : null;
    const daysFromPrevious =
      reachedAt && previousAt ? daysBetweenDates(previousAt, reachedAt) : null;

    return {
      id,
      state,
      reachedAt,
      daysFromPrevious,
      tone: stageTone(status, id),
    };
  });

  return { stages, newlyStamped };
}
