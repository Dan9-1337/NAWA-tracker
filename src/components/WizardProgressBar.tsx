import type { WizardStep } from '../features/ResponseWizardSteps';
import { useI18n } from '../i18n/context';

type WizardProgressBarProps = {
  steps: readonly WizardStep[];
  currentStep: WizardStep;
};

export function WizardProgressBar({ steps, currentStep }: WizardProgressBarProps) {
  const { t } = useI18n();
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="space-y-2" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      <div className="flex gap-1">
        {steps.map((step, index) => {
          const filled = index <= currentIndex;
          return (
            <div key={step} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--tg-theme-hint-color)]">
              <div
                className="h-full rounded-full bg-[var(--tg-theme-button-color)] transition-[width] duration-300 ease-out"
                style={{ width: filled ? '100%' : '0%' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 text-[11px] font-medium text-[var(--tg-theme-subtitle-text-color)]">
        {steps.map((step, index) => (
          <span
            key={step}
            className={index === currentIndex ? 'text-[var(--tg-theme-text-color)]' : undefined}
          >
            {t.wizard.sections[step]}
          </span>
        ))}
      </div>
    </div>
  );
}
