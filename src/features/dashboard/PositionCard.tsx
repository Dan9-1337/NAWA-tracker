import type { StatisticsResult } from '../../../shared/contracts';
import { CountryFlag } from '../../components/CountryFlag';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { formatPercentileValue, MIN_DETAILED_COHORT } from '../../lib/stats-verdict';

type PositionCardProps = {
  data: StatisticsResult;
  rankingCountry: string;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

export function PositionCard({ data, rankingCountry }: PositionCardProps) {
  const { t, locale } = useI18n();
  const groupSize = data.groupResponseCount;
  const countryLabel = formatCountryLabel(rankingCountry, locale);
  const percentileValue =
    data.lowerScorePercentage != null && groupSize >= MIN_DETAILED_COHORT
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;

  return (
    <section className={cardClass} aria-labelledby="dashboard-position-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-position-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.position.title}
        </h2>
        <DataSourceBadge source="estimate" />
      </div>

      {data.rankPosition != null && data.rankTotal != null ? (
        <p className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          <CountryFlag code={rankingCountry} size={24} />
          <span>
            {t.dashboard.position.rankLine(
              String(data.rankPosition),
              String(data.rankTotal),
              countryLabel,
            )}
          </span>
        </p>
      ) : null}

      {percentileValue != null ? (
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {t.dashboard.position.percentileLine(String(percentileValue))}
        </p>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.position.sampleDisclaimer}</p>
    </section>
  );
}
