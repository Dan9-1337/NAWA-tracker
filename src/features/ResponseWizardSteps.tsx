import type { ResponseFormInput } from '../../shared/contracts';
import { WizardProgressBar } from '../components/WizardProgressBar';
import { useI18n } from '../i18n/context';
import type { Messages } from '../i18n/types';
import { type WizardDraft } from '../lib/draft';
import { normalizeDraft, withSchoolCountry } from '../lib/draft-rules';
import { EducationStep } from './wizard/EducationStep';
import { GradesStep } from './wizard/GradesStep';

const steps = ['education', 'grades'] as const;
export type WizardStep = (typeof steps)[number];

type ResponseWizardStepsProps = {
  draft: WizardDraft;
  onDraftChange: (draft: WizardDraft) => void;
  stepIndex: number;
};

export function ResponseWizardSteps({ draft, onDraftChange, stepIndex }: ResponseWizardStepsProps) {
  const { t } = useI18n();
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const update = (patch: Partial<WizardDraft>) => onDraftChange(normalizeDraft({ ...draft, ...patch }));

  const stepBlocked = !canAdvanceWizardStep(currentStep, draft);
  // What is still missing is said once, in the hint below the step. Fields are not painted red before the
  // user has touched them: a step always opens with required fields empty.
  const stepHint = stepBlocked ? wizardStepValidationHint(currentStep, draft, t) : null;

  return (
    <div className="space-y-4">
      <WizardProgressBar steps={steps} currentStep={currentStep} />

      {currentStep === 'education' ? (
        <EducationStep
          draft={draft}
          onRankingCountryChange={(rankingCountry) => update({ rankingCountry })}
          onSchoolCountryChange={(schoolCountry) => onDraftChange(withSchoolCountry(draft, schoolCountry))}
        />
      ) : null}

      {currentStep === 'grades' ? <GradesStep draft={draft} onChange={update} /> : null}

      {stepHint ? (
        <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
          {stepHint}
        </p>
      ) : null}
    </div>
  );
}

export function wizardStepValidationHint(step: WizardStep, draft: WizardDraft, t: Messages): string | null {
  if (canAdvanceWizardStep(step, draft)) return null;
  switch (step) {
    case 'education':
      if (!draft.rankingCountry.trim()) return t.wizard.validation.rankingCountryRequired;
      if (!draft.schoolCountry.trim()) return t.wizard.validation.schoolCountryRequired;
      return t.wizard.validation.educationRequired;
    case 'grades':
      if (
        draft.averageGrade != null &&
        draft.maximumGrade != null &&
        draft.averageGrade > draft.maximumGrade
      ) {
        return t.wizard.averageAboveMaximum;
      }
      if (draft.applicantKind === 'student_in_poland' && draft.averageGrade != null && draft.averageGrade < 4.75) {
        return t.wizard.validation.studentAverageRequired;
      }
      return t.wizard.validation.gradesRequired;
    default:
      return null;
  }
}

/**
 * The survey to save. `intakeYear` is the year the server reported (the intake summary for a new survey, the
 * saved response for an edit); the client never decides it (ADR 0018).
 */
export function toResponseInput(draft: WizardDraft, intakeYear: number): ResponseFormInput {
  return {
    intakeYear,
    hasPolishCitizenship: draft.hasPolishCitizenship,
    rankingCountry: draft.rankingCountry,
    schoolCountry: draft.schoolCountry,
    scholarshipTrack: draft.scholarshipTrack,
    studyRoute: draft.studyRoute,
    ...(draft.targetUniversity ? { targetUniversity: draft.targetUniversity } : {}),
    // The first screen no longer asks for the field of study; the server contract still wants a value.
    studyField: draft.studyField || 'other',
    ...(draft.prepCourseCity ? { prepCourseCity: draft.prepCourseCity } : {}),
    gradeBasis: draft.gradeBasis,
    applicantKind: draft.applicantKind,
    averageGrade: draft.averageGrade ?? 0,
    maximumGrade: draft.maximumGrade ?? 0,
    ...(draft.scholarshipTrack === 'nawa_director' ? { polishSchoolLevel: draft.polishSchoolLevel } : {}),
    currentStatus: draft.currentStatus,
    statusChangedAt: draft.statusChangedAt,
  };
}

export function canAdvanceWizardStep(step: WizardStep, draft: WizardDraft): boolean {
  switch (step) {
    case 'education':
      return draft.rankingCountry.trim().length > 0 && draft.schoolCountry.trim().length > 0;
    case 'grades':
      return (
        draft.maximumGrade != null &&
        draft.maximumGrade > 0 &&
        draft.averageGrade != null &&
        draft.averageGrade >= 0 &&
        draft.averageGrade <= draft.maximumGrade &&
        (draft.applicantKind !== 'student_in_poland' || (draft.maximumGrade === 5 && draft.averageGrade >= 4.75))
      );
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
