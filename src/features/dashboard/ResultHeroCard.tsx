import type { ScholarshipTrack, StatisticsResult } from '../../../shared/contracts';
import { CountryFlag } from '../../components/CountryFlag';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { DensityStrip } from '../../components/DensityStrip';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { getMedianBand, MIN_DETAILED_COHORT, formatPercentileValue } from '../../lib/stats-verdict';

export type ResultHeroVariant = 'detailed' | 'small_country';

type ResultHeroCardProps = {
  variant: ResultHeroVariant;
  total: number;
  gradesScore: number | null;
  polishSchoolBonus: number | null;
  rankingCountry: string;
  userScore: number;
  data?: StatisticsResult;
  track?: ScholarshipTrack;
  countryCount?: number;
  trackWideMedian?: number | null;
};

const cardClass =
  'rounded-2xl border border-[color-mix(in_srgb,var(--color-accent)_28%,var(--section-divider-color))] bg-[var(--tg-theme-section-bg-color)] px-3.5 py-3 space-y-3';

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

function medianPositionLine(
  t: ReturnType<typeof useI18n>['t'],
  locale: ReturnType<typeof useI18n>['locale'],
  userScore: number,
  medianScore: number | null | undefined,
): string | null {
  if (medianScore == null) return null;
  const delta = Math.round((userScore - medianScore) * 10) / 10;
  if (Math.abs(delta) < 0.1) return t.dashboard.hero.aroundMedian;
  if (delta > 0) return t.dashboard.hero.aboveMedianBy(formatScore(delta, locale));
  return t.dashboard.hero.belowMedianBy(formatScore(Math.abs(delta), locale));
}

export function ResultHeroCard({
  variant,
  total,
  gradesScore,
  polishSchoolBonus,
  rankingCountry,
  userScore,
  data,
  track = 'nawa_director',
  countryCount = 0,
  trackWideMedian = null,
}: ResultHeroCardProps) {
  const { t, locale } = useI18n();
  const countryLabel = formatCountryLabel(rankingCountry, locale);
  const showBreakdown = gradesScore != null || (polishSchoolBonus != null && polishSchoolBonus > 0);
  const groupSize = data?.groupResponseCount ?? 0;
  const remaining = Math.max(0, MIN_DETAILED_COHORT - countryCount);
  const showStrip =
    variant === 'detailed' &&
    data != null &&
    canShowScoreDistribution(groupSize, data.scoreBuckets);

  const percentileValue =
    variant === 'detailed' &&
    data?.lowerScorePercentage != null &&
    groupSize >= MIN_DETAILED_COHORT
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;

  const medianLine =
    variant === 'detailed' ? medianPositionLine(t, locale, userScore, data?.medianScore) : null;

  return (
    <section className={cardClass} aria-labelledby="dashboard-result-hero-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-result-hero-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.hero.title}
        </h2>
        <DataSourceBadge source="estimate" />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
          {formatScore(total, locale)}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{t.dashboard.score.unit}</span>
      </div>

      {showBreakdown ? (
        <dl className="space-y-1 text-sm">
          {gradesScore != null ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--text-secondary)]">{t.dashboard.score.gradesLabel}</dt>
              <dd className="font-medium tabular-nums text-[var(--text-primary)]">
                {formatScore(gradesScore, locale)}
              </dd>
            </div>
          ) : null}
          {polishSchoolBonus != null && polishSchoolBonus > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--text-secondary)]">{t.dashboard.score.polishSchoolLabel}</dt>
              <dd className="font-medium tabular-nums text-[var(--text-primary)]">
                +{formatScore(polishSchoolBonus, locale)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {variant === 'detailed' && data ? (
        <>
          {medianLine ? (
            <p className="text-sm font-medium text-[var(--color-positive)]">{medianLine}</p>
          ) : null}

          {data.rankPosition != null && data.rankTotal != null ? (
            <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              <CountryFlag code={rankingCountry} size={22} />
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

          {showStrip && data.scoreBuckets ? (
            <DensityStrip
              variant="mini"
              buckets={data.scoreBuckets}
              track={track}
              userScore={userScore}
              medianScore={data.medianScore}
              groupSize={groupSize}
            />
          ) : null}

          {data.medianScore != null ? (
            <p className="text-xs text-[var(--text-helper)]">
              {t.dashboard.hero.cohortMeta(
                String(groupSize),
                formatScore(data.medianScore, locale),
              )}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-helper)]">
              {t.dashboard.hero.cohortSizeOnly(String(groupSize))}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {t.dashboard.smallCountry.participants(countryLabel, String(countryCount))}
          </p>
          {remaining > 0 ? (
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t.dashboard.smallCountry.remaining(String(remaining))}
            </p>
          ) : null}

          {trackWideMedian != null ? (
            <div className="space-y-1.5 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {t.dashboard.smallCountry.benchmarkTitle}
              </p>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                {trackBenchmarkCopy(t, userScore, trackWideMedian)}
              </p>
              <p className="text-xs text-[var(--text-helper)]">
                {t.dashboard.smallCountry.benchmarkMedian(formatScore(trackWideMedian, locale))}
              </p>
            </div>
          ) : null}
        </>
      )}

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.position.sampleDisclaimer}</p>
      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.score.disclaimer}</p>
    </section>
  );
}
