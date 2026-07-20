import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApplicationStatus, ResponseFormInput } from '../../../shared/contracts';
import { isSuspiciousStatusTransition } from '../../../shared/status-transitions';
import { FormSection } from '../../components/FormSection';
import { useI18n } from '../../i18n/context';

type UpdateApplicationStatusFormProps = {
  initialValue: ResponseFormInput;
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  onRequestEditProfile?: () => void;
  disabled?: boolean;
};

export function UpdateApplicationStatusForm({
  initialValue,
  onSubmit,
  onRequestEditProfile,
  disabled = false,
}: UpdateApplicationStatusFormProps) {
  const { t } = useI18n();
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>(initialValue.currentStatus);
  const [statusChangedAt, setStatusChangedAt] = useState(initialValue.statusChangedAt);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current = false;
    };
  }, []);

  useEffect(() => {
    setCurrentStatus(initialValue.currentStatus);
    setStatusChangedAt(initialValue.statusChangedAt);
    setServerError(null);
  }, [initialValue]);

  const suspicious = isSuspiciousStatusTransition(initialValue.currentStatus, currentStatus);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || inFlight.current) return;

    inFlight.current = true;
    setPending(true);
    setServerError(null);
    try {
      await onSubmit({ ...initialValue, currentStatus, statusChangedAt });
    } catch {
      if (mounted.current) setServerError(t.form.submitError);
    } finally {
      if (mounted.current) setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <form aria-busy={pending || disabled} aria-labelledby="update-status-form-title" onSubmit={handleSubmit} noValidate>
      <fieldset className="min-w-0 space-y-5 border-0 p-0" disabled={pending || disabled}>
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
          <div className="mr-auto">
            <h2 id="update-status-form-title" className="text-lg font-semibold text-slate-950">{t.form.title}</h2>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white">{t.form.modeUpdate}</span>
        </div>

        <FormSection title={t.wizard.statusTitle} description={t.wizard.statusDescription}>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.currentStatus}</span>
            <select
              id="update-current-status"
              aria-label={t.labels.currentStatus}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={currentStatus}
              onChange={(event) => setCurrentStatus(event.target.value as ApplicationStatus)}
            >
              {Object.entries(t.choices.currentStatus).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.statusChangedAt}</span>
            <input
              id="update-status-changed-at"
              aria-label={t.labels.statusChangedAt}
              type="date"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={statusChangedAt}
              onChange={(event) => setStatusChangedAt(event.target.value)}
            />
          </label>

          {suspicious ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              {t.form.suspiciousTransitionWarning}
            </p>
          ) : null}
        </FormSection>

        {serverError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900" role="alert">
            {serverError}
          </div>
        ) : null}

        {pending ? <p className="text-sm font-medium text-slate-600" role="status" aria-live="polite">{t.form.submitting}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
            disabled={pending || disabled}
          >
            {pending ? t.form.submitting : t.form.submitUpdate}
          </button>
          {onRequestEditProfile ? (
            <button
              type="button"
              onClick={onRequestEditProfile}
              disabled={pending || disabled}
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
            >
              {t.form.editProfileAction}
            </button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
