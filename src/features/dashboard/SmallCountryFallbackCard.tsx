import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { formatScore } from '../../lib/format';
import { getMedianBand, MIN_DETAILED_COHORT } from '../../lib/stats-verdict';
import { ScoreCard } from './ScoreCard';

type SmallCountryFallbackCardProps = {
  rankingCountry: string;
  countryCount: number;
  total: number;
  gradesScore: number | null;
  polishSchoolBonus: number | null;
  trackWideMedian: number | null;
  userScore: number;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-3';

function trackBenchmarkCopy(
  t: ReturnType<typeof useI18n>['t'],
  userScore: number,
  trackWideMedian: number,
): string {
  const band = getMedianBand(
    userScore > trackWideMedian + 0.5 ? 60 : userScore < trackWideMedian - 0.5 ? 40 : 50,
  );
  if (band === 'above') return t.dashboard.smallCountry.aboveTrackMedian;
  if (band === 'below') return t.dashboard.smallCountry.belowTrackMedian;
  return t.dashboard.smallCountry.aroundTrackMedian;
}

export function SmallCountryFallbackCard({
  rankingCountry,
  countryCount,
  total,
  gradesScore,
  polishSchoolBonus,
  trackWideMedian,
  userScore,
}: SmallCountryFallbackCardProps) {
  const { t, locale } = useI18n();
  const countryLabel = formatCountryLabel(rankingCountry, locale);
  const remaining = Math.max(0, MIN_DETAILED_COHORT - countryCount);

  return (
    <section className="space-y-3" aria-labelledby="dashboard-small-country-title">
      <div className={cardClass}>
        <h2
          id="dashboard-small-country-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.smallCountry.title}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {t.dashboard.smallCountry.participants(countryLabel, String(countryCount))}
        </p>
        {remaining > 0 ? (
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t.dashboard.smallCountry.remaining(String(remaining))}
          </p>
        ) : null}
      </div>

      <ScoreCard total={total} gradesScore={gradesScore} polishSchoolBonus={polishSchoolBonus} />

      {trackWideMedian != null ? (
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {t.dashboard.smallCountry.benchmarkTitle}
            </p>
            <DataSourceBadge source="estimate" />
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {trackBenchmarkCopy(t, userScore, trackWideMedian)}
          </p>
          <p className="text-xs text-[var(--text-helper)]">
            {t.dashboard.smallCountry.benchmarkMedian(formatScore(trackWideMedian, locale))}
          </p>
          <p className="text-xs leading-5 text-[var(--text-helper)]">
            {t.dashboard.smallCountry.benchmarkDisclaimer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
