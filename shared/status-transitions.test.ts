import { describe, expect, it } from 'vitest';
import { isSuspiciousStatusTransition, isTerminalApplicationStatus } from './status-transitions';

describe('isTerminalApplicationStatus', () => {
  it('flags exactly the three terminal statuses', () => {
    expect(isTerminalApplicationStatus('merit_review_negative')).toBe(true);
    expect(isTerminalApplicationStatus('scholarship_awarded')).toBe(true);
    expect(isTerminalApplicationStatus('scholarship_not_awarded')).toBe(true);
    expect(isTerminalApplicationStatus('submitted')).toBe(false);
    expect(isTerminalApplicationStatus('merit_review_positive')).toBe(false);
  });
});

describe('isSuspiciousStatusTransition', () => {
  it('is not suspicious when the status is unchanged', () => {
    expect(isSuspiciousStatusTransition('submitted', 'submitted')).toBe(false);
  });

  it('flags leaving a terminal status for a non-terminal one', () => {
    expect(isSuspiciousStatusTransition('scholarship_awarded', 'merit_review_positive')).toBe(true);
    expect(isSuspiciousStatusTransition('merit_review_negative', 'formal_review_positive')).toBe(true);
  });

  it('flags going back to an earlier stage', () => {
    expect(isSuspiciousStatusTransition('formal_review_positive', 'submitted')).toBe(true);
    expect(isSuspiciousStatusTransition('merit_review_positive', 'formal_review_positive')).toBe(true);
    expect(isSuspiciousStatusTransition('merit_review_negative', 'merit_review_positive')).toBe(true);
  });

  it('does not flag skipping stages forward (late joiners report the outcome directly)', () => {
    expect(isSuspiciousStatusTransition('submitted', 'scholarship_awarded')).toBe(false);
    expect(isSuspiciousStatusTransition('submitted', 'merit_review_negative')).toBe(false);
    expect(isSuspiciousStatusTransition('formal_review_positive', 'scholarship_not_awarded')).toBe(false);
  });

  it('does not flag ordinary forward progress', () => {
    expect(isSuspiciousStatusTransition('submitted', 'formal_review_positive')).toBe(false);
    expect(isSuspiciousStatusTransition('formal_review_positive', 'merit_review_positive')).toBe(false);
    expect(isSuspiciousStatusTransition('formal_review_positive', 'merit_review_negative')).toBe(false);
    expect(isSuspiciousStatusTransition('merit_review_positive', 'scholarship_awarded')).toBe(false);
    expect(isSuspiciousStatusTransition('merit_review_positive', 'scholarship_not_awarded')).toBe(false);
  });

  it('does not flag correcting one final outcome to another', () => {
    expect(isSuspiciousStatusTransition('scholarship_awarded', 'scholarship_not_awarded')).toBe(false);
    expect(isSuspiciousStatusTransition('scholarship_not_awarded', 'scholarship_awarded')).toBe(false);
  });
});
