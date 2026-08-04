import type { CountryContextStats, GlobalBenchmark } from '../../../shared/contracts';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { formatScore } from '../../lib/format';

type CountryContextCardProps = {
  rankingCountry: string;
  countryContext: CountryContextStats;
  globalBenchmark: GlobalBenchmark;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2.5';

function formatDelta(delta: number, locale: string): string {
  const formatted = formatScore(Math.abs(delta), locale);
  if (delta > 0) return `+${formatted}`;
  if (delta < 0) return `−${formatted}`;
  return formatted;
}

export function CountryContextCard({
  rankingCountry,
  countryContext,
  globalBenchmark,
}: CountryContextCardProps) {
  const { t, locale } = useI18n();
  const countryLabel = formatCountryLabel(rankingCountry, locale);
  const globalMedian = globalBenchmark.median;
  const countryMedian = countryContext.countryMedian;
  const medianDelta = countryContext.medianDeltaVsGlobal;

  const insights: Array<{ key: string; text: string }> = [];

  if (countryContext.distributionStable === false) {
    insights.push({
      key: 'unstable',
      text: t.dashboard.countryContext.unstableDistribution,
    });
  } else if (
    countryContext.countrySampleSize >= 10 &&
    (countryContext.distributionStable === true ||
      (globalBenchmark.detailedCountriesCount != null &&
        globalBenchmark.detailedCountriesCount > 0))
  ) {
    insights.push({
      key: 'detailed',
      text: t.dashboard.countryContext.detailedCohortReached,
    });
  }

  if (countryContext.nearbyScoreCount != null && countryContext.nearbyScoreCount > 0) {
    insights.push({
      key: 'nearby',
      text: t.dashboard.countryContext.nearbyCount(String(countryContext.nearbyScoreCount)),
    });
  }

  return (
    <section className={cardClass} aria-label={t.dashboard.countryContext.title}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {t.dashboard.countryContext.title}
        </h2>
        <DataSourceBadge source="country_sample" />
      </div>

      {countryMedian != null && globalMedian != null ? (
        <>
          <p className="text-sm text-[var(--text-primary)]">
            {t.dashboard.countryContext.countryMedian(
              countryLabel,
              formatScore(countryMedian, locale),
            )}
          </p>
          <p className="text-sm text-[var(--text-primary)]">
            {t.dashboard.countryContext.globalMedian(formatScore(globalMedian, locale))}
          </p>
          {medianDelta != null ? (
            <p className="text-sm text-[var(--text-primary)]">
              {t.dashboard.countryContext.medianDelta(formatDelta(medianDelta, locale))}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.dashboard.countryContext.countryCountOnly(
            countryLabel,
            String(countryContext.countrySampleSize),
          )}
        </p>
      )}

      {globalBenchmark.sampleSize != null ? (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.dashboard.countryContext.sampleMeta(
            countryLabel,
            String(countryContext.countrySampleSize),
            String(globalBenchmark.sampleSize),
          )}
        </p>
      ) : null}

      {insights.length > 0 ? (
        <ul className="space-y-1 text-xs leading-5 text-[var(--text-helper)]">
          {insights.map((insight) => (
            <li key={insight.key}>{insight.text}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">
        {t.dashboard.countryContext.disclaimer}
      </p>
    </section>
  );
}
