import type { ApplicationStatus } from '../../shared/contracts';

export const statusPhaseOrder = ['submitted', 'formal', 'merit', 'outcome'] as const;
export type StatusPhaseId = (typeof statusPhaseOrder)[number];

const statusPhaseByStatus: Record<ApplicationStatus, StatusPhaseId> = {
  submitted: 'submitted',
  formal_review_positive: 'formal',
  merit_review_positive: 'merit',
  merit_review_negative: 'merit',
  scholarship_awarded: 'outcome',
};

export function getStatusPhase(status: ApplicationStatus): StatusPhaseId {
  return statusPhaseByStatus[status];
}

export function getStatusPhaseIndex(status: ApplicationStatus): number {
  if (status === 'merit_review_negative') {
    return statusPhaseOrder.indexOf('merit');
  }
  return statusPhaseOrder.indexOf(getStatusPhase(status));
}

export function getVisibleStatusPhases(status: ApplicationStatus): readonly StatusPhaseId[] {
  if (status === 'merit_review_negative') {
    return ['submitted', 'formal', 'merit'];
  }
  return statusPhaseOrder;
}

export type StatusOutcomeTone = 'neutral' | 'positive' | 'negative';

export function getStatusOutcomeTone(status: ApplicationStatus): StatusOutcomeTone {
  if (status === 'scholarship_awarded' || status === 'merit_review_positive') return 'positive';
  if (status === 'merit_review_negative') return 'negative';
  return 'neutral';
}
