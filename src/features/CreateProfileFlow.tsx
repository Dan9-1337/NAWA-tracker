import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { responseFormInputSchema } from '../../shared/validation';
import { useI18n } from '../i18n/context';
import { getIntakeSummary } from '../lib/api-client';
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
import { useScrollIntoViewWhenShown, useScrollToTopOnChange } from '../lib/useScrollToTop';
import {
  canAdvanceWizardStep,
  ResponseWizardSteps,
  toResponseInput,
} from './ResponseWizardSteps';
import { StartScreen } from './StartScreen';
import { GradesStepVisibilityContext } from './wizard/GradesStep';
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
  // The active intake year as the server reports it (ADR 0018); null until the first answer arrives.
  const [intakeYear, setIntakeYear] = useState<number | null>(null);
  const [intakeYearError, setIntakeYearError] = useState(false);
  const startCtaRef = useRef<HTMLButtonElement>(null);
  const educationCompleted = useRef(false);
  const averageAboveMaximumReported = useRef(false);
  const lowScoreWarningReported = useRef(false);

  // Each warning is recorded the first time it becomes visible in this mount of the create flow.
  const gradesVisibility = useMemo(
    () => ({
      onAverageAboveMaximumShown: () => {
        if (averageAboveMaximumReported.current) return;
        averageAboveMaximumReported.current = true;
        void trackProductEvent({ name: 'wizard_average_above_maximum_shown' });
      },
      onLowScoreWarningShown: () => {
        if (lowScoreWarningReported.current) return;
        lowScoreWarningReported.current = true;
        void trackProductEvent({ name: 'wizard_low_score_warning_shown' });
      },
    }),
    [],
  );

  useEffect(() => {
    if (screen === 'wizard') {
      saveWizardSession({ version: 2, draft, screen, stepIndex });
      setDirty(true);
    }
  }, [draft, screen, stepIndex]);

  useEffect(() => {
    let mounted = true;
    getIntakeSummary()
      .then((summary) => {
        if (mounted) setIntakeYear(summary.intakeYear);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useScrollToTopOnChange(screen, stepIndex);
  // A failed year lookup is shown like a failed save: the draft stays and the same button retries.
  const saveError = actionError ?? (intakeYearError ? t.form.saveError : null);
  const saveErrorRef = useScrollIntoViewWhenShown<HTMLDivElement>(saveError);

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
    if (
      currentStep === 'education' &&
      !educationCompleted.current &&
      canAdvanceWizardStep('education', draft)
    ) {
      educationCompleted.current = true;
      void trackProductEvent({ name: 'wizard_education_completed' });
    }
    goNext(draft);
  }, [currentStep, draft, goNext]);

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

    await runGuarded(async () => {
      // The save never goes out with a guessed year: if the first request failed, ask the server again.
      let year = intakeYear;
      if (year === null) {
        try {
          year = (await getIntakeSummary()).intakeYear;
        } catch (error) {
          setIntakeYearError(true);
          void trackProductEvent({ name: 'wizard_save_failed' });
          throw error;
        }
        setIntakeYear(year);
        setIntakeYearError(false);
      }

      const result = responseFormInputSchema.safeParse(toResponseInput(draft, year));
      // The button is disabled until the draft is valid; failing here only gives the error haptic.
      if (!result.success) throw new Error('invalid response');

      try {
        await onSubmit(result.data);
      } catch (error) {
        void trackProductEvent({ name: 'wizard_save_failed' });
        throw error;
      }
      void trackProductEvent({ name: 'wizard_completed' });
      clearWizardDraft();
      setDirty(false);
    });
  }, [disabled, draft, intakeYear, onSubmit, runGuarded]);

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
      <GradesStepVisibilityContext.Provider value={gradesVisibility}>
        <ResponseWizardSteps draft={draft} onDraftChange={setDraft} stepIndex={stepIndex} />
      </GradesStepVisibilityContext.Provider>
      {saveError ? (
        <div ref={saveErrorRef} role="alert" className="mt-4 space-y-1">
          <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">
            {saveError}
          </p>
          <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.form.saveErrorDraft}</p>
        </div>
      ) : null}
    </>
  );
}
