import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ApplicantKind, GradeBasis, PolishSchoolLevel } from '../../../shared/contracts';
import { polishSchoolBonus } from '../../../shared/nawa-score';
import { FormSection } from '../../components/FormSection';
import { GradeInputs } from '../../components/GradeInputs';
import { NawaScorePreview } from '../../components/NawaScorePreview';
import { RadioGroup } from '../../components/RadioOption';
import { useI18n } from '../../i18n/context';
import type { WizardDraft } from '../../lib/draft';
import {
  isMaximumGradeLocked,
  isPolishSchoolBonusApplicable,
  lowGradesScore,
  previewOrientationScore,
} from '../../lib/draft-rules';
import { formatGrade } from '../../lib/format';
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

/**
 * Where the create flow hears that a warning became visible (product events). The default does nothing, so the edit
 * wizard, which renders the same step without a provider, records nothing.
 */
export type GradesStepVisibility = {
  onAverageAboveMaximumShown: () => void;
  onLowScoreWarningShown: () => void;
};

const noop = () => undefined;

export const GradesStepVisibilityContext = createContext<GradesStepVisibility>({
  onAverageAboveMaximumShown: noop,
  onLowScoreWarningShown: noop,
});

type GradesStepProps = {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
};

export function GradesStep({ draft, onChange }: GradesStepProps) {
  const { t, locale } = useI18n();
  // The average counts as left once its field has been blurred, or when it was already filled in (a restored draft, edit).
  const [averageLeft, setAverageLeft] = useState(draft.averageGrade != null);
  const isStudentInPoland = draft.applicantKind === 'student_in_poland';
  const maximumLocked = isMaximumGradeLocked(draft);
  const preview = previewOrientationScore(draft);
  const lowScore = averageLeft ? lowGradesScore(draft) : null;
  // Same condition as the "average above the maximum" error in `GradeInputs`.
  const averageAboveMaximum =
    draft.averageGrade != null &&
    draft.maximumGrade != null &&
    draft.maximumGrade > 0 &&
    draft.averageGrade > draft.maximumGrade;
  const { onAverageAboveMaximumShown, onLowScoreWarningShown } = useContext(GradesStepVisibilityContext);
  const lowScoreShown = lowScore != null;

  useEffect(() => {
    if (averageAboveMaximum) onAverageAboveMaximumShown();
  }, [averageAboveMaximum, onAverageAboveMaximumShown]);

  useEffect(() => {
    if (lowScoreShown) onLowScoreWarningShown();
  }, [lowScoreShown, onLowScoreWarningShown]);

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
          <p className="text-sm text-[var(--text-helper)]">{t.wizard.gradeBasisHint}</p>
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

      <div
        className="space-y-4"
        onBlur={(event) => {
          if ((event.target as HTMLElement).getAttribute('aria-label') === t.labels.averageGrade) setAverageLeft(true);
        }}
      >
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
        {lowScore ? (
          <Notice>{t.wizard.averageBelowThreshold(formatGrade(lowScore.maximum, locale), formatGrade(lowScore.score, locale))}</Notice>
        ) : null}
      </div>

      {isPolishSchoolBonusApplicable(draft) ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t.labels.polishSchoolLevel}</legend>
          <RadioGroup
            name="polishSchoolLevel"
            value={draft.polishSchoolLevel}
            options={(['none', 'primary', 'secondary'] as const).map((level) => ({
              value: level,
              label: t.choices.polishSchoolLevel[level],
              badge: level === 'none' ? undefined : t.choices.polishSchoolBonusBadge(String(polishSchoolBonus[level])),
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
