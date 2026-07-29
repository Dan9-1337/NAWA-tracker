import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { responseFormInputSchema } from '../../shared/validation';
import { HowItWorksPanel } from '../components/HowItWorksPanel';
import { ResultPreviewCard } from '../components/ResultPreviewCard';
import { ScholarshipEntryCards } from '../components/ScholarshipEntryCards';
import { ChevronIcon } from '../components/icons';
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
import { getTelegramWebApp } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { ConfirmSummary } from './ConfirmSummary';
import {
  canAdvanceWizardStep,
  getWizardEffectiveSteps,
  ResponseWizardSteps,
  toResponseInput,
  wizardStepIndex,
  type WizardStep,
} from './ResponseWizardSteps';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialDraft: WizardDraft = {
  hasPolishCitizenship: false,
  rankingCountry: '',
  schoolCountry: '',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: '',
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
  const [draft, setDraft] = useState<WizardDraft>(() => restoredSession.current?.draft ?? initialDraft);
  const [stepIndex, setStepIndex] = useState(() => restoredSession.current?.stepIndex ?? 0);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(() => restoredSession.current != null);
  const [openFaq, setOpenFaq] = useState<'how' | 'what' | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(pendingResume);
  const [startCtaInView, setStartCtaInView] = useState(true);
  const startCtaRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);

  const effectiveSteps = getWizardEffectiveSteps();
  const currentStep = effectiveSteps[Math.min(stepIndex, effectiveSteps.length - 1)];

  useEffect(() => {
    if (screen === 'wizard' || screen === 'confirm') {
      saveWizardSession({ version: 1, draft, screen, stepIndex });
      setDirty(true);
    }
  }, [draft, screen, stepIndex]);

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
    if (!canAdvanceWizardStep(currentStep, draft)) return;
    getTelegramWebApp()?.haptic.impact('light');
    if (stepIndex >= effectiveSteps.length - 1) {
      setScreen('confirm');
      return;
    }
    setStepIndex((index) => Math.min(index + 1, effectiveSteps.length - 1));
  }, [currentStep, draft, effectiveSteps.length, stepIndex]);

  const goWizardBack = useCallback(() => {
    getTelegramWebApp()?.haptic.impact('light');
    if (stepIndex <= 0) {
      setScreen('start');
      return;
    }
    setStepIndex((index) => Math.max(index - 1, 0));
  }, [stepIndex]);

  const startWizard = useCallback(() => {
    getTelegramWebApp()?.haptic.selection();
    void trackProductEvent('wizard_started');
    setShowResumePrompt(false);
    setScreen('wizard');
    setStepIndex(0);
  }, []);

  const startWizardForTrack = useCallback(
    (track: ResponseFormInput['scholarshipTrack']) => {
      setDraft((current) => ({ ...current, scholarshipTrack: track }));
      startWizard();
    },
    [startWizard],
  );

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
    setDraft(initialDraft);
    setStepIndex(0);
    setShowResumePrompt(false);
    setDirty(false);
    getTelegramWebApp()?.haptic.selection();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (disabled || inFlight.current) return;
    const result = responseFormInputSchema.safeParse(toResponseInput(draft));
    if (!result.success) return;

    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit(result.data);
      void trackProductEvent('wizard_completed');
      clearWizardDraft();
      setDirty(false);
      getTelegramWebApp()?.haptic.notification('success');
    } catch {
      getTelegramWebApp()?.haptic.notification('error');
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, [disabled, draft, onSubmit]);

  const jumpToSection = useCallback((section: WizardStep) => {
    setScreen('wizard');
    setStepIndex(wizardStepIndex(section));
  }, []);

  const backToLastWizardStep = useCallback(() => {
    setScreen('wizard');
    setStepIndex(effectiveSteps.length - 1);
  }, [effectiveSteps.length]);

  useMiniAppChrome(
    chromeSuspended
      ? {}
      : screen === 'start'
        ? { main: { text: t.start.cta, visible: !startCtaInView, enabled: !disabled, onClick: startWizard } }
        : screen === 'wizard'
          ? {
              main: {
                text: t.wizard.next,
                visible: true,
                enabled: !disabled && canAdvanceWizardStep(currentStep, draft),
                onClick: goWizardNext,
              },
              back: { visible: true, onClick: goWizardBack },
              closingConfirmation: dirty,
            }
          : {
              main: {
                text: t.form.submitCreate,
                visible: true,
                enabled: !disabled && !pending,
                loading: pending,
                onClick: handleSubmit,
              },
              back: { visible: true, onClick: backToLastWizardStep },
              closingConfirmation: dirty,
            },
  );

  if (screen === 'start') {
    return (
      <>
        <section className="space-y-4">
          {showResumePrompt ? (
            <div className="rounded-2xl border border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t.start.resumeTitle}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{t.start.resumeBody}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="min-h-11 rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
                  onClick={continueResume}
                >
                  {t.start.resumeContinue}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold"
                  onClick={startOver}
                >
                  {t.start.resumeStartOver}
                </button>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-helper)]">
              {t.start.kicker}{' '}
              <span className="text-[0.625rem] font-medium normal-case tracking-normal opacity-80">
                ({t.start.kickerNote})
              </span>
            </p>
            <h2 className="text-[1.75rem] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
              {t.start.title}
            </h2>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{t.start.subtitle}</p>
          </div>
          <ResultPreviewCard />
          <ScholarshipEntryCards onSelect={startWizardForTrack} disabled={disabled} />
          <button
            ref={startCtaRef}
            type="button"
            disabled={disabled}
            className="sr-only"
            onClick={startWizard}
          >
            {t.start.cta}
          </button>
          <p className="text-center text-xs font-medium text-[var(--text-helper)]">{t.start.timePromise}</p>

          <div className="overflow-hidden rounded-2xl border border-[var(--section-divider-color)]">
            <button
              type="button"
              className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={openFaq === 'what'}
              onClick={() => setOpenFaq((value) => (value === 'what' ? null : 'what'))}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{t.start.whatYouSee}</span>
              <span
                className={`shrink-0 text-[var(--tg-theme-hint-color)] transition-transform ${
                  openFaq === 'what' ? 'rotate-90' : ''
                }`}
              >
                <ChevronIcon />
              </span>
            </button>
            {openFaq === 'what' ? (
              <p className="border-t border-[var(--section-divider-color)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                {t.start.whatYouSeeBody}
              </p>
            ) : null}
            <button
              type="button"
              className="flex w-full min-h-11 items-center justify-between gap-3 border-t border-[var(--section-divider-color)] px-4 py-3 text-left"
              aria-expanded={openFaq === 'how'}
              onClick={() => setOpenFaq((value) => (value === 'how' ? null : 'how'))}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{t.start.howItWorks}</span>
              <span
                className={`shrink-0 text-[var(--tg-theme-hint-color)] transition-transform ${
                  openFaq === 'how' ? 'rotate-90' : ''
                }`}
              >
                <ChevronIcon />
              </span>
            </button>
            {openFaq === 'how' ? <HowItWorksPanel /> : null}
          </div>
        </section>
      </>
    );
  }

  if (screen === 'confirm') {
    return (
      <>
        <ConfirmSummary draft={toResponseInput(draft)} onEditSection={jumpToSection} />
        {actionError ? (
          <div role="alert" className="space-y-1">
            <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">
              {t.form.saveError}
            </p>
            <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.form.saveErrorDraft}</p>
          </div>
        ) : null}
      </>
    );
  }

  return <ResponseWizardSteps draft={draft} onDraftChange={setDraft} stepIndex={stepIndex} />;
}
