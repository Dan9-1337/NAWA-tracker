import type { ApplicationStatus } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import { getTelegramWebApp } from '../lib/telegram';

type StatusTimelineProps = {
  savedStatus: ApplicationStatus;
  selectedStatus: ApplicationStatus;
  options: readonly ApplicationStatus[];
  onChange: (status: ApplicationStatus) => void;
  showHints?: boolean;
};

function markerFor(status: ApplicationStatus, savedStatus: ApplicationStatus, selectedStatus: ApplicationStatus): string {
  if (selectedStatus === status) return '●';
  const savedIndex = optionsIndex(savedStatus);
  const statusIndex = optionsIndex(status);
  if (statusIndex < savedIndex) return '✓';
  return '○';
}

function optionsIndex(status: ApplicationStatus): number {
  const order: ApplicationStatus[] = [
    'submitted',
    'formal_review_in_progress',
    'correction_requested',
    'formal_review_completed',
    'merit_review_in_progress',
    'merit_review_positive',
    'merit_review_negative',
    'awaiting_decision',
    'scholarship_awarded',
    'scholarship_not_awarded',
  ];
  return order.indexOf(status);
}

export function StatusTimeline({
  savedStatus,
  selectedStatus,
  options,
  onChange,
  showHints = false,
}: StatusTimelineProps) {
  const { t } = useI18n();

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{t.labels.currentStatus}</legend>
      {options.map((status) => {
        const active = selectedStatus === status;
        const marker = markerFor(status, savedStatus, selectedStatus);
        return (
          <label
            key={status}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${
              active
                ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)]'
                : 'border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)]'
            }`}
          >
            <input
              type="radio"
              name="application-status"
              className="mt-1"
              checked={active}
              onChange={() => {
                onChange(status);
                getTelegramWebApp()?.haptic.selection();
              }}
            />
            <span className="text-sm">
              <span className="font-medium" aria-hidden="true">
                {marker}{' '}
              </span>
              <span className="font-medium">{t.choices.currentStatus[status]}</span>
              {showHints ? (
                <span className="mt-0.5 block text-xs text-[var(--tg-theme-subtitle-text-color)]">
                  {t.choices.currentStatusHint[status]}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
