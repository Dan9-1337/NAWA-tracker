import { defaultMaximumGradeForSchoolCountry, isCountryCode } from '../../shared/countries';
import { calculateNawaOrientationScore, getScoreBreakdown, nawaOrientationThreshold } from '../../shared/nawa-score';
import { isUniversityAllowedForTrack } from '../../shared/universities';
import type { WizardDraft } from './draft';

/**
 * The rules that keep a wizard draft consistent whenever an answer changes. Pure: returns a new draft.
 *  - Belarus citizens get no Polish-school bonus (Ogłoszenie 13/2026, pkt 2.7 kryterium 2).
 *  - Students in Poland are scored on a 2-5 scale and get no school bonus.
 *  - A university that is not a partner of the track is dropped.
 */
export function normalizeDraft(draft: WizardDraft): WizardDraft {
  const next = { ...draft };
  if (next.rankingCountry === 'BY') next.polishSchoolLevel = 'none';
  if (next.applicantKind === 'student_in_poland') {
    next.maximumGrade = 5;
    next.polishSchoolLevel = 'none';
  }
  if (next.targetUniversity && !isUniversityAllowedForTrack(next.targetUniversity, next.scholarshipTrack)) {
    next.targetUniversity = '';
  }
  return next;
}

/** Changing the school country resets the grade scale to that country's default (unknown country: ask again). */
export function withSchoolCountry(draft: WizardDraft, schoolCountry: string): WizardDraft {
  if (draft.applicantKind === 'student_in_poland') return normalizeDraft({ ...draft, schoolCountry });
  return normalizeDraft({
    ...draft,
    schoolCountry,
    maximumGrade: defaultMaximumGradeForSchoolCountry(schoolCountry) ?? null,
  });
}

/** The scale is fixed for students in Poland and whenever the school country has a known default. */
export function isMaximumGradeLocked(draft: WizardDraft): boolean {
  if (draft.applicantKind === 'student_in_poland') return true;
  return isCountryCode(draft.schoolCountry) && defaultMaximumGradeForSchoolCountry(draft.schoolCountry) != null;
}

/** Whether the Polish-school bonus question applies to this applicant (a NAWA Director rule). */
export function isPolishSchoolBonusApplicable(draft: WizardDraft): boolean {
  return draft.scholarshipTrack === 'nawa_director' && draft.rankingCountry !== 'BY' && draft.applicantKind !== 'student_in_poland';
}

/** Live score preview, or null until the grades are filled in and while the average is above the maximum. */
export function previewOrientationScore(draft: WizardDraft): number | null {
  if (draft.scholarshipTrack !== 'nawa_director') return null;
  if (draft.maximumGrade == null || draft.maximumGrade <= 0 || draft.averageGrade == null) return null;
  if (draft.averageGrade > draft.maximumGrade) return null;
  return calculateNawaOrientationScore(
    draft.averageGrade,
    draft.maximumGrade,
    draft.polishSchoolLevel,
    draft.rankingCountry,
    draft.applicantKind,
  );
}

/**
 * The grades score (average / maximum x 90, without the Polish-school bonus) when it is below the threshold of 60,
 * which most often means the average was entered on a different scale. Null while the average is empty, invalid or
 * above the maximum, for students in Poland (scored 100) and whenever the grades score reaches the threshold.
 */
export function lowGradesScore(draft: WizardDraft): { maximum: number; score: number } | null {
  if (draft.applicantKind === 'student_in_poland') return null;
  if (draft.maximumGrade == null || draft.maximumGrade <= 0 || draft.averageGrade == null) return null;
  if (draft.averageGrade > draft.maximumGrade) return null;
  const { gradesScore } = getScoreBreakdown(
    draft.averageGrade,
    draft.maximumGrade,
    draft.polishSchoolLevel,
    draft.rankingCountry,
    draft.applicantKind,
  );
  return gradesScore < nawaOrientationThreshold ? { maximum: draft.maximumGrade, score: gradesScore } : null;
}
