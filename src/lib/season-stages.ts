import type { ApplicationStatus } from '../../shared/contracts';
import type { SeasonPhaseId } from '../../shared/season';

export type SeasonStageState = 'done' | 'current' | 'upcoming' | 'locked';

export type SeasonStage = { id: SeasonPhaseId; state: SeasonStageState };

/**
 * Four-stage season ruler driven by the user's reported status:
 * documents → evaluation → results → university.
 */
export function buildSeasonStages(status: ApplicationStatus): SeasonStage[] {
  switch (status) {
    case 'submitted':
    case 'formal_review_positive':
      return [
        { id: 'documents', state: 'done' },
        { id: 'evaluation', state: 'current' },
        { id: 'results', state: 'upcoming' },
        { id: 'university', state: 'locked' },
      ];
    case 'merit_review_positive':
      return [
        { id: 'documents', state: 'done' },
        { id: 'evaluation', state: 'done' },
        { id: 'results', state: 'current' },
        { id: 'university', state: 'locked' },
      ];
    case 'merit_review_negative':
      return [
        { id: 'documents', state: 'done' },
        { id: 'evaluation', state: 'done' },
        { id: 'results', state: 'current' },
        { id: 'university', state: 'locked' },
      ];
    case 'scholarship_not_awarded':
      return [
        { id: 'documents', state: 'done' },
        { id: 'evaluation', state: 'done' },
        { id: 'results', state: 'current' },
        { id: 'university', state: 'locked' },
      ];
    case 'scholarship_awarded':
      return [
        { id: 'documents', state: 'done' },
        { id: 'evaluation', state: 'done' },
        { id: 'results', state: 'done' },
        { id: 'university', state: 'current' },
      ];
  }
}
