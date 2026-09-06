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
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const filled = isCompleted || isCurrent;

          return (
            <div key={step} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--tg-theme-hint-color)]">
              <div
                className="h-full rounded-full bg-[var(--tg-theme-button-color)] transition-[width,opacity] duration-300 ease-out"
                style={{
                  width: filled ? '100%' : '0%',
                  opacity: isCompleted ? 0.55 : 1,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 text-[11px] font-medium">
        {steps.map((step, index) => {
          let labelClass = 'text-[var(--tg-theme-subtitle-text-color)]';
          if (index === currentIndex) labelClass = 'text-[var(--tg-theme-text-color)]';
          else if (index < currentIndex) labelClass = 'text-[var(--text-disabled)]';

          return (
            <span key={step} className={labelClass}>
              {t.wizard.sections[step]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
