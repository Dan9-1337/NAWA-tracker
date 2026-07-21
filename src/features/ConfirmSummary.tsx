import type { ResponseFormInput } from '../../shared/contracts';
import { isCountryCode } from '../../shared/countries';
import { useI18n } from '../i18n/context';

export function ConfirmSummary({ draft }: { draft: ResponseFormInput }) {
  const { t } = useI18n();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t.wizard.summaryTitle}</h2>
        <p className="mt-2 text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.wizard.summaryDescription}</p>
      </div>
      <dl className="space-y-3">
        <Row label={t.labels.scholarshipTrack} value={t.choices.scholarshipTrack[draft.scholarshipTrack]} />
        <Row label={t.labels.studyRoute} value={t.choices.studyRoute[draft.studyRoute]} />
        <Row
          label={t.labels.rankingCountry}
          value={isCountryCode(draft.rankingCountry) ? t.countries[draft.rankingCountry] : draft.rankingCountry}
        />
        <Row
          label={t.labels.schoolCountry}
          value={isCountryCode(draft.schoolCountry) ? t.countries[draft.schoolCountry] : draft.schoolCountry}
        />
        <Row label={t.labels.averageGrade} value={String(draft.averageGrade)} />
        <Row label={t.labels.maximumGrade} value={String(draft.maximumGrade)} />
        {draft.scholarshipTrack === 'nawa_director' && draft.polishSchoolLevel ? (
          <Row label={t.labels.polishSchoolLevel} value={t.choices.polishSchoolLevel[draft.polishSchoolLevel]} />
        ) : null}
        <Row label={t.labels.currentStatus} value={t.choices.currentStatus[draft.currentStatus]} />
        <Row label={t.labels.statusChangedAt} value={draft.statusChangedAt} />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tg-theme-subtitle-text-color)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
