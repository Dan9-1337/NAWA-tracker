import type { ResponseFormInput } from '../../../shared/contracts';
import { ChevronIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { formatGrade, formatPrecise } from '../../lib/format';
import { scoreForAverage } from '../../lib/score-tape';
import type { WizardStep } from '../ResponseWizardSteps';

type ProfileDetailsProps = {
  current: ResponseFormInput;
  onEditSection: (section: WizardStep) => void;
};

type ProfileRowProps = {
  label: string;
  value: string;
  onClick: () => void;
  last?: boolean;
};

function ProfileRow({ label, value, onClick, last = false }: ProfileRowProps) {
  return (
    <button
      type="button"
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left active:opacity-70${
        last ? '' : ' border-b border-[var(--section-divider-color)]'
      }`}
      onClick={onClick}
    >
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="flex items-center gap-1.5 text-base font-semibold">
        {value}
        <span className="text-[var(--text-secondary)]">
          <ChevronIcon />
        </span>
      </span>
    </button>
  );
}

/** The saved profile rows and the formula, both computed from the saved answers only. */
export function ProfileDetails({ current, onEditSection }: ProfileDetailsProps) {
  const { t, locale } = useI18n();
  const copy = t.scoreScreen;
  const maximumGrade = current.maximumGrade;
  const profile = {
    maximumGrade,
    polishSchoolLevel: current.polishSchoolLevel ?? 'none',
    rankingCountry: current.rankingCountry,
  } as const;

  const score = scoreForAverage(current.averageGrade, profile);
  const bonus = score - scoreForAverage(current.averageGrade, { ...profile, polishSchoolLevel: 'none' });
  const formula = `${formatPrecise(current.averageGrade, locale)} × 90 ÷ ${formatGrade(maximumGrade, locale)}${
    bonus > 0 ? ` + ${formatGrade(bonus, locale)}` : ''
  } = ${formatPrecise(score, locale)}`;

  return (
    <section className="space-y-0" data-testid="profile-block">
      <div className="overflow-hidden rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)]">
        <ProfileRow
          label={copy.rows.citizenship}
          value={formatCountryLabel(current.rankingCountry, locale)}
          onClick={() => onEditSection('education')}
        />
        <ProfileRow
          label={copy.rows.average}
          value={formatGrade(current.averageGrade, locale)}
          onClick={() => onEditSection('grades')}
        />
        <ProfileRow
          label={copy.rows.scale}
          value={copy.scaleValue(formatGrade(maximumGrade, locale))}
          onClick={() => onEditSection('grades')}
        />
        <ProfileRow
          label={copy.rows.polish}
          value={copy.polishValue[current.polishSchoolLevel ?? 'none']}
          onClick={() => onEditSection('grades')}
          last
        />
      </div>

      <p className="mt-2.5 px-1 text-[13px] tabular-nums text-[var(--text-secondary)]">
        {formula}. {copy.formulaDisclaimer}
      </p>
    </section>
  );
}
