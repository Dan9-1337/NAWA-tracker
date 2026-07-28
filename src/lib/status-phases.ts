import type { ApplicationStatus } from '../../shared/contracts';

export const statusPhaseOrder = ['submitted', 'formal', 'merit', 'outcome'] as const;
export type StatusPhaseId = (typeof statusPhaseOrder)[number];

const statusPhaseByStatus: Record<ApplicationStatus, StatusPhaseId> = {
  submitted: 'submitted',
  formal_review_in_progress: 'formal',
  correction_requested: 'formal',
  formal_review_completed: 'formal',
  merit_review_in_progress: 'merit',
  merit_review_positive: 'merit',
  merit_review_negative: 'merit',
  awaiting_decision: 'outcome',
  scholarship_awarded: 'outcome',
  scholarship_not_awarded: 'outcome',
};

export function getStatusPhase(status: ApplicationStatus): StatusPhaseId {
  return statusPhaseByStatus[status];
}

export function getStatusPhaseIndex(status: ApplicationStatus): number {
  return statusPhaseOrder.indexOf(getStatusPhase(status));
}

export type StatusOutcomeTone = 'neutral' | 'positive' | 'negative';

export function getStatusOutcomeTone(status: ApplicationStatus): StatusOutcomeTone {
  if (status === 'scholarship_awarded' || status === 'merit_review_positive') return 'positive';
  if (status === 'scholarship_not_awarded' || status === 'merit_review_negative') return 'negative';
  return 'neutral';
}
