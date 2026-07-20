import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  PolishSchoolLevel,
  ResponseFormInput,
  ScholarshipTrack,
  StudyRoute,
} from '../../../shared/contracts';
import { scholarshipTracks } from '../../../shared/contracts';
import { responseFormInputSchema } from '../../../shared/validation';
import { FormSection } from '../../components/FormSection';
import { useI18n } from '../../i18n/context';

type EditProfileFormProps = {
  initialValue: ResponseFormInput;
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
};

type EditableFields = Pick<
  ResponseFormInput,
  'hasPolishCitizenship' | 'rankingCountry' | 'schoolCountry' | 'scholarshipTrack' | 'studyRoute' | 'averageGrade' | 'maximumGrade'
> & { polishSchoolLevel: PolishSchoolLevel };

function fromResponse(value: ResponseFormInput): EditableFields {
  return {
    hasPolishCitizenship: value.hasPolishCitizenship,
    rankingCountry: value.rankingCountry,
    schoolCountry: value.schoolCountry,
    scholarshipTrack: value.scholarshipTrack,
    studyRoute: value.studyRoute,
    averageGrade: value.averageGrade,
    maximumGrade: value.maximumGrade,
    polishSchoolLevel: value.polishSchoolLevel ?? 'none',
  };
}

export function EditProfileForm({ initialValue, onSubmit, onCancel, disabled = false }: EditProfileFormProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<EditableFields>(() => fromResponse(initialValue));
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
    setFields(fromResponse(initialValue));
    setServerError(null);
  }, [initialValue]);

  function updateFields(patch: Partial<EditableFields>) {
    setFields((current) => {
      const next = { ...current, ...patch };
      if (next.hasPolishCitizenship) next.scholarshipTrack = 'nawa_director';
      if (next.scholarshipTrack === 'health_minister') next.studyRoute = 'preparatory_course';
      if (next.scholarshipTrack !== 'nawa_director') next.polishSchoolLevel = 'none';
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || inFlight.current) return;

    const { polishSchoolLevel, ...rest } = fields;
    const candidate: ResponseFormInput = {
      ...initialValue,
      ...rest,
      ...(fields.scholarshipTrack === 'nawa_director' ? { polishSchoolLevel } : {}),
    };
    const result = responseFormInputSchema.safeParse(candidate);
    if (!result.success) {
      setServerError(t.form.submitError);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setServerError(null);
    try {
      await onSubmit(result.data);
    } catch {
      if (mounted.current) setServerError(t.form.submitError);
    } finally {
      if (mounted.current) setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <form aria-busy={pending || disabled} aria-labelledby="edit-profile-form-title" onSubmit={handleSubmit} noValidate>
      <fieldset className="min-w-0 space-y-5 border-0 p-0" disabled={pending || disabled}>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900" role="alert">
          <h2 id="edit-profile-form-title" className="text-base font-semibold">{t.form.editProfileAction}</h2>
          <p className="mt-1">{t.form.editProfileWarning}</p>
        </div>

        <FormSection title={t.wizard.citizenshipTitle} description={t.wizard.citizenshipDescription}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">{t.wizard.polishCitizenshipQuestion}</legend>
            <div className="flex gap-3">
              {[true, false].map((value) => (
                <label key={String(value)} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="edit-hasPolishCitizenship"
                    checked={fields.hasPolishCitizenship === value}
                    onChange={() => updateFields({ hasPolishCitizenship: value })}
                  />
                  <span>{value ? t.wizard.yes : t.wizard.no}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {!fields.hasPolishCitizenship ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">{t.labels.scholarshipTrack}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {scholarshipTracks.map((track) => (
                  <label key={track} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium">
                    <input
                      type="radio"
                      name="edit-scholarshipTrack"
                      checked={fields.scholarshipTrack === track}
                      onChange={() => updateFields({ scholarshipTrack: track as ScholarshipTrack })}
                    />
                    <span>{t.choices.scholarshipTrack[track]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{t.wizard.scholarshipTrackLockedToNawa}</p>
          )}

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.studyRoute}</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
              value={fields.studyRoute}
              disabled={fields.scholarshipTrack === 'health_minister'}
              onChange={(event) => updateFields({ studyRoute: event.target.value as StudyRoute })}
            >
              {Object.entries(t.choices.studyRoute).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </FormSection>

        <FormSection title={t.wizard.geographyTitle} description={t.wizard.geographyDescription}>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.rankingCountry}</span>
            <input
              aria-label={t.labels.rankingCountry}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={fields.rankingCountry}
              onChange={(event) => updateFields({ rankingCountry: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.schoolCountry}</span>
            <input
              aria-label={t.labels.schoolCountry}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={fields.schoolCountry}
              onChange={(event) => updateFields({ schoolCountry: event.target.value })}
            />
          </label>
        </FormSection>

        <FormSection title={t.wizard.gradesTitle} description={t.wizard.gradesDescription}>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.maximumGrade}</span>
            <input
              aria-label={t.labels.maximumGrade}
              type="number"
              min={1}
              max={1000}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={fields.maximumGrade}
              onChange={(event) => updateFields({ maximumGrade: Number(event.target.value) })}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.averageGrade}</span>
            <input
              aria-label={t.labels.averageGrade}
              type="number"
              min={0}
              max={fields.maximumGrade || undefined}
              step="0.01"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={fields.averageGrade}
              onChange={(event) => updateFields({ averageGrade: Number(event.target.value) })}
            />
          </label>
        </FormSection>

        {fields.scholarshipTrack === 'nawa_director' ? (
          <FormSection title={t.wizard.nawaExtraTitle} description={t.wizard.nawaExtraDescription}>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">{t.labels.polishSchoolLevel}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['none', 'primary', 'secondary'] as const).map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium">
                    <input
                      type="radio"
                      name="edit-polishSchoolLevel"
                      checked={fields.polishSchoolLevel === level}
                      onChange={() => updateFields({ polishSchoolLevel: level })}
                    />
                    <span>{t.choices.polishSchoolLevel[level]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </FormSection>
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
            disabled={pending || disabled}
          >
            {pending ? t.form.submitting : t.form.submitUpdate}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending || disabled}
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
          >
            {t.form.cancelEdit}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
