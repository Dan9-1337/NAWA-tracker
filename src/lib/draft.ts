import type { ApplicationStatus, PolishSchoolLevel, ResponseFormInput, ScholarshipTrack, StudyRoute } from '../../shared/contracts';

export const DRAFT_STORAGE_KEY = 'nawa-wizard-draft';
const SESSION_VERSION = 1 as const;

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

export type WizardScreen = 'start' | 'wizard' | 'confirm';

export type WizardSession = {
  version: typeof SESSION_VERSION;
  draft: WizardDraft;
  screen: WizardScreen;
  stepIndex: number;
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

function isWizardDraft(value: unknown): value is WizardDraft {
  return typeof value === 'object' && value != null && 'scholarshipTrack' in value;
}

function isWizardSession(value: unknown): value is WizardSession {
  return (
    typeof value === 'object' &&
    value != null &&
    'version' in value &&
    (value as WizardSession).version === SESSION_VERSION &&
    'draft' in value &&
    isWizardDraft((value as WizardSession).draft)
  );
}

export function loadWizardSession(): WizardSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isWizardSession(parsed)) return parsed;
    if (isWizardDraft(parsed)) {
      return { version: SESSION_VERSION, draft: parsed, screen: 'wizard', stepIndex: 0 };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadWizardDraft(): WizardDraft | null {
  return loadWizardSession()?.draft ?? null;
}

export function saveWizardSession(session: WizardSession): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({ ...session, version: SESSION_VERSION }),
  );
}

export function saveWizardDraft(draft: WizardDraft): void {
  const existing = loadWizardSession();
  saveWizardSession({
    version: SESSION_VERSION,
    draft,
    screen: existing?.screen ?? 'wizard',
    stepIndex: existing?.stepIndex ?? 0,
  });
}

export function clearWizardDraft(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}
