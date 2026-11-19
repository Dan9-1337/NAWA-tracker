import type { ApplicationStatus } from '../../shared/contracts';
import { isSuspiciousStatusTransition } from '../../shared/status-transitions';
import { ChevronIcon } from '../components/icons';
import { CitySelect } from '../components/CitySelect';
import { StatusDateInput } from '../components/StatusDateInput';
import { StatusProgressStepper } from '../components/StatusProgressStepper';
import { StatusTimeline } from '../components/StatusTimeline';
import { useI18n } from '../i18n/context';
import { formatDate } from '../lib/format';

type StatusReporterProps = {
  /** Status as saved on the server. */
  savedStatus: ApplicationStatus;
  /** Status and date currently selected (may be unsaved). */
  status: ApplicationStatus;
  statusChangedAt: string;
  options: readonly ApplicationStatus[];
  dirty: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onDateChange: (isoDate: string) => void;
  /** Shown only for an award on the preparatory-course path. */
  showCity?: boolean;
  prepCourseCity?: string;
  onCityChange?: (city: string) => void;
};

const sectionLabelClass =
  'text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]';

/** Collapsed row showing the reported status, expanding into the timeline picker and date input. */
export function StatusReporter({
  savedStatus,
  status,
  statusChangedAt,
  options,
  dirty,
  open,
  onOpenChange,
  onStatusChange,
  onDateChange,
  showCity = false,
  prepCourseCity = '',
  onCityChange,
}: StatusReporterProps) {
  const { t, locale } = useI18n();

  if (!open) {
    return (
      <button
        type="button"
        className="flex w-full flex-col gap-0 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 text-left transition-opacity hover:opacity-90 active:opacity-70"
        onClick={() => onOpenChange(true)}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className={`block ${sectionLabelClass}`}>{t.labels.currentStatus}</span>
            <span className="mt-1 block text-sm font-semibold leading-snug">{t.choices.currentStatus[status]}</span>
            <span className="mt-0.5 block text-xs text-[var(--tg-theme-subtitle-text-color)]">
              {t.form.statusUpdatedShort} {formatDate(statusChangedAt, locale)}
            </span>
          </span>
          <span className="disclosure-row__chevron">
            <ChevronIcon />
          </span>
        </span>
        <StatusProgressStepper status={status} />
      </button>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={sectionLabelClass}>{t.labels.currentStatus}</h2>
        {!dirty ? (
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-[var(--tg-theme-link-color)]"
            onClick={() => onOpenChange(false)}
          >
            {t.form.collapseStatus}
          </button>
        ) : null}
      </div>
      <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.wizard.statusDescription}</p>
      <StatusTimeline
        savedStatus={savedStatus}
        selectedStatus={status}
        options={options}
        onChange={onStatusChange}
        showHints
      />
      <StatusDateInput value={statusChangedAt} onChange={onDateChange} />
      {showCity && status === 'scholarship_awarded' && onCityChange ? (
        <CitySelect
          id="prep-course-city"
          label={t.labels.prepCourseCity}
          hint={t.wizard.prepCourseCityHint}
          value={prepCourseCity}
          onChange={onCityChange}
        />
      ) : null}
      {isSuspiciousStatusTransition(savedStatus, status) ? (
        <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="alert">
          {t.form.suspiciousTransitionWarning}
        </p>
      ) : null}
    </section>
  );
}
