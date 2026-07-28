import type { ApplicationStatus } from './contracts';
import { applicationStatuses } from './contracts';

/**
 * Forward (and side-branch) statuses offered after the current one.
 * Keeps the picker focused on the next pipeline steps instead of every outcome.
 */
const nextStatusesByCurrent: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  submitted: ['formal_review_in_progress', 'correction_requested', 'formal_review_completed'],
  formal_review_in_progress: ['correction_requested', 'formal_review_completed'],
  correction_requested: ['formal_review_in_progress', 'formal_review_completed'],
  formal_review_completed: [
    'merit_review_in_progress',
    'merit_review_positive',
    'merit_review_negative',
  ],
  merit_review_in_progress: ['merit_review_positive', 'merit_review_negative'],
  merit_review_positive: ['awaiting_decision'],
  merit_review_negative: [],
  awaiting_decision: ['scholarship_awarded', 'scholarship_not_awarded'],
  scholarship_awarded: [],
  scholarship_not_awarded: [],
};

/** Full ordered list for first-time declaration (create wizard). */
export function getInitialStatusOptions(): readonly ApplicationStatus[] {
  return applicationStatuses;
}

/** Early pipeline statuses for the create wizard — avoids overwhelming new users. */
export function getCreateWizardStatusOptions(): readonly ApplicationStatus[] {
  return getSequentialStatusOptions('submitted');
}

/**
 * Statuses selectable when updating from `current`:
 * always includes `current`, plus the next sequential / side-branch steps.
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
