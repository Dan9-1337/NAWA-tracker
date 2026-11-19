import type { ApplicationStatus } from './contracts';

/**
 * Forward moves only: anyone may jump straight to a later stage (people join after the results are out).
 * A negative merit review ends the ladder; the two seat decisions can be corrected into each other.
 */
const nextStatusesByCurrent: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  submitted: [
    'formal_review_positive',
    'merit_review_positive',
    'merit_review_negative',
    'scholarship_awarded',
    'scholarship_not_awarded',
  ],
  formal_review_positive: [
    'merit_review_positive',
    'merit_review_negative',
    'scholarship_awarded',
    'scholarship_not_awarded',
  ],
  merit_review_positive: ['scholarship_awarded', 'scholarship_not_awarded'],
  merit_review_negative: [],
  scholarship_awarded: ['scholarship_not_awarded'],
  scholarship_not_awarded: ['scholarship_awarded'],
};

export function getAllowedNextStatuses(current: ApplicationStatus): readonly ApplicationStatus[] {
  return nextStatusesByCurrent[current] ?? [];
}

/**
 * Statuses selectable when updating from `current`:
 * always includes `current`, plus every allowed later stage.
 */
export function getStatusOptions(current: ApplicationStatus): ApplicationStatus[] {
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
