import { describe, expect, it, beforeEach } from 'vitest';
import { buildPassportStages, clearPassportDates, passportStageIds } from './passport-stages';

describe('buildPassportStages', () => {
  beforeEach(() => {
    clearPassportDates();
  });

  it('marks profile and submitted as completed for a new profile', () => {
    const { stages } = buildPassportStages('submitted', '2026-07-01');
    expect(stages.map((stage) => stage.id)).toEqual([...passportStageIds]);
    expect(stages.find((stage) => stage.id === 'submitted')?.state).toBe('current');
    expect(stages.find((stage) => stage.id === 'formal_positive')?.state).toBe('upcoming');
  });

  it('hides decision after negative merit and stays neutral in copy tone', () => {
    const { stages } = buildPassportStages('merit_review_negative', '2026-08-01');
    expect(stages.map((stage) => stage.id)).not.toContain('decision');
    expect(stages.find((stage) => stage.id === 'merit_review')?.tone).toBe('negative');
    expect(stages.find((stage) => stage.id === 'merit_review')?.state).toBe('current');
  });

  it('stamps newly reached stages once', () => {
    const first = buildPassportStages('formal_review_positive', '2026-07-15');
    expect(first.newlyStamped.length).toBeGreaterThan(0);
    const second = buildPassportStages('formal_review_positive', '2026-07-15');
    expect(second.newlyStamped).toEqual([]);
  });
});
