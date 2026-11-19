import type { PolishSchoolLevel } from '../../shared/contracts';
import { getScoreBreakdown } from '../../shared/nawa-score';

/** Tape scale: 6 px per score point, so a labelled 10-point stretch is 60 px. */
export const TAPE_PX_PER_POINT = 6;
export const TAPE_MAX_SCORE = 100;
/** One tape step changes the (what-if) average grade by this much. */
export const AVERAGE_STEP = 0.05;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function snapAverage(value: number): number {
  return round2(Math.round(value / AVERAGE_STEP) * AVERAGE_STEP);
}

export function clampAverage(value: number, maximumGrade: number): number {
  return Math.min(Math.max(value, 0), maximumGrade);
}

/**
 * Average grade after dragging the tape by `dxPx`. Dragging left (negative dx)
 * moves the pointer toward higher scores, like pulling a tape measure.
 */
export function averageAfterDrag(startAverage: number, dxPx: number, maximumGrade: number): number {
  if (maximumGrade <= 0) return 0;
  const scoreDelta = -dxPx / TAPE_PX_PER_POINT;
  const averageDelta = (scoreDelta * maximumGrade) / 90;
  return clampAverage(snapAverage(startAverage + averageDelta), maximumGrade);
}

export function stepAverage(average: number, steps: number, maximumGrade: number): number {
  return clampAverage(snapAverage(average + steps * AVERAGE_STEP), maximumGrade);
}

export type TapeProfile = {
  maximumGrade: number;
  polishSchoolLevel: PolishSchoolLevel;
  rankingCountry: string;
};

export function scoreForAverage(average: number, profile: TapeProfile): number {
  return getScoreBreakdown(
    average,
    profile.maximumGrade,
    profile.polishSchoolLevel,
    profile.rankingCountry,
  ).total;
}

/** Horizontal tape offset (px from the tape's 0 mark) that puts `score` under the pointer. */
export function tapeOffsetPx(score: number): number {
  return Math.min(Math.max(score, 0), TAPE_MAX_SCORE) * TAPE_PX_PER_POINT;
}
