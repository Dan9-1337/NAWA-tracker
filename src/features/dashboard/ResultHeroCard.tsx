import type { ScholarshipTrack, StatisticsResult } from '../../../shared/contracts';
import { CountryFlag } from '../../components/CountryFlag';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { DensityStrip } from '../../components/DensityStrip';
import { TargetIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { computeCompetitionNeighbourhood } from '../../lib/competition-neighbourhood';
import { formatCountryLabel } from '../../lib/country-label';
import { formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import type { StatsSnapshot } from '../../lib/stats-snapshot';
import { getMedianBand, MIN_DETAILED_COHORT, formatPercentileValue } from '../../lib/stats-verdict';
import { CompetitionNeighbourhoodDetails } from './CompetitionNeighbourhoodDetails';

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
  previousSnapshot?: StatsSnapshot | null;
};

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
  previousSnapshot = null,
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
  const neighbourhood =
    variant === 'detailed' && data
      ? computeCompetitionNeighbourhood(userScore, data.cohortScores, data.sameCountryCount)
      : null;

  const percentileValue =
    variant === 'detailed' &&
    data?.lowerScorePercentage != null &&
    groupSize >= MIN_DETAILED_COHORT
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;

  const medianLine =
    variant === 'detailed' ? medianPositionLine(t, locale, userScore, data?.medianScore) : null;

  const rankDeltaLine =
    variant === 'detailed' &&
    data?.rankPosition != null &&
    previousSnapshot?.rankPosition != null &&
    previousSnapshot.rankPosition !== data.rankPosition
      ? t.dashboard.hero.rankDelta(
          String(previousSnapshot.rankPosition),
          String(data.rankPosition),
        )
      : null;

  return (
    <DashboardCard tone="hero" aria-labelledby="dashboard-result-hero-title">
      <CardHeader
        titleId="dashboard-result-hero-title"
        title={t.dashboard.hero.title}
        icon={<TargetIcon size={16} />}
        badge={
          <div className="flex flex-wrap gap-1.5">
            <DataSourceBadge source="calculated" />
            {variant === 'detailed' ? <DataSourceBadge source="country_sample" /> : null}
          </div>
        }
        titleClassName="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
      />

      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
          {formatScore(total, locale)}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{t.dashboard.score.unit}</span>
      </div>

      {showBreakdown ? (
        <details className="rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
            {t.dashboard.hero.scoreBreakdown}
          </summary>
          <dl className="mt-2 space-y-1 text-sm">
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
        </details>
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

          {rankDeltaLine ? (
            <p className="text-xs font-medium text-[var(--text-secondary)]">{rankDeltaLine}</p>
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

          {neighbourhood ? (
            <details className="rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                {t.dashboard.competitionNeighbourhood.title}
              </summary>
              <div className="mt-2">
                <CompetitionNeighbourhoodDetails neighbourhood={neighbourhood} />
              </div>
            </details>
          ) : null}
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
    </DashboardCard>
  );
}
