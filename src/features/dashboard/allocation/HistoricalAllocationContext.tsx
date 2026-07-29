import { DataSourceBadge } from '../../../components/DataSourceBadge';
import { useI18n } from '../../../i18n/context';
import { formatCountryLabel } from '../../../lib/country-label';

export type HistoricalSeatRecordView = {
  year: number;
  scope: 'country' | 'country_group' | 'programme_total';
  seats: number;
  sourceLabel: string;
  sourceNote: string;
  country?: string;
  groupMembers?: string[];
};

type HistoricalAllocationContextProps = {
  records: HistoricalSeatRecordView[];
  rankingCountry?: string;
};

const cardClass =
  'rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] px-3.5 py-3 space-y-2';

export function HistoricalAllocationContext({
  records,
  rankingCountry,
}: HistoricalAllocationContextProps) {
  const { t, locale } = useI18n();

  if (records.length === 0) return null;

  const countryLabel = rankingCountry ? formatCountryLabel(rankingCountry, locale) : null;

  return (
    <section className={cardClass} aria-labelledby="dashboard-historical-allocation-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-historical-allocation-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.allocation.historicalTitle}
        </h2>
        <DataSourceBadge source="historical" />
      </div>

      <ul className="space-y-3">
        {records.map((record) => (
          <li key={`${record.year}-${record.scope}-${record.sourceLabel}`} className="space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {record.scope === 'country_group'
                ? t.dashboard.allocation.historicalGroupLine(String(record.year), String(record.seats))
                : record.scope === 'programme_total'
                  ? t.dashboard.allocation.historicalProgrammeLine(String(record.year), String(record.seats))
                  : t.dashboard.allocation.historicalCountryLine(
                      countryLabel ?? record.country ?? '',
                      String(record.year),
                      String(record.seats),
                    )}
            </p>
            <p className="text-xs text-[var(--text-helper)]">{record.sourceLabel}</p>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{record.sourceNote}</p>
            {record.scope === 'country_group' && record.groupMembers && record.groupMembers.length > 0 ? (
              <p className="text-xs leading-5 text-[var(--text-helper)]">
                {t.dashboard.allocation.historicalGroupMembers(
                  record.groupMembers
                    .map((code) => formatCountryLabel(code, locale))
                    .filter(Boolean)
                    .join(', '),
                )}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.allocation.historicalDisclaimer}</p>
    </section>
  );
}
