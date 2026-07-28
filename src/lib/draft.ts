import type { ApplicationStatus, PolishSchoolLevel, ResponseFormInput, ScholarshipTrack, StudyRoute } from '../../shared/contracts';
import { getTelegramUserId } from './telegram';

export const DRAFT_STORAGE_KEY_PREFIX = 'nawa-wizard-draft';
const SESSION_VERSION = 1 as const;

// Scoped by Telegram user id so drafts never leak between accounts sharing a device/browser.
function draftStorageKey(): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}:${getTelegramUserId() ?? 'anon'}`;
}

export type WizardDraft = {
  hasPolishCitizenship: boolean;
  rankingCountry: string;
  schoolCountry: string;
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  targetUniversity: string;
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
    targetUniversity: value.targetUniversity ?? '',
    averageGrade: value.averageGrade,
    maximumGrade: value.maximumGrade,
    polishSchoolLevel: value.polishSchoolLevel ?? 'none',
    currentStatus: value.currentStatus,
    statusChangedAt: value.statusChangedAt,
  };
}

function normalizeWizardDraft(draft: WizardDraft): WizardDraft {
  return {
    ...draft,
    targetUniversity: draft.targetUniversity ?? '',
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
    const raw = localStorage.getItem(draftStorageKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isWizardSession(parsed)) {
      return { ...parsed, draft: normalizeWizardDraft(parsed.draft) };
    }
    if (isWizardDraft(parsed)) {
      return {
        version: SESSION_VERSION,
        draft: normalizeWizardDraft(parsed),
        screen: 'wizard',
        stepIndex: 0,
      };
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
    draftStorageKey(),
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
  localStorage.removeItem(draftStorageKey());
}

/** True when a saved session should prompt resume instead of jumping into the wizard. */
export function hasRestoredWizardSession(session: WizardSession | null): boolean {
  return session != null && (session.screen === 'wizard' || session.screen === 'confirm');
}
