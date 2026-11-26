import { CountrySelect } from '../../components/CountrySelect';
import { FormSection } from '../../components/FormSection';
import { useI18n } from '../../i18n/context';
import type { WizardDraft } from '../../lib/draft';

type EducationStepProps = {
  draft: WizardDraft;
  onRankingCountryChange: (country: string) => void;
  onSchoolCountryChange: (country: string) => void;
  rankingCountryError?: string | null;
  schoolCountryError?: string | null;
};

export function EducationStep({
  draft,
  onRankingCountryChange,
  onSchoolCountryChange,
  rankingCountryError,
  schoolCountryError,
}: EducationStepProps) {
  const { t } = useI18n();

  return (
    <FormSection title={t.wizard.educationTitle} description={t.wizard.educationDescription}>
      <CountrySelect
        label={t.labels.rankingCountry}
        hint={t.wizard.rankingCountryHint}
        value={draft.rankingCountry}
        onChange={onRankingCountryChange}
        error={rankingCountryError}
      />
      <CountrySelect
        label={t.labels.schoolCountry}
        hint={t.wizard.schoolCountryHint}
        value={draft.schoolCountry}
        onChange={onSchoolCountryChange}
        error={schoolCountryError}
      />
    </FormSection>
  );
}
