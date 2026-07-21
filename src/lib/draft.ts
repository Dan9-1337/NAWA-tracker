import type { ApplicationStatus, PolishSchoolLevel, ResponseFormInput, ScholarshipTrack, StudyRoute } from '../../shared/contracts';

export const DRAFT_STORAGE_KEY = 'nawa-wizard-draft';

export type WizardDraft = {
  hasPolishCitizenship: boolean;
  rankingCountry: string;
  schoolCountry: string;
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  averageGrade: number | null;
  maximumGrade: number | null;
  polishSchoolLevel: PolishSchoolLevel;
  currentStatus: ApplicationStatus;
  statusChangedAt: string;
};

export function responseToDraft(value: ResponseFormInput): WizardDraft {
  return {
    hasPolishCitizenship: value.hasPolishCitizenship,
    rankingCountry: value.rankingCountry,
    schoolCountry: value.schoolCountry,
    scholarshipTrack: value.scholarshipTrack,
    studyRoute: value.studyRoute,
    averageGrade: value.averageGrade,
    maximumGrade: value.maximumGrade,
    polishSchoolLevel: value.polishSchoolLevel ?? 'none',
    currentStatus: value.currentStatus,
    statusChangedAt: value.statusChangedAt,
  };
}

export function loadWizardDraft(): WizardDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WizardDraft;
  } catch {
    return null;
  }
}

export function saveWizardDraft(draft: WizardDraft): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearWizardDraft(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}
