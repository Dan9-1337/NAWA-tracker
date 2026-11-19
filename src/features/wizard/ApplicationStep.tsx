import type { StudyRoute } from '../../../shared/contracts';
import { FormSection } from '../../components/FormSection';
import { RadioGroup } from '../../components/RadioOption';
import { StudyFieldSelect } from '../../components/StudyFieldSelect';
import { UniversitySelect } from '../../components/UniversitySelect';
import { requiresPhilologyNote } from '../../../shared/study-fields';
import { useI18n } from '../../i18n/context';
import type { WizardDraft } from '../../lib/draft';
import { getTelegramWebApp } from '../../lib/telegram';

type ApplicationStepProps = {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
  universityError?: string | null;
  studyFieldError?: string | null;
};

export function ApplicationStep({ draft, onChange, universityError, studyFieldError }: ApplicationStepProps) {
  const { t } = useI18n();

  return (
    <FormSection title={t.wizard.applicationTitle} description={t.wizard.applicationDescription}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.labels.studyRoute}</legend>
        <RadioGroup
          name="studyRoute"
          value={draft.studyRoute}
          options={Object.entries(t.choices.studyRoute).map(([value, label]) => ({
            value: value as StudyRoute,
            label,
          }))}
          onChange={(value) => onChange({ studyRoute: value as StudyRoute })}
          onSelect={() => getTelegramWebApp()?.haptic.selection()}
        />
      </fieldset>
      <StudyFieldSelect
        id="study-field"
        label={t.labels.studyField}
        hint={t.wizard.studyFieldHint}
        value={draft.studyField}
        onChange={(studyField) => onChange({ studyField })}
        error={studyFieldError}
      />
      {requiresPhilologyNote(draft.studyField) ? (
        <p
          className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
          role="status"
        >
          {t.wizard.philologyNote}
        </p>
      ) : null}
      <UniversitySelect
        id="target-university"
        label={t.labels.targetUniversity}
        hint={t.wizard.targetUniversityHint}
        scholarshipTrack={draft.scholarshipTrack}
        value={draft.targetUniversity}
        onChange={(targetUniversity) => onChange({ targetUniversity })}
        error={universityError}
      />
    </FormSection>
  );
}
