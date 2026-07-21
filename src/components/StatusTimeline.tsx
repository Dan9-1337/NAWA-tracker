import type { ApplicationStatus } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import { getTelegramWebApp } from '../lib/telegram';

type StatusTimelineProps = {
  savedStatus: ApplicationStatus;
  selectedStatus: ApplicationStatus;
  options: readonly ApplicationStatus[];
  onChange: (status: ApplicationStatus) => void;
};

export function StatusTimeline({ savedStatus, selectedStatus, options, onChange }: StatusTimelineProps) {
  const { t } = useI18n();

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{t.labels.currentStatus}</legend>
      {options.map((status) => {
        const active = selectedStatus === status;
        const isSaved = savedStatus === status;
        return (
          <label
            key={status}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${
              active
                ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)]'
                : 'border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)]'
            }`}
          >
            <input
              type="radio"
              name="application-status"
              checked={active}
              onChange={() => {
                onChange(status);
                getTelegramWebApp()?.haptic.selection();
              }}
            />
            <span className="text-sm font-medium">
              {isSaved ? '● ' : '○ '}
              {t.choices.currentStatus[status]}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
