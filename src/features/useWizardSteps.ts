import { useCallback, useMemo, useState } from 'react';
import type { WizardDraft } from '../lib/draft';
import { getTelegramWebApp } from '../lib/telegram';
import {
  canAdvanceWizardStep,
  getWizardEffectiveSteps,
  wizardStepIndex,
  type WizardStep,
} from './ResponseWizardSteps';

export function useWizardSteps(initialStepIndex = 0) {
  const effectiveSteps = useMemo(() => getWizardEffectiveSteps(), []);
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const currentStep = effectiveSteps[Math.min(stepIndex, effectiveSteps.length - 1)];

  const goNext = useCallback(
    (draft: WizardDraft, onReachEnd: () => void) => {
      if (!canAdvanceWizardStep(currentStep, draft)) return;
      getTelegramWebApp()?.haptic.impact('light');
      if (stepIndex >= effectiveSteps.length - 1) {
        onReachEnd();
        return;
      }
      setStepIndex((index) => Math.min(index + 1, effectiveSteps.length - 1));
    },
    [currentStep, effectiveSteps.length, stepIndex],
  );

  const goBack = useCallback(
    (onReachStart: () => void) => {
      getTelegramWebApp()?.haptic.impact('light');
      if (stepIndex <= 0) {
        onReachStart();
        return;
      }
      setStepIndex((index) => Math.max(index - 1, 0));
    },
    [stepIndex],
  );

  const jumpToSection = useCallback((section: WizardStep) => {
    setStepIndex(wizardStepIndex(section));
  }, []);

  const goToLastStep = useCallback(() => {
    setStepIndex(effectiveSteps.length - 1);
  }, [effectiveSteps.length]);

  const resetToStart = useCallback(() => {
    setStepIndex(0);
  }, []);

  return {
    effectiveSteps,
    stepIndex,
    setStepIndex,
    currentStep,
    goNext,
    goBack,
    jumpToSection,
    goToLastStep,
    resetToStart,
  };
}
