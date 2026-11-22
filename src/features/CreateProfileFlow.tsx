import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { responseFormInputSchema } from '../../shared/validation';
import { useI18n } from '../i18n/context';
import {
  clearWizardDraft,
  hasRestoredWizardSession,
  loadWizardSession,
  saveWizardSession,
  type WizardDraft,
  type WizardScreen,
} from '../lib/draft';
import { trackProductEvent } from '../lib/product-events';
import { getTelegramStartCountry, getTelegramWebApp } from '../lib/telegram';
import { useGuardedSubmit } from '../lib/useGuardedSubmit';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { useScrollToTopOnChange } from '../lib/useScrollToTop';
import {
  canAdvanceWizardStep,
  ResponseWizardSteps,
  toResponseInput,
} from './ResponseWizardSteps';
import { StartScreen } from './StartScreen';
import { useWizardSteps } from './useWizardSteps';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialDraft(): WizardDraft {
  return {
    ...baseDraft,
    rankingCountry: getTelegramStartCountry() ?? '',
  };
}

const baseDraft: WizardDraft = {
  hasPolishCitizenship: false,
  rankingCountry: '',
  schoolCountry: '',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: '',
  studyField: '',
  prepCourseCity: '',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: null,
  maximumGrade: null,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: todayIsoDate(),
};

type CreateProfileFlowProps = {
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  disabled?: boolean;
  actionError?: string | null;
  chromeSuspended?: boolean;
};

export function CreateProfileFlow({
  onSubmit,
  disabled = false,
  actionError,
  chromeSuspended = false,
}: CreateProfileFlowProps) {
  const { t } = useI18n();
  const restoredSession = useRef(loadWizardSession());
  const pendingResume = hasRestoredWizardSession(restoredSession.current);
  const [screen, setScreen] = useState<WizardScreen>('start');
  const [draft, setDraft] = useState<WizardDraft>(() => restoredSession.current?.draft ?? buildInitialDraft());
  const {
    stepIndex,
    setStepIndex,
    currentStep,
    goNext,
    goBack,
    resetToStart,
  } = useWizardSteps(restoredSession.current?.stepIndex ?? 0);
  const { pending, run: runGuarded } = useGuardedSubmit();
  const [dirty, setDirty] = useState(() => restoredSession.current != null);
  const [showResumePrompt, setShowResumePrompt] = useState(pendingResume);
  const [startCtaInView, setStartCtaInView] = useState(true);
  const startCtaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (screen === 'wizard') {
      saveWizardSession({ version: 2, draft, screen, stepIndex });
      setDirty(true);
    }
  }, [draft, screen, stepIndex]);

  useScrollToTopOnChange(screen, stepIndex);

  useEffect(() => {
    if (screen !== 'start') return undefined;
    const node = startCtaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setStartCtaInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setStartCtaInView(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [screen]);

  const goWizardNext = useCallback(() => {
    goNext(draft);
  }, [draft, goNext]);

  const goWizardBack = useCallback(() => {
    goBack(() => setScreen('start'));
  }, [goBack]);

  const startWizard = useCallback(() => {
    getTelegramWebApp()?.haptic.selection();
    void trackProductEvent({ name: 'wizard_started' });
    setShowResumePrompt(false);
    setScreen('wizard');
    resetToStart();
  }, [resetToStart]);

  const continueResume = useCallback(() => {
    const session = restoredSession.current;
    if (!session) return;
    setDraft(session.draft);
    setStepIndex(session.stepIndex);
    setScreen(session.screen === 'start' ? 'wizard' : session.screen);
    setShowResumePrompt(false);
    getTelegramWebApp()?.haptic.selection();
  }, []);

  const startOver = useCallback(() => {
    clearWizardDraft();
    setDraft(buildInitialDraft());
    resetToStart();
    setShowResumePrompt(false);
    setDirty(false);
    getTelegramWebApp()?.haptic.selection();
  }, [resetToStart]);

  const handleSubmit = useCallback(async () => {
    if (disabled) return;
    const result = responseFormInputSchema.safeParse(toResponseInput(draft));
    if (!result.success) return;

    await runGuarded(async () => {
      await onSubmit(result.data);
      void trackProductEvent({ name: 'wizard_completed' });
      clearWizardDraft();
      setDirty(false);
    });
  }, [disabled, draft, onSubmit, runGuarded]);

  const onGradesStep = currentStep === 'grades';

  useMiniAppChrome(
    chromeSuspended
      ? {}
      : screen === 'start'
        ? { main: { text: t.start.cta, visible: !startCtaInView, enabled: !disabled, onClick: startWizard } }
        : onGradesStep
          ? {
              main: {
                text: t.form.submitCreate,
                visible: true,
                enabled: !disabled && !pending && canAdvanceWizardStep('grades', draft),
                loading: pending,
                onClick: handleSubmit,
              },
              back: { visible: true, onClick: goWizardBack },
              closingConfirmation: dirty,
            }
          : {
              main: {
                text: t.wizard.next,
                visible: true,
                enabled: !disabled && canAdvanceWizardStep('education', draft),
                onClick: goWizardNext,
              },
              back: { visible: true, onClick: goWizardBack },
              closingConfirmation: dirty,
            },
  );

  if (screen === 'start') {
    return (
      <StartScreen
        disabled={disabled}
        showResumePrompt={showResumePrompt}
        startCtaRef={startCtaRef}
        onStart={startWizard}
        onContinue={continueResume}
        onStartOver={startOver}
      />
    );
  }

  return (
    <>
      <ResponseWizardSteps draft={draft} onDraftChange={setDraft} stepIndex={stepIndex} />
      {actionError ? (
        <div role="alert" className="mt-4 space-y-1">
          <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">
            {t.form.saveError}
          </p>
          <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.form.saveErrorDraft}</p>
        </div>
      ) : null}
    </>
  );
}
