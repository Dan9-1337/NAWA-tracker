import { useMemo } from 'react';
import type {
  ApplicationStatus,
  PolishSchoolLevel,
  ResponseFormInput,
  ScholarshipTrack,
  StudyRoute,
} from '../../shared/contracts';
import { scholarshipTracks } from '../../shared/contracts';
import { defaultMaximumGradeForSchoolCountry, isCountryCode } from '../../shared/countries';
import { getInitialStatusOptions } from '../../shared/status-options';
import { calculateNawaOrientationScore } from '../../shared/nawa-score';
import { CountrySelect } from '../components/CountrySelect';
import { FormSection } from '../components/FormSection';
import { GradeInputs } from '../components/GradeInputs';
import { NawaScorePreview } from '../components/NawaScorePreview';
import { RadioGroup } from '../components/RadioOption';
import { StatusTimeline } from '../components/StatusTimeline';
import { WizardProgressBar } from '../components/WizardProgressBar';
import { useI18n } from '../i18n/context';
import { type WizardDraft } from '../lib/draft';
import { getTelegramWebApp } from '../lib/telegram';

const steps = ['citizenship', 'geography', 'grades', 'nawaExtra', 'status'] as const;
export type WizardStep = (typeof steps)[number];

type ResponseWizardStepsProps = {
  draft: WizardDraft;
  onDraftChange: (draft: WizardDraft) => void;
  stepIndex: number;
};

export function ResponseWizardSteps({ draft, onDraftChange, stepIndex }: ResponseWizardStepsProps) {
  const { t } = useI18n();

  const effectiveSteps = useMemo<readonly WizardStep[]>(
    () => steps.filter((step) => step !== 'nawaExtra' || draft.scholarshipTrack === 'nawa_director'),
    [draft.scholarshipTrack],
  );
  const currentStep = effectiveSteps[Math.min(stepIndex, effectiveSteps.length - 1)];

  function updateDraft(patch: Partial<WizardDraft>) {
    const next = { ...draft, ...patch };
    if (next.hasPolishCitizenship) next.scholarshipTrack = 'nawa_director';
    if (next.scholarshipTrack === 'health_minister') next.studyRoute = 'preparatory_course';
    if (next.scholarshipTrack !== 'nawa_director') next.polishSchoolLevel = 'none';
    onDraftChange(next);
  }

  function setSchoolCountry(schoolCountry: string) {
    const suggested = defaultMaximumGradeForSchoolCountry(schoolCountry);
    updateDraft({
      schoolCountry,
      ...(suggested != null ? { maximumGrade: suggested } : { maximumGrade: null }),
    });
  }

  const hapticSelect = () => getTelegramWebApp()?.haptic.selection();

  const nawaScorePreview =
    draft.scholarshipTrack === 'nawa_director' &&
    draft.maximumGrade != null &&
    draft.maximumGrade > 0 &&
    draft.averageGrade != null
      ? calculateNawaOrientationScore(draft.averageGrade, draft.maximumGrade, draft.polishSchoolLevel)
      : null;

  const countryDefaultScale = isCountryCode(draft.schoolCountry)
    ? defaultMaximumGradeForSchoolCountry(draft.schoolCountry)
    : null;
  const maximumGradeLocked = countryDefaultScale != null;

  const countryScaleHint = maximumGradeLocked ? t.wizard.maximumGradeLockedHint : null;

  const stepNumber = effectiveSteps.indexOf(currentStep) + 1;

  const gradesNawaScore =
    draft.scholarshipTrack === 'nawa_director' &&
    draft.maximumGrade != null &&
    draft.maximumGrade > 0 &&
    draft.averageGrade != null &&
    draft.averageGrade <= draft.maximumGrade
      ? calculateNawaOrientationScore(draft.averageGrade, draft.maximumGrade, draft.polishSchoolLevel)
      : null;

  return (
    <div className="space-y-4">
      <WizardProgressBar current={stepNumber} total={effectiveSteps.length} />

      {currentStep === 'citizenship' ? (
        <FormSection title={t.wizard.citizenshipTitle} description={t.wizard.citizenshipDescription}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.wizard.polishCitizenshipQuestion}</legend>
            <RadioGroup
              name="hasPolishCitizenship"
              value={String(draft.hasPolishCitizenship)}
              options={[
                { value: 'true', label: t.wizard.yes },
                { value: 'false', label: t.wizard.no },
              ]}
              onChange={(value) => updateDraft({ hasPolishCitizenship: value === 'true' })}
              onSelect={hapticSelect}
            />
          </fieldset>
          {draft.hasPolishCitizenship ? (
            <p className="rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
              {t.wizard.scholarshipTrackLockedToNawa}
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t.wizard.scholarshipTrackQuestion}</legend>
              <RadioGroup
                name="scholarshipTrack"
                value={draft.scholarshipTrack}
                options={scholarshipTracks.map((track) => ({
                  value: track,
                  label: t.choices.scholarshipTrack[track],
                }))}
                onChange={(value) => updateDraft({ scholarshipTrack: value as ScholarshipTrack })}
                onSelect={hapticSelect}
              />
            </fieldset>
          )}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.labels.studyRoute}</legend>
            <RadioGroup
              name="studyRoute"
              value={draft.studyRoute}
              options={Object.entries(t.choices.studyRoute).map(([value, label]) => ({
                value: value as StudyRoute,
                label,
              }))}
              onChange={(value) => updateDraft({ studyRoute: value as StudyRoute })}
              onSelect={hapticSelect}
            />
          </fieldset>
        </FormSection>
      ) : null}

      {currentStep === 'geography' ? (
        <FormSection title={t.wizard.geographyTitle} description={t.wizard.geographyDescription}>
          <CountrySelect label={t.labels.rankingCountry} value={draft.rankingCountry} onChange={(v) => updateDraft({ rankingCountry: v })} allowLegacy={false} />
          <CountrySelect label={t.labels.schoolCountry} value={draft.schoolCountry} onChange={setSchoolCountry} allowLegacy={false} />
        </FormSection>
      ) : null}

      {currentStep === 'grades' ? (
        <FormSection title={t.wizard.gradesTitle} description={t.wizard.gradesDescription}>
          <GradeInputs
            averageGrade={draft.averageGrade}
            maximumGrade={draft.maximumGrade}
            averageLabel={t.labels.averageGrade}
            maximumLabel={t.labels.maximumGrade}
            maximumHint={countryScaleHint}
            maximumReadOnly={maximumGradeLocked}
            averageExceedsWarning={t.wizard.averageAboveMaximum}
            onAverageChange={(v) => updateDraft({ averageGrade: v })}
            onMaximumChange={(v) => updateDraft({ maximumGrade: v })}
          />
          {gradesNawaScore !== null ? <NawaScorePreview score={gradesNawaScore} /> : null}
        </FormSection>
      ) : null}

      {currentStep === 'nawaExtra' ? (
        <FormSection title={t.wizard.nawaExtraTitle} description={t.wizard.nawaExtraDescription}>
          <RadioGroup
            name="polishSchoolLevel"
            value={draft.polishSchoolLevel}
            options={(['none', 'primary', 'secondary'] as const).map((level) => ({
              value: level,
              label: t.choices.polishSchoolLevel[level],
            }))}
            onChange={(value) => updateDraft({ polishSchoolLevel: value as PolishSchoolLevel })}
            onSelect={hapticSelect}
          />
          {nawaScorePreview !== null ? <NawaScorePreview score={nawaScorePreview} /> : null}
        </FormSection>
      ) : null}

      {currentStep === 'status' ? (
        <FormSection title={t.wizard.statusTitle} description={t.wizard.statusDescription}>
          <StatusTimeline
            savedStatus={draft.currentStatus}
            selectedStatus={draft.currentStatus}
            options={getInitialStatusOptions()}
            onChange={(currentStatus: ApplicationStatus) => updateDraft({ currentStatus })}
          />
          <label className="space-y-2 text-sm font-medium">
            <span>{t.labels.statusChangedAt}</span>
            <input
              aria-label={t.labels.statusChangedAt}
              type="date"
              className="w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3"
              value={draft.statusChangedAt}
              onChange={(event) => updateDraft({ statusChangedAt: event.target.value })}
            />
          </label>
        </FormSection>
      ) : null}
    </div>
  );
}

export function toResponseInput(draft: WizardDraft): ResponseFormInput {
  return {
    hasPolishCitizenship: draft.hasPolishCitizenship,
    rankingCountry: draft.rankingCountry,
    schoolCountry: draft.schoolCountry,
    scholarshipTrack: draft.scholarshipTrack,
    studyRoute: draft.studyRoute,
    averageGrade: draft.averageGrade ?? 0,
    maximumGrade: draft.maximumGrade ?? 0,
    ...(draft.scholarshipTrack === 'nawa_director' ? { polishSchoolLevel: draft.polishSchoolLevel } : {}),
    currentStatus: draft.currentStatus,
    statusChangedAt: draft.statusChangedAt,
  };
}

export function canAdvanceWizardStep(step: WizardStep, draft: WizardDraft): boolean {
  switch (step) {
    case 'citizenship':
      return true;
    case 'geography':
      return draft.rankingCountry.trim().length > 0 && draft.schoolCountry.trim().length > 0;
    case 'grades':
      return (
        draft.maximumGrade != null &&
        draft.maximumGrade > 0 &&
        draft.averageGrade != null &&
        draft.averageGrade >= 0 &&
        draft.averageGrade <= draft.maximumGrade
      );
    case 'nawaExtra':
    case 'status':
      return draft.statusChangedAt.trim().length > 0;
    default:
      return true;
  }
}

export function getWizardEffectiveSteps(draft: WizardDraft): readonly WizardStep[] {
  return steps.filter((step) => step !== 'nawaExtra' || draft.scholarshipTrack === 'nawa_director');
}
