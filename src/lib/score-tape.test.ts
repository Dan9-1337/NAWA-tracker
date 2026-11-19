import { describe, expect, it } from 'vitest';
import {
  averageAfterDrag,
  scoreForAverage,
  snapAverage,
  stepAverage,
  tapeOffsetPx,
} from './score-tape';

describe('score tape', () => {
  it('snaps the average to 0.05 steps', () => {
    expect(snapAverage(9.22)).toBe(9.2);
    expect(snapAverage(9.226)).toBe(9.25);
  });

  it('raises the average when the tape is dragged left', () => {
    // 54 px = 9 score points = 1 grade point on a 10-point scale.
    expect(averageAfterDrag(9, -54, 10)).toBe(10);
    expect(averageAfterDrag(9, 27, 10)).toBe(8.5);
  });

  it('never leaves the 0..maximum range', () => {
    expect(averageAfterDrag(9.9, -600, 10)).toBe(10);
    expect(averageAfterDrag(0.2, 600, 10)).toBe(0);
    expect(stepAverage(10, 1, 10)).toBe(10);
    expect(stepAverage(0, -1, 10)).toBe(0);
  });

  it('ignores drags on a degenerate scale', () => {
    expect(averageAfterDrag(5, -100, 0)).toBe(0);
  });

  it('steps the average by 0.05 per step', () => {
    expect(stepAverage(9.2, 1, 10)).toBe(9.25);
    expect(stepAverage(9.2, -2, 10)).toBe(9.1);
  });

  it('scores a what-if average with the published formula and Belarus rule', () => {
    expect(scoreForAverage(9.2, { maximumGrade: 10, polishSchoolLevel: 'none', rankingCountry: 'UA' })).toBe(82.8);
    expect(scoreForAverage(9.2, { maximumGrade: 10, polishSchoolLevel: 'secondary', rankingCountry: 'UA' })).toBe(92.8);
    expect(scoreForAverage(9.2, { maximumGrade: 10, polishSchoolLevel: 'secondary', rankingCountry: 'BY' })).toBe(82.8);
  });

  it('maps score to tape offset within the printed range', () => {
    expect(tapeOffsetPx(60)).toBe(360);
    expect(tapeOffsetPx(120)).toBe(600);
    expect(tapeOffsetPx(-5)).toBe(0);
  });
});
