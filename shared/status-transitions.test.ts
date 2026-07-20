import { describe, expect, it } from 'vitest';
import { isBackdatedStatusChange, isSuspiciousStatusTransition, isTerminalApplicationStatus } from './status-transitions';

describe('isTerminalApplicationStatus', () => {
  it('flags exactly the three terminal statuses', () => {
    expect(isTerminalApplicationStatus('merit_review_negative')).toBe(true);
    expect(isTerminalApplicationStatus('scholarship_awarded')).toBe(true);
    expect(isTerminalApplicationStatus('scholarship_not_awarded')).toBe(true);
    expect(isTerminalApplicationStatus('submitted')).toBe(false);
    expect(isTerminalApplicationStatus('awaiting_decision')).toBe(false);
  });
});

describe('isSuspiciousStatusTransition', () => {
  it('is not suspicious when the status is unchanged', () => {
    expect(isSuspiciousStatusTransition('submitted', 'submitted')).toBe(false);
  });

  it('flags leaving a terminal status for a non-terminal one', () => {
    expect(isSuspiciousStatusTransition('scholarship_awarded', 'awaiting_decision')).toBe(true);
    expect(isSuspiciousStatusTransition('merit_review_negative', 'merit_review_in_progress')).toBe(true);
  });

  it('flags a direct flip between opposing award outcomes', () => {
    expect(isSuspiciousStatusTransition('scholarship_awarded', 'scholarship_not_awarded')).toBe(true);
    expect(isSuspiciousStatusTransition('scholarship_not_awarded', 'scholarship_awarded')).toBe(true);
  });

  it('does not flag ordinary forward progress', () => {
    expect(isSuspiciousStatusTransition('submitted', 'formal_review_in_progress')).toBe(false);
    expect(isSuspiciousStatusTransition('merit_review_in_progress', 'merit_review_positive')).toBe(false);
    expect(isSuspiciousStatusTransition('merit_review_in_progress', 'merit_review_negative')).toBe(false);
  });
});

describe('isBackdatedStatusChange', () => {
  it('flags a new date earlier than the previous one', () => {
    expect(isBackdatedStatusChange('2026-07-10', '2026-07-01')).toBe(true);
  });

  it('does not flag the same or a later date', () => {
    expect(isBackdatedStatusChange('2026-07-10', '2026-07-10')).toBe(false);
    expect(isBackdatedStatusChange('2026-07-10', '2026-07-20')).toBe(false);
  });
});
