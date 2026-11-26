import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DRAFT_STORAGE_KEY_PREFIX,
  hasRestoredWizardSession,
  loadWizardSession,
  saveWizardSession,
  type WizardDraft,
} from './draft';

// Drafts are scoped by Telegram user id; tests run without a Telegram bridge.
vi.mock('./telegram', () => ({ getTelegramUserId: () => null }));

const storageKey = `${DRAFT_STORAGE_KEY_PREFIX}:anon`;

const draft: WizardDraft = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: '',
  studyField: '',
  prepCourseCity: '',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: 4.5,
  maximumGrade: 12,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
};

beforeEach(() => {
  localStorage.clear();
});

describe('loadWizardSession', () => {
  it('resumes a session saved on the removed confirm screen on the grades step with its draft intact', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: 2, draft, screen: 'confirm', stepIndex: 0 }),
    );

    const session = loadWizardSession();

    expect(session).not.toBeNull();
    expect(session!.screen).toBe('wizard');
    expect(session!.stepIndex).toBe(1);
    expect(session!.draft).toMatchObject({ rankingCountry: 'UA', averageGrade: 4.5 });
    expect(hasRestoredWizardSession(session)).toBe(true);
  });

  it('keeps a wizard session on its own step', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: 2, draft, screen: 'wizard', stepIndex: 0 }),
    );

    const session = loadWizardSession();

    expect(session!.screen).toBe('wizard');
    expect(session!.stepIndex).toBe(0);
  });

  it('drops the legacy first wizard step from a version 1 session', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: 1, draft, screen: 'wizard', stepIndex: 2 }),
    );

    expect(loadWizardSession()!.stepIndex).toBe(1);
  });
});

describe('saveWizardSession', () => {
  it('never writes the removed confirm screen', () => {
    saveWizardSession({ version: 2, draft, screen: 'wizard', stepIndex: 1 });

    // WizardScreen has no 'confirm' value, so the type system and the stored payload agree.
    expect(JSON.parse(localStorage.getItem(storageKey)!).screen).toBe('wizard');
    expect(hasRestoredWizardSession(loadWizardSession())).toBe(true);
  });
});
