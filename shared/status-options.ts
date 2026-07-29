import type { ApplicationStatus } from './contracts';

const nextStatusesByCurrent: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  submitted: ['formal_review_positive'],
  formal_review_positive: ['merit_review_positive', 'merit_review_negative'],
  merit_review_positive: ['scholarship_awarded'],
  merit_review_negative: [],
  scholarship_awarded: [],
};

export function getAllowedNextStatuses(current: ApplicationStatus): readonly ApplicationStatus[] {
  return nextStatusesByCurrent[current] ?? [];
}

/**
 * Statuses selectable when updating from `current`:
 * always includes `current`, plus the next allowed steps.
 */
export function getSequentialStatusOptions(current: ApplicationStatus): ApplicationStatus[] {
  const next = nextStatusesByCurrent[current] ?? [];
  const seen = new Set<ApplicationStatus>();
  const options: ApplicationStatus[] = [];

  for (const status of [current, ...next]) {
    if (seen.has(status)) continue;
    seen.add(status);
    options.push(status);
  }

  return options;
}

export function isAllowedStatusTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return true;
  return getAllowedNextStatuses(from).includes(to);
}
