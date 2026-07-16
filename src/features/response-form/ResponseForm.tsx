import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ApplicationStatus, ChoicePriority, GradeScaleInput, ResponseFormInput } from '../../../shared/contracts';
import { universities } from '../../../shared/universities';
import { responseFormInputSchema } from '../../../shared/validation';
import { FieldError } from '../../components/FieldError';
import { FormSection } from '../../components/FormSection';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import studyFields from '../../data/study-fields.json';
import { useI18n } from '../../i18n/context';
import type { Messages } from '../../i18n/types';
import { calculateGradePercentage } from '../../lib/grade';

const gradeScales: GradeScaleInput[] = [5, 10, 12, 20, 100, 'custom'];

const initialForm: ResponseFormInput = {
  scholarshipTrack: 'nawa_mnisw',
  studyRoute: 'direct_studies',
  studyType: 'first_cycle',
  country: 'Polska',
  gradeScale: 5,
  gradeValue: 4,
  university: 'Uniwersytet Warszawski',
  studyField: 'Informatyka',
  choicePriority: 'first_choice',
  applicationStatus: 'submitted',
};

type ResponseFormProps = {
  mode: 'create' | 'update';
  initialValue?: ResponseFormInput;
  onSubmit: (value: ResponseFormInput, turnstileToken?: string) => void | Promise<void>;
  onDraftChange?: (value: ResponseFormInput) => void;
  disabled?: boolean;
};

export function ResponseForm({ mode, initialValue, onSubmit, onDraftChange, disabled = false }: ResponseFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<ResponseFormInput>(initialValue ?? initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef(form);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const turnstileGeneration = useRef(0);
  const callbackGeneration = turnstileGeneration.current;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current = false;
    };
  }, []);

  useEffect(() => {
    const next = initialValue ?? initialForm;
    formRef.current = next;
    setForm(next);
    setErrors({});
    setServerError(null);
    setTurnstileToken('');
  }, [initialValue, mode]);

  const normalizedScale = useMemo(() => {
    if (form.gradeScale === 'custom') {
      return form.customGradeScale ?? 0;
    }

    return form.gradeScale;
  }, [form.customGradeScale, form.gradeScale]);

  const calculatedPercentage = calculateGradePercentage(normalizedScale, form.gradeValue);
  const canShowDecisionDate = form.applicationStatus === 'positive_decision' || form.applicationStatus === 'negative_decision';

  function resetTurnstile() {
    const nextGeneration = turnstileGeneration.current + 1;
    turnstileGeneration.current = nextGeneration;
    setTurnstileResetKey(nextGeneration);
    setTurnstileToken('');
  }

  function updateField<K extends keyof ResponseFormInput>(key: K, value: ResponseFormInput[K]) {
    const next: ResponseFormInput = { ...formRef.current, [key]: value };
    if (
      key === 'applicationStatus' &&
      value !== 'positive_decision' &&
      value !== 'negative_decision'
    ) {
      next.decisionDate = null;
    }
    formRef.current = next;
    setForm(next);
    onDraftChange?.(next);
    setServerError(null);
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      if (key === 'applicationStatus') delete next.decisionDate;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || inFlight.current || (mode === 'create' && !turnstileToken)) return;
    const result = responseFormInputSchema.safeParse(form);

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string' && !nextErrors[path]) {
          nextErrors[path] = validationMessage(path, t);
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit(result.data, mode === 'create' ? turnstileToken : undefined);
    } catch {
      if (mounted.current) setServerError(t.form.submitError);
    } finally {
      if (mounted.current) {
        if (mode === 'create') {
          resetTurnstile();
        }
        setPending(false);
      }
      inFlight.current = false;
    }
  }

  return (
    <form aria-busy={pending || disabled} aria-labelledby="response-form-title" onSubmit={handleSubmit} noValidate>
      <fieldset className="min-w-0 space-y-5 border-0 p-0" disabled={pending || disabled}>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
        <div className="mr-auto">
          <h2 id="response-form-title" className="text-lg font-semibold text-slate-950">{t.form.title}</h2>
          <p className="text-sm leading-6 text-slate-600">{t.form.description}</p>
        </div>
        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{t.form.preview}</span>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white">
          {mode === 'create' ? t.form.modeCreate : t.form.modeUpdate}
        </span>
        <span className="text-sm text-slate-600">
          {t.form.calculatedPercent}: <strong>{calculatedPercentage.toFixed(1)}%</strong>
        </span>
      </div>

      <FormSection title={t.form.programSectionTitle} description={t.form.programSectionDescription}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.scholarshipTrack}</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.scholarshipTrack}
              onChange={(event) => updateField('scholarshipTrack', event.target.value as ResponseFormInput['scholarshipTrack'])}
            >
              {Object.entries(t.choices.scholarshipTrack).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.studyRoute}</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.studyRoute}
              onChange={(event) => updateField('studyRoute', event.target.value as ResponseFormInput['studyRoute'])}
            >
              {Object.entries(t.choices.studyRoute).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.studyType}</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.studyType}
              onChange={(event) => updateField('studyType', event.target.value as ResponseFormInput['studyType'])}
            >
              {Object.entries(t.choices.studyType).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.country}</span>
            <input
              id="response-country"
              aria-label={t.labels.country}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.country}
              onChange={(event) => updateField('country', event.target.value)}
              placeholder={t.form.countryPlaceholder}
              aria-invalid={Boolean(errors.country)}
              aria-describedby={errors.country ? 'response-country-error' : undefined}
            />
            <FieldError id="response-country-error" message={errors.country} />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>{t.labels.university}</span>
            <input
              id="response-university"
              aria-label={t.labels.university}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.university}
              list="university-suggestions"
              onChange={(event) => updateField('university', event.target.value)}
              placeholder={t.form.universityPlaceholder}
              aria-invalid={Boolean(errors.university)}
              aria-describedby={errors.university ? 'response-university-hint response-university-error' : 'response-university-hint'}
            />
            <datalist id="university-suggestions">
              {universities.map((university) => <option key={university} value={university} />)}
            </datalist>
            <p id="response-university-hint" className="text-xs leading-5 text-slate-500">{t.form.universityHint}</p>
            <FieldError id="response-university-error" message={errors.university} />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>{t.labels.studyField}</span>
            <input
              id="response-study-field"
              aria-label={t.labels.studyField}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.studyField}
              list="study-field-suggestions"
              onChange={(event) => updateField('studyField', event.target.value)}
              placeholder={t.form.studyFieldPlaceholder}
              aria-invalid={Boolean(errors.studyField)}
              aria-describedby={errors.studyField ? 'response-study-field-error' : undefined}
            />
            <datalist id="study-field-suggestions">
              {studyFields.map((studyField) => <option key={studyField} value={studyField} />)}
            </datalist>
            <FieldError id="response-study-field-error" message={errors.studyField} />
          </label>
        </div>
      </FormSection>

      <FormSection title={t.form.choiceSectionTitle} description={t.form.choiceSectionDescription}>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>{t.labels.choicePriority}</span>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            value={form.choicePriority}
            onChange={(event) => updateField('choicePriority', event.target.value as ChoicePriority)}
          >
            {Object.entries(t.choices.choicePriority).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </FormSection>

      <FormSection title={t.form.gradesSectionTitle} description={t.form.gradesSectionDescription}>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">{t.labels.gradeScale}</legend>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {gradeScales.map((scale) => (
              <label
                key={String(scale)}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium"
              >
                <input
                  type="radio"
                  name="gradeScale"
                  checked={form.gradeScale === scale}
                  onChange={() => {
                    updateField('gradeScale', scale);
                    if (scale !== 'custom') {
                      updateField('customGradeScale', undefined);
                    }
                  }}
                />
                <span>{t.choices.gradeScale[String(scale) as keyof typeof t.choices.gradeScale]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.gradeScale === 'custom' ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.form.customScaleLabel}</span>
            <input
              id="response-custom-grade-scale"
              aria-label={t.form.customScaleLabel}
              type="number"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              min={1}
              max={1000}
              value={form.customGradeScale ?? ''}
              onChange={(event) => updateField('customGradeScale', event.target.value === '' ? undefined : Number(event.target.value))}
              aria-invalid={Boolean(errors.customGradeScale)}
              aria-describedby={errors.customGradeScale ? 'response-custom-grade-scale-error' : undefined}
            />
            <FieldError id="response-custom-grade-scale-error" message={errors.customGradeScale} />
          </label>
        ) : null}

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>{t.labels.gradeValue}</span>
          <input
            id="response-grade-value"
            aria-label={t.labels.gradeValue}
            type="number"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            min={0}
            max={normalizedScale || undefined}
            value={form.gradeValue}
            onChange={(event) => updateField('gradeValue', Number(event.target.value))}
            aria-invalid={Boolean(errors.gradeValue)}
            aria-describedby={errors.gradeValue ? 'response-grade-value-error' : undefined}
          />
          <FieldError id="response-grade-value-error" message={errors.gradeValue} />
        </label>
      </FormSection>

      <FormSection title={t.form.statusSectionTitle} description={t.form.statusSectionDescription}>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>{t.labels.applicationStatus}</span>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            value={form.applicationStatus}
            onChange={(event) => updateField('applicationStatus', event.target.value as ApplicationStatus)}
          >
            {Object.entries(t.choices.applicationStatus).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {canShowDecisionDate ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.form.decisionDateLabel}</span>
            <input
              id="response-decision-date"
              aria-label={t.form.decisionDateLabel}
              type="date"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={form.decisionDate ?? ''}
              onChange={(event) => updateField('decisionDate', event.target.value === '' ? null : event.target.value)}
              aria-invalid={Boolean(errors.decisionDate)}
              aria-describedby={errors.decisionDate ? 'response-decision-date-hint response-decision-date-error' : 'response-decision-date-hint'}
            />
            <p id="response-decision-date-hint" className="text-xs leading-5 text-slate-500">{t.form.decisionDateHint}</p>
            <FieldError id="response-decision-date-error" message={errors.decisionDate} />
          </label>
        ) : null}
      </FormSection>

      {mode === 'create' ? (
        <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">{t.form.turnstileHint}</p>
          <div className="mt-4">
            <TurnstileWidget
              key={turnstileResetKey}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onVerify={(token) => {
                if (callbackGeneration !== turnstileGeneration.current || inFlight.current) return;
                const challengeToken = token.trim();
                if (!challengeToken) {
                  resetTurnstile();
                  setServerError(t.turnstile.error);
                  return;
                }
                setTurnstileToken(challengeToken);
                setServerError(null);
              }}
              onExpire={() => {
                if (callbackGeneration !== turnstileGeneration.current || inFlight.current) return;
                resetTurnstile();
                setServerError(t.turnstile.expired);
              }}
              onError={() => {
                if (callbackGeneration !== turnstileGeneration.current || inFlight.current) return;
                resetTurnstile();
                setServerError(t.turnstile.error);
              }}
              resetKey={turnstileResetKey}
            />
          </div>
        </div>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900" role="alert">
          {t.form.validationPrefix}
          <ul className="mt-2 list-disc pl-5">
            {Object.values(errors).map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      ) : null}

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
          disabled={pending || disabled || (mode === 'create' && !turnstileToken)}
        >
          {pending ? t.form.submitting : mode === 'create' ? t.form.submitCreate : t.form.submitUpdate}
        </button>
      </div>
      </fieldset>
    </form>
  );
}

function validationMessage(path: string, t: Messages): string {
  const messages: Record<string, string> = {
    country: t.validation.country,
    university: t.validation.university,
    studyField: t.validation.studyField,
    customGradeScale: t.validation.customGradeScale,
    gradeValue: t.validation.gradeValue,
    decisionDate: t.validation.decisionDate,
  };
  return messages[path] ?? t.validation.invalid;
}
