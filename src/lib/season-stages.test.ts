import { describe, expect, it } from 'vitest';
import { applicationStatuses } from '../../shared/contracts';
import { buildSeasonStages } from './season-stages';

const states = (status: Parameters<typeof buildSeasonStages>[0]) =>
  buildSeasonStages(status).map((stage) => stage.state);

describe('buildSeasonStages', () => {
  it('always lists the four stages in order', () => {
    for (const status of applicationStatuses) {
      expect(buildSeasonStages(status).map((stage) => stage.id)).toEqual([
        'documents',
        'evaluation',
        'results',
        'university',
      ]);
    }
  });

  it('keeps evaluation current until a merit result is reported', () => {
    expect(states('submitted')).toEqual(['done', 'current', 'upcoming', 'locked']);
    expect(states('formal_review_positive')).toEqual(['done', 'current', 'upcoming', 'locked']);
  });

  it('moves to results once merit is reported, and keeps university locked', () => {
    expect(states('merit_review_positive')).toEqual(['done', 'done', 'current', 'locked']);
    expect(states('merit_review_negative')).toEqual(['done', 'done', 'current', 'locked']);
  });

  it('opens the university stage only after an award', () => {
    expect(states('scholarship_awarded')).toEqual(['done', 'done', 'done', 'current']);
  });
});
