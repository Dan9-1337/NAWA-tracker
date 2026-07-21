import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { responseFormInputSchema } from '../../shared/validation';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { useI18n } from '../i18n/context';
import {
  clearWizardDraft,
  loadWizardDraft,
  saveWizardDraft,
  type WizardDraft,
} from '../lib/draft';
import { getTelegramWebApp } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { ConfirmSummary } from './ConfirmSummary';
import {
  canAdvanceWizardStep,
  getWizardEffectiveSteps,
  ResponseWizardSteps,
  toResponseInput,
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
  averageGrade: null,
  maximumGrade: null,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: todayIsoDate(),
};

type Screen = 'start' | 'privacy' | 'wizard' | 'confirm';

type CreateProfileFlowProps = {
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  disabled?: boolean;
  actionError?: string | null;
};

export function CreateProfileFlow({ onSubmit, disabled = false, actionError }: CreateProfileFlowProps) {
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>('start');
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [draft, setDraft] = useState<WizardDraft>(() => loadWizardDraft() ?? initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(() => loadWizardDraft() != null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const inFlight = useRef(false);

  const effectiveSteps = useMemo(() => getWizardEffectiveSteps(draft), [draft]);
  const currentStep = effectiveSteps[Math.min(stepIndex, effectiveSteps.length - 1)];

  useEffect(() => {
    if (screen === 'wizard' || screen === 'confirm') {
      saveWizardDraft(draft);
      setDirty(true);
    }
  }, [draft, screen]);

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

  const handleSubmit = useCallback(async () => {
    if (disabled || inFlight.current) return;
    const result = responseFormInputSchema.safeParse(toResponseInput(draft));
    if (!result.success) return;

    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit(result.data);
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

  const backToLastWizardStep = useCallback(() => {
    setScreen('wizard');
    setStepIndex(effectiveSteps.length - 1);
  }, [effectiveSteps.length]);

  useMiniAppChrome(
    screen === 'start'
      ? { main: { text: t.start.cta, visible: true, enabled: !disabled, onClick: () => setScreen('privacy') } }
      : screen === 'privacy'
        ? {
            main: {
              text: t.wizard.privacyStart,
              visible: true,
              enabled: privacyAcknowledged && !disabled,
              onClick: () => {
                getTelegramWebApp()?.haptic.selection();
                setScreen('wizard');
                setStepIndex(0);
              },
            },
            back: { visible: true, onClick: () => setScreen('start') },
          }
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
              secondary: { text: t.wizard.editStep, visible: true, enabled: !pending, onClick: backToLastWizardStep },
              back: { visible: true, onClick: backToLastWizardStep },
              closingConfirmation: dirty,
            },
  );

  if (screen === 'start') {
    return (
      <>
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold leading-tight">{t.start.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--tg-theme-subtitle-text-color)]">{t.start.subtitle}</p>
          </div>
          <ul className="space-y-2 text-sm leading-6">
            {t.start.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span aria-hidden="true">✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="text-sm font-medium text-[var(--tg-theme-link-color)] underline-offset-2 hover:underline"
            onClick={() => setShowHowItWorks(true)}
          >
            {t.start.howItWorks}
          </button>
        </section>
        {showHowItWorks ? (
          <p className="rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm text-[var(--tg-theme-subtitle-text-color)]">
            {t.stats.disclaimer}
          </p>
        ) : null}
      </>
    );
  }

  if (screen === 'privacy') {
    return <PrivacyNotice acknowledged={privacyAcknowledged} onAcknowledgedChange={setPrivacyAcknowledged} />;
  }

  if (screen === 'confirm') {
    return (
      <>
        <ConfirmSummary draft={toResponseInput(draft)} />
        {actionError ? (
          <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
            {actionError}
          </p>
        ) : null}
      </>
    );
  }

  return <ResponseWizardSteps draft={draft} onDraftChange={setDraft} stepIndex={stepIndex} />;
}
