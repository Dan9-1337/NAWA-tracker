import type { ApplicantKind, PolishSchoolLevel } from './contracts';
import type { ScoreBreakdown } from './contracts';

export const nawaOrientationThreshold = 60;

export const polishSchoolBonus: Record<PolishSchoolLevel, number> = {
  none: 0,
  primary: 5,
  secondary: 10,
};

/** Ogłoszenie 13/2026 pkt 2.7 kryterium 2: nie dotyczy obywateli Białorusi. */
export function isPolishSchoolBonusEligible(rankingCountry: string): boolean {
  return rankingCountry !== 'BY';
}

/**
 * Published NAWA Director scholarship formula, used only as a neutral,
 * formula-attributed orientation figure — never surfaced as an admission
 * or scholarship-outcome prediction.
 */
export function calculateNawaOrientationScore(
  averageGrade: number,
  maximumGrade: number,
  polishSchoolLevel: PolishSchoolLevel,
  rankingCountry: string,
  applicantKind: ApplicantKind = 'school_leaver',
): number {
  return getScoreBreakdown(averageGrade, maximumGrade, polishSchoolLevel, rankingCountry, applicantKind).total;
}

/** Mirrors `public.compute_orientation_score` in SQL; keep the two in step (see nawa-score.test.ts). */
export function getScoreBreakdown(
  averageGrade: number,
  maximumGrade: number,
  polishSchoolLevel: PolishSchoolLevel,
  rankingCountry: string,
  applicantKind: ApplicantKind = 'school_leaver',
): ScoreBreakdown {
  // Students in Poland with an average >= 4.75 (scale 2-5) are assigned the maximum (Ogłoszenie 2.7).
  if (applicantKind === 'student_in_poland') {
    return { gradesScore: 100, polishSchoolBonus: 0, total: 100 };
  }

  if (maximumGrade <= 0) {
    return { gradesScore: 0, polishSchoolBonus: 0, total: 0 };
  }

  const gradesScore = Math.round((averageGrade / maximumGrade) * 90 * 100) / 100;
  const bonus = isPolishSchoolBonusEligible(rankingCountry) ? polishSchoolBonus[polishSchoolLevel] : 0;
  const total = Math.round((gradesScore + bonus) * 100) / 100;

  return {
    gradesScore,
    polishSchoolBonus: bonus,
    total,
  };
}

/** Bump when the published orientation formula changes. */
export const NAWA_SCORE_FORMULA_VERSION = '2026.2';
