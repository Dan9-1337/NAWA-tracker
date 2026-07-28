import { useState } from 'react';
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
import { StatusDateInput } from '../components/StatusDateInput';
import { StatusTimeline } from '../components/StatusTimeline';
import { WizardProgressBar } from '../components/WizardProgressBar';
import { useI18n } from '../i18n/context';
import { type WizardDraft } from '../lib/draft';
import { getTelegramWebApp } from '../lib/telegram';

const steps = ['application', 'education', 'grades', 'status'] as const;
export type WizardStep = (typeof steps)[number];

export const WIZARD_STEPS: readonly WizardStep[] = steps;

type ResponseWizardStepsProps = {
  draft: WizardDraft;
  onDraftChange: (draft: WizardDraft) => void;
  stepIndex: number;
};

export function ResponseWizardSteps({ draft, onDraftChange, stepIndex }: ResponseWizardStepsProps) {
  const { t } = useI18n();
  const [resetWarning, setResetWarning] = useState<string | null>(null);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  function applyDraft(next: WizardDraft) {
    if (next.hasPolishCitizenship) next.scholarshipTrack = 'nawa_director';
    if (next.scholarshipTrack === 'health_minister') next.studyRoute = 'preparatory_course';
    if (next.scholarshipTrack !== 'nawa_director') next.polishSchoolLevel = 'none';
    onDraftChange(next);
  }

  function updateDraft(patch: Partial<WizardDraft>) {
    const resetsBranch =
      ('hasPolishCitizenship' in patch && patch.hasPolishCitizenship !== draft.hasPolishCitizenship) ||
      ('scholarshipTrack' in patch && patch.scholarshipTrack !== draft.scholarshipTrack);

    if (resetsBranch && (draft.rankingCountry || draft.schoolCountry || draft.averageGrade != null)) {
      setResetWarning(t.wizard.branchResetWarning);
    }

    applyDraft({ ...draft, ...patch });
  }

  function setSchoolCountry(schoolCountry: string) {
    const suggested = defaultMaximumGradeForSchoolCountry(schoolCountry);
    applyDraft({
      ...draft,
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

  return (
    <div className="space-y-4">
      <WizardProgressBar steps={steps} currentStep={currentStep} />

      {resetWarning ? (
        <p className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm" role="status">
          {resetWarning}
        </p>
      ) : null}

      {currentStep === 'application' ? (
        <FormSection title={t.wizard.applicationTitle} description={t.wizard.applicationDescription}>
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

      {currentStep === 'education' ? (
        <FormSection title={t.wizard.educationTitle} description={t.wizard.educationDescription}>
          <CountrySelect
            label={t.labels.rankingCountry}
            hint={t.wizard.rankingCountryHint}
            value={draft.rankingCountry}
            onChange={(value) => updateDraft({ rankingCountry: value })}
          />
          <CountrySelect
            label={t.labels.schoolCountry}
            hint={t.wizard.schoolCountryHint}
            value={draft.schoolCountry}
            onChange={setSchoolCountry}
          />
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
            onAverageChange={(value) => applyDraft({ ...draft, averageGrade: value })}
            onMaximumChange={(value) => applyDraft({ ...draft, maximumGrade: value })}
          />
          {draft.scholarshipTrack === 'nawa_director' ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t.labels.polishSchoolLevel}</legend>
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
            </fieldset>
          ) : null}
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
            showHints
          />
          <StatusDateInput
            value={draft.statusChangedAt}
            onChange={(statusChangedAt) => updateDraft({ statusChangedAt })}
          />
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
    case 'application':
      return true;
    case 'education':
      return draft.rankingCountry.trim().length > 0 && draft.schoolCountry.trim().length > 0;
    case 'grades':
      return (
        draft.maximumGrade != null &&
        draft.maximumGrade > 0 &&
        draft.averageGrade != null &&
        draft.averageGrade >= 0 &&
        draft.averageGrade <= draft.maximumGrade
      );
    case 'status':
      return draft.statusChangedAt.trim().length > 0;
    default:
      return true;
  }
}

export function getWizardEffectiveSteps(): readonly WizardStep[] {
  return steps;
}

export function wizardStepIndex(step: WizardStep): number {
  return steps.indexOf(step);
}
