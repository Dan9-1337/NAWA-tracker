import type { ReactNode } from 'react';
import type { ApplicantKind, GradeBasis, PolishSchoolLevel } from '../../../shared/contracts';
import { FormSection } from '../../components/FormSection';
import { GradeInputs } from '../../components/GradeInputs';
import { NawaScorePreview } from '../../components/NawaScorePreview';
import { RadioGroup } from '../../components/RadioOption';
import { useI18n } from '../../i18n/context';
import type { WizardDraft } from '../../lib/draft';
import {
  isMaximumGradeLocked,
  isPolishSchoolBonusApplicable,
  previewOrientationScore,
} from '../../lib/draft-rules';
import { getTelegramWebApp } from '../../lib/telegram';

const hapticSelect = () => getTelegramWebApp()?.haptic.selection();

function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
      role="status"
    >
      {children}
    </p>
  );
}

type GradesStepProps = {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
};

export function GradesStep({ draft, onChange }: GradesStepProps) {
  const { t } = useI18n();
  const isStudentInPoland = draft.applicantKind === 'student_in_poland';
  const maximumLocked = isMaximumGradeLocked(draft);
  const preview = previewOrientationScore(draft);

  return (
    <FormSection title={t.wizard.gradesTitle} description={t.wizard.gradesDescription}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.labels.applicantKind}</legend>
        <RadioGroup
          name="applicantKind"
          value={draft.applicantKind}
          options={(['school_leaver', 'student_in_poland'] as const).map((kind) => ({
            value: kind,
            label: t.choices.applicantKind[kind],
          }))}
          onChange={(value) => onChange({ applicantKind: value as ApplicantKind })}
          onSelect={hapticSelect}
        />
      </fieldset>

      {isStudentInPoland ? (
        <Notice>{t.wizard.studentInPolandNote}</Notice>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t.labels.gradeBasis}</legend>
          <p className="text-xs text-[var(--text-helper)]">{t.wizard.gradeBasisHint}</p>
          <RadioGroup
            name="gradeBasis"
            value={draft.gradeBasis}
            options={(['final_certificate', 'half_year'] as const).map((basis) => ({
              value: basis,
              label: t.choices.gradeBasis[basis],
            }))}
            onChange={(value) => onChange({ gradeBasis: value as GradeBasis })}
            onSelect={hapticSelect}
          />
        </fieldset>
      )}

      <GradeInputs
        averageGrade={draft.averageGrade}
        maximumGrade={draft.maximumGrade}
        averageLabel={t.labels.averageGrade}
        maximumLabel={t.labels.maximumGrade}
        maximumHint={maximumLocked ? t.wizard.maximumGradeLockedHint : null}
        maximumReadOnly={maximumLocked}
        averageExceedsWarning={t.wizard.averageAboveMaximum}
        averageRequiredError={t.wizard.validation.averageGradeRequired}
        onAverageChange={(averageGrade) => onChange({ averageGrade })}
        onMaximumChange={(maximumGrade) => onChange({ maximumGrade })}
      />

      {isPolishSchoolBonusApplicable(draft) ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t.labels.polishSchoolLevel}</legend>
          <RadioGroup
            name="polishSchoolLevel"
            value={draft.polishSchoolLevel}
            options={(['none', 'primary', 'secondary'] as const).map((level) => ({
              value: level,
              label: t.choices.polishSchoolLevel[level],
            }))}
            onChange={(value) => onChange({ polishSchoolLevel: value as PolishSchoolLevel })}
            onSelect={hapticSelect}
          />
        </fieldset>
      ) : null}
      {draft.scholarshipTrack === 'nawa_director' && draft.rankingCountry === 'BY' && !isStudentInPoland ? (
        <Notice>{t.wizard.belarusPoloniaBonusNotice}</Notice>
      ) : null}

      {preview !== null ? <NawaScorePreview score={preview} /> : null}
    </FormSection>
  );
}
