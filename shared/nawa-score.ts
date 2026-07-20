import type { PolishSchoolLevel } from './contracts';

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
  if (maximumGrade <= 0) return 0;
  const raw = (averageGrade / maximumGrade) * 90 + polishSchoolBonus[polishSchoolLevel];
  return Math.round(raw * 100) / 100;
}
