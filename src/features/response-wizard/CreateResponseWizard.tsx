import { useMemo, useRef, useState } from 'react';
import type {
  ApplicationStatus,
  PolishSchoolLevel,
  ResponseFormInput,
  ScholarshipTrack,
  StudyRoute,
} from '../../../shared/contracts';
import { scholarshipTracks } from '../../../shared/contracts';
import { responseFormInputSchema } from '../../../shared/validation';
import { calculateNawaOrientationScore, nawaOrientationThreshold } from '../../../shared/nawa-score';
import { FormSection } from '../../components/FormSection';
import { PrivacyNotice } from '../../components/PrivacyNotice';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { useI18n } from '../../i18n/context';

type Draft = {
  hasPolishCitizenship: boolean;
  hasSecondCitizenship: boolean;
  rankingCountry: string;
  schoolCountry: string;
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  averageGrade: number;
  maximumGrade: number;
  polishSchoolLevel: PolishSchoolLevel;
  currentStatus: ApplicationStatus;
  statusChangedAt: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialDraft: Draft = {
  hasPolishCitizenship: false,
  hasSecondCitizenship: false,
  rankingCountry: '',
  schoolCountry: '',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  averageGrade: 0,
  maximumGrade: 100,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: todayIsoDate(),
};

function toResponseInput(draft: Draft): ResponseFormInput {
  return {
    hasPolishCitizenship: draft.hasPolishCitizenship,
    rankingCountry: draft.rankingCountry,
    schoolCountry: draft.schoolCountry,
    scholarshipTrack: draft.scholarshipTrack,
    studyRoute: draft.studyRoute,
    averageGrade: draft.averageGrade,
    maximumGrade: draft.maximumGrade,
    ...(draft.scholarshipTrack === 'nawa_director' ? { polishSchoolLevel: draft.polishSchoolLevel } : {}),
    currentStatus: draft.currentStatus,
    statusChangedAt: draft.statusChangedAt,
  };
}

const steps = ['citizenship', 'geography', 'grades', 'nawaExtra', 'status', 'summary'] as const;
type Step = (typeof steps)[number];

type CreateResponseWizardProps = {
  onSubmit: (value: ResponseFormInput, turnstileToken: string) => void | Promise<void>;
  disabled?: boolean;
  siteKey?: string;
};

export function CreateResponseWizard({
  onSubmit,
  disabled = false,
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY,
}: CreateResponseWizardProps) {
  const { t } = useI18n();
  const [privacyAcceptedAt, setPrivacyAcceptedAt] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const turnstileGeneration = useRef(0);
  const callbackGeneration = turnstileGeneration.current;

  const effectiveSteps = useMemo<readonly Step[]>(
    () => steps.filter((step) => step !== 'nawaExtra' || draft.scholarshipTrack === 'nawa_director'),
    [draft.scholarshipTrack],
  );
  const currentStep = effectiveSteps[Math.min(stepIndex, effectiveSteps.length - 1)];

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (next.hasPolishCitizenship) next.scholarshipTrack = 'nawa_director';
      if (next.scholarshipTrack === 'health_minister') next.studyRoute = 'preparatory_course';
      if (next.scholarshipTrack !== 'nawa_director') next.polishSchoolLevel = 'none';
      return next;
    });
  }

  function resetTurnstile() {
    const nextGeneration = turnstileGeneration.current + 1;
    turnstileGeneration.current = nextGeneration;
    setTurnstileResetKey(nextGeneration);
    setTurnstileToken('');
  }

  const unsupportedCategory = draft.hasPolishCitizenship && !draft.hasSecondCitizenship;

  function canAdvance(step: Step): boolean {
    switch (step) {
      case 'citizenship':
        return !unsupportedCategory;
      case 'geography':
        return draft.rankingCountry.trim().length > 0 && draft.schoolCountry.trim().length > 0;
      case 'grades':
        return draft.maximumGrade > 0 && draft.averageGrade >= 0 && draft.averageGrade <= draft.maximumGrade;
      case 'nawaExtra':
      case 'status':
        return draft.statusChangedAt.trim().length > 0;
      case 'summary':
        return true;
      default:
        return true;
    }
  }

  function goNext() {
    setStepIndex((index) => Math.min(index + 1, effectiveSteps.length - 1));
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  const nawaScorePreview =
    draft.scholarshipTrack === 'nawa_director' && draft.maximumGrade > 0
      ? calculateNawaOrientationScore(draft.averageGrade, draft.maximumGrade, draft.polishSchoolLevel)
      : null;

  async function handleSubmit() {
    if (disabled || inFlight.current || !turnstileToken) return;
    const result = responseFormInputSchema.safeParse(toResponseInput(draft));
    if (!result.success) {
      setServerError(t.form.submitError);
      return;
    }

    setServerError(null);
    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit(result.data, turnstileToken);
    } catch {
      if (mounted.current) setServerError(t.form.submitError);
    } finally {
      if (mounted.current) {
        resetTurnstile();
        setPending(false);
      }
      inFlight.current = false;
    }
  }

  if (!privacyAcceptedAt) {
    return <PrivacyNotice onAccept={(acceptedAt) => setPrivacyAcceptedAt(acceptedAt)} />;
  }

  const stepNumber = effectiveSteps.indexOf(currentStep) + 1;

  return (
    <div aria-busy={pending || disabled} className="space-y-5">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-500 shadow-sm">
        <span>{t.form.modeCreate}</span>
        <span>{t.wizard.stepLabel(String(stepNumber), String(effectiveSteps.length))}</span>
      </div>

      {currentStep === 'citizenship' ? (
        <FormSection title={t.wizard.citizenshipTitle} description={t.wizard.citizenshipDescription}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">{t.wizard.polishCitizenshipQuestion}</legend>
            <div className="flex gap-3">
              {[true, false].map((value) => (
                <label
                  key={String(value)}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium"
                >
                  <input
                    type="radio"
                    name="hasPolishCitizenship"
                    checked={draft.hasPolishCitizenship === value}
                    onChange={() => updateDraft({ hasPolishCitizenship: value, hasSecondCitizenship: false })}
                  />
                  <span>{value ? t.wizard.yes : t.wizard.no}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {draft.hasPolishCitizenship ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">{t.wizard.secondCitizenshipQuestion}</legend>
              <div className="flex gap-3">
                {[true, false].map((value) => (
                  <label
                    key={String(value)}
                    className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium"
                  >
                    <input
                      type="radio"
                      name="hasSecondCitizenship"
                      checked={draft.hasSecondCitizenship === value}
                      onChange={() => updateDraft({ hasSecondCitizenship: value })}
                    />
                    <span>{value ? t.wizard.yes : t.wizard.no}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {unsupportedCategory ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
              <p className="font-semibold">{t.wizard.unsupportedCategoryTitle}</p>
              <p className="mt-1">{t.wizard.unsupportedCategoryBody}</p>
            </div>
          ) : null}

          {draft.hasPolishCitizenship && draft.hasSecondCitizenship ? (
            <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{t.wizard.scholarshipTrackLockedToNawa}</p>
          ) : null}

          {!draft.hasPolishCitizenship ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">{t.labels.scholarshipTrack}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {scholarshipTracks.map((track) => (
                  <label
                    key={track}
                    className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium"
                  >
                    <input
                      type="radio"
                      name="scholarshipTrack"
                      checked={draft.scholarshipTrack === track}
                      onChange={() => updateDraft({ scholarshipTrack: track })}
                    />
                    <span>{t.choices.scholarshipTrack[track]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.studyRoute}</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
              value={draft.studyRoute}
              disabled={draft.scholarshipTrack === 'health_minister'}
              onChange={(event) => updateDraft({ studyRoute: event.target.value as StudyRoute })}
            >
              {Object.entries(t.choices.studyRoute).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </FormSection>
      ) : null}

      {currentStep === 'geography' ? (
        <FormSection title={t.wizard.geographyTitle} description={t.wizard.geographyDescription}>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.rankingCountry}</span>
            <input
              aria-label={t.labels.rankingCountry}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={draft.rankingCountry}
              onChange={(event) => updateDraft({ rankingCountry: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.schoolCountry}</span>
            <input
              aria-label={t.labels.schoolCountry}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={draft.schoolCountry}
              onChange={(event) => updateDraft({ schoolCountry: event.target.value })}
            />
          </label>
        </FormSection>
      ) : null}

      {currentStep === 'grades' ? (
        <FormSection title={t.wizard.gradesTitle} description={t.wizard.gradesDescription}>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.maximumGrade}</span>
            <input
              aria-label={t.labels.maximumGrade}
              type="number"
              min={1}
              max={1000}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={draft.maximumGrade}
              onChange={(event) => updateDraft({ maximumGrade: Number(event.target.value) })}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.averageGrade}</span>
            <input
              aria-label={t.labels.averageGrade}
              type="number"
              min={0}
              max={draft.maximumGrade || undefined}
              step="0.01"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={draft.averageGrade}
              onChange={(event) => updateDraft({ averageGrade: Number(event.target.value) })}
            />
          </label>
        </FormSection>
      ) : null}

      {currentStep === 'nawaExtra' ? (
        <FormSection title={t.wizard.nawaExtraTitle} description={t.wizard.nawaExtraDescription}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">{t.labels.polishSchoolLevel}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['none', 'primary', 'secondary'] as const).map((level) => (
                <label
                  key={level}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium"
                >
                  <input
                    type="radio"
                    name="polishSchoolLevel"
                    checked={draft.polishSchoolLevel === level}
                    onChange={() => updateDraft({ polishSchoolLevel: level })}
                  />
                  <span>{t.choices.polishSchoolLevel[level]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {nawaScorePreview !== null ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p>{t.nawaScore.resultSentence(nawaScorePreview.toFixed(2))}</p>
              <p className="mt-1">{t.nawaScore.thresholdSentence}</p>
              <p className="mt-1">
                {nawaScorePreview >= nawaOrientationThreshold ? t.nawaScore.aboveThreshold : t.nawaScore.belowThreshold}
              </p>
              <p className="mt-2 text-xs text-emerald-800">{t.nawaScore.disclaimer}</p>
            </div>
          ) : null}
        </FormSection>
      ) : null}

      {currentStep === 'status' ? (
        <FormSection title={t.wizard.statusTitle} description={t.wizard.statusDescription}>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t.labels.currentStatus}</span>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={draft.currentStatus}
              onChange={(event) => updateDraft({ currentStatus: event.target.value as ApplicationStatus })}
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
              aria-label={t.labels.statusChangedAt}
              type="date"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={draft.statusChangedAt}
              onChange={(event) => updateDraft({ statusChangedAt: event.target.value })}
            />
          </label>
        </FormSection>
      ) : null}

      {currentStep === 'summary' ? (
        <FormSection title={t.wizard.summaryTitle} description={t.wizard.summaryDescription}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <SummaryRow label={t.labels.scholarshipTrack} value={t.choices.scholarshipTrack[draft.scholarshipTrack]} />
            <SummaryRow label={t.labels.studyRoute} value={t.choices.studyRoute[draft.studyRoute]} />
            <SummaryRow label={t.labels.rankingCountry} value={draft.rankingCountry} />
            <SummaryRow label={t.labels.schoolCountry} value={draft.schoolCountry} />
            <SummaryRow label={t.labels.averageGrade} value={String(draft.averageGrade)} />
            <SummaryRow label={t.labels.maximumGrade} value={String(draft.maximumGrade)} />
            {draft.scholarshipTrack === 'nawa_director' ? (
              <SummaryRow label={t.labels.polishSchoolLevel} value={t.choices.polishSchoolLevel[draft.polishSchoolLevel]} />
            ) : null}
            <SummaryRow label={t.labels.currentStatus} value={t.choices.currentStatus[draft.currentStatus]} />
            <SummaryRow label={t.labels.statusChangedAt} value={draft.statusChangedAt} />
          </dl>

          <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
            <p className="text-sm leading-6 text-slate-600">
              {siteKey ? t.form.turnstileHint : t.form.turnstileMissingKey}
            </p>
            <div className="mt-4">
              <TurnstileWidget
                key={turnstileResetKey}
                siteKey={siteKey}
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

          {serverError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900" role="alert">
              {serverError}
            </div>
          ) : null}

          {pending ? (
            <p className="text-sm font-medium text-slate-600" role="status" aria-live="polite">
              {t.form.submitting}
            </p>
          ) : null}
        </FormSection>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {effectiveSteps.indexOf(currentStep) > 0 ? (
          <button
            type="button"
            onClick={goBack}
            disabled={pending || disabled}
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
          >
            {t.wizard.back}
          </button>
        ) : null}

        {currentStep === 'summary' ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || disabled || !turnstileToken}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
          >
            {pending ? t.form.submitting : t.form.submitCreate}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={pending || disabled || !canAdvance(currentStep)}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {t.wizard.next}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
