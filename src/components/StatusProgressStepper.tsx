import type { ApplicationStatus } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import {
  getStatusOutcomeTone,
  getStatusPhaseIndex,
  statusPhaseOrder,
  type StatusPhaseId,
} from '../lib/status-phases';

type StatusProgressStepperProps = {
  status: ApplicationStatus;
};

function phaseLabel(t: ReturnType<typeof useI18n>['t'], phase: StatusPhaseId): string {
  return t.statusPhase[phase];
}

export function StatusProgressStepper({ status }: StatusProgressStepperProps) {
  const { t } = useI18n();
  const activeIndex = getStatusPhaseIndex(status);
  const tone = getStatusOutcomeTone(status);
  const activePhase = statusPhaseOrder[activeIndex];
  const stepperLabel = phaseLabel(t, activePhase);

  return (
    <div className="status-stepper" role="img" aria-label={stepperLabel}>
      <div className="status-stepper__track">
        {statusPhaseOrder.map((phase, index) => {
          const completed = index < activeIndex;
          const active = index === activeIndex;
          const isLast = index === statusPhaseOrder.length - 1;

          let nodeClass = 'status-stepper__node';
          if (completed) nodeClass += ' status-stepper__node--completed';
          if (active) nodeClass += ' status-stepper__node--active';
          if (active && tone === 'positive') nodeClass += ' status-stepper__node--positive';
          if (active && tone === 'negative') nodeClass += ' status-stepper__node--negative';

          return (
            <div key={phase} className="status-stepper__segment">
              <span className={nodeClass} />
              {!isLast ? (
                <span
                  className={`status-stepper__line${completed ? ' status-stepper__line--completed' : ''}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="status-stepper__labels">
        {statusPhaseOrder.map((phase, index) => (
          <span
            key={phase}
            className={`status-stepper__label${
              index === activeIndex ? ' status-stepper__label--active' : ''
            }`}
          >
            {phaseLabel(t, phase)}
          </span>
        ))}
      </div>
    </div>
  );
}
