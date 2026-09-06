import type { ReactNode } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { getUniversityById } from '../../shared/universities';
import { CountryFlag } from '../components/CountryFlag';
import { useI18n } from '../i18n/context';
import { formatCountryLabel } from '../lib/country-label';
import { formatDate, formatGrade } from '../lib/format';
import type { WizardStep } from './ResponseWizardSteps';

type ConfirmSummaryProps = {
  draft: ResponseFormInput;
  onEditSection?: (section: WizardStep) => void;
};

export function ConfirmSummary({ draft, onEditSection }: ConfirmSummaryProps) {
  const { t, locale } = useI18n();
  const rankingCountry = formatCountryLabel(draft.rankingCountry, locale);
  const schoolCountry = formatCountryLabel(draft.schoolCountry, locale);
  const universityName =
    draft.targetUniversity != null ? (getUniversityById(draft.targetUniversity)?.name ?? draft.targetUniversity) : null;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{t.wizard.summaryTitle}</h2>
        <p className="mt-2 text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.wizard.summaryDescription}</p>
      </div>

      <SummaryBlock
        title={t.wizard.cohortTitle}
        onEdit={onEditSection ? () => onEditSection('application') : undefined}
        editLabel={t.wizard.editSection}
      >
        <Row label={t.labels.scholarshipTrack} value={t.choices.scholarshipTrack[draft.scholarshipTrack]} />
        <Row
          label={t.labels.rankingCountry}
          value={rankingCountry}
          leading={<CountryFlag code={draft.rankingCountry} size={18} />}
        />
        <Row
          label={t.labels.schoolCountry}
          value={schoolCountry}
          leading={<CountryFlag code={draft.schoolCountry} size={18} />}
        />
        <Row label={t.labels.studyRoute} value={t.choices.studyRoute[draft.studyRoute]} />
        {universityName ? <Row label={t.labels.targetUniversity} value={universityName} /> : null}
      </SummaryBlock>

      <SummaryBlock
        title={t.wizard.dataTitle}
        onEdit={onEditSection ? () => onEditSection('grades') : undefined}
        editLabel={t.wizard.editSection}
      >
        <Row
          label={t.labels.averageGrade}
          value={`${formatGrade(draft.averageGrade, locale)} / ${formatGrade(draft.maximumGrade, locale)}`}
        />
        {draft.scholarshipTrack === 'nawa_director' &&
        draft.polishSchoolLevel &&
        draft.polishSchoolLevel !== 'none' &&
        draft.rankingCountry !== 'BY' ? (
          <Row label={t.labels.polishSchoolLevel} value={t.choices.polishSchoolLevel[draft.polishSchoolLevel]} />
        ) : null}
      </SummaryBlock>

      <SummaryBlock title={t.labels.currentStatus}>
        <Row label={t.labels.currentStatus} value={t.choices.currentStatus[draft.currentStatus]} />
        <Row label={t.labels.statusChangedAt} value={formatDate(draft.statusChangedAt, locale)} />
      </SummaryBlock>
    </section>
  );
}

function SummaryBlock({
  title,
  children,
  onEdit,
  editLabel,
}: {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onEdit ? (
          <button type="button" className="min-h-11 text-sm font-medium text-[var(--tg-theme-link-color)]" onClick={onEdit}>
            {editLabel}
          </button>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, leading }: { label: string; value: string; leading?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3">
      <dt className="text-xs font-medium text-[var(--tg-theme-subtitle-text-color)]">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
        {leading}
        <span>{value}</span>
      </dd>
    </div>
  );
}
