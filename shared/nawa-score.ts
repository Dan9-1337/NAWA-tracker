import type { PolishSchoolLevel } from './contracts';
import type { ScoreBreakdown } from './contracts';

export const nawaOrientationThreshold = 60;

export const polishSchoolBonus: Record<PolishSchoolLevel, number> = {
  none: 0,
  primary: 5,
  secondary: 10,
};

/**
 * Published NAWA Director scholarship formula, used only as a neutral,
 * formula-attributed orientation figure — never surfaced as an admission
 * or scholarship-outcome prediction.
 */
export function calculateNawaOrientationScore(
  averageGrade: number,
  maximumGrade: number,
  polishSchoolLevel: PolishSchoolLevel,
): number {
  return getScoreBreakdown(averageGrade, maximumGrade, polishSchoolLevel).total;
}

export function getScoreBreakdown(
  averageGrade: number,
  maximumGrade: number,
  polishSchoolLevel: PolishSchoolLevel,
): ScoreBreakdown {
  if (maximumGrade <= 0) {
    return { gradesScore: 0, polishSchoolBonus: 0, total: 0 };
  }

  const gradesScore = Math.round((averageGrade / maximumGrade) * 90 * 100) / 100;
  const bonus = polishSchoolBonus[polishSchoolLevel];
  const total = Math.round((gradesScore + bonus) * 100) / 100;

  return {
    gradesScore,
    polishSchoolBonus: bonus,
    total,
  };
}
