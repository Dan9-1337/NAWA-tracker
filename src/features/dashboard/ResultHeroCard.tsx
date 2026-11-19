import type { ReactNode } from 'react';
import type { CohortScope, ScholarshipTrack, StatisticsResult } from '../../../shared/contracts';
import { MIN_COHORT_SIZE } from '../../../shared/product-rules';
import { CountryFlag } from '../../components/CountryFlag';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { DensityStrip } from '../../components/DensityStrip';
import { TargetIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatPrecise, formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { getMedianBand, formatPercentileValue } from '../../lib/stats-verdict';

type Messages = ReturnType<typeof useI18n>['t'];

const panelClass = 'rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5';

function trackBenchmarkCopy(t: Messages, userScore: number, trackWideMedian: number): string {
  const band = getMedianBand(userScore > trackWideMedian + 0.5 ? 60 : userScore < trackWideMedian - 0.5 ? 40 : 50);
  if (band === 'above') return t.dashboard.smallCountry.aboveTrackMedian;
  if (band === 'below') return t.dashboard.smallCountry.belowTrackMedian;
  return t.dashboard.smallCountry.aroundTrackMedian;
}

function medianPositionLine(
  t: Messages,
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

function ScoreBreakdown({ gradesScore, polishSchoolBonus }: { gradesScore: number | null; polishSchoolBonus: number | null }) {
  const { t, locale } = useI18n();
  const hasBonus = polishSchoolBonus != null && polishSchoolBonus > 0;
  if (gradesScore == null && !hasBonus) return null;

  const rows: Array<[string, string]> = [];
  if (gradesScore != null) rows.push([t.dashboard.score.gradesLabel, formatPrecise(gradesScore, locale)]);
  if (hasBonus) rows.push([t.dashboard.score.polishSchoolLabel, `+${formatScore(polishSchoolBonus, locale)}`]);

  return (
    <details className={panelClass}>
      <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
        {t.dashboard.hero.scoreBreakdown}
      </summary>
      <dl className="mt-2 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--text-secondary)]">{label}</dt>
            <dd className="font-medium tabular-nums text-[var(--text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

type ResultHeroCardProps = {
  gradesScore: number | null;
  polishSchoolBonus: number | null;
  /** Shows the "country sample" source badge: true when the cohort is the applicant's own country. */
  countrySample: boolean;
  children: ReactNode;
};

/** Frame of the result card: header, source badges, score breakdown; the body is the cohort-specific part. */
export function ResultHeroCard({ gradesScore, polishSchoolBonus, countrySample, children }: ResultHeroCardProps) {
  const { t } = useI18n();

  return (
    <DashboardCard tone="hero" aria-labelledby="dashboard-result-hero-title">
      <CardHeader
        titleId="dashboard-result-hero-title"
        title={t.dashboard.hero.title}
        icon={<TargetIcon size={16} />}
        badge={
          <div className="flex flex-wrap gap-1.5">
            <DataSourceBadge source="calculated" />
            {countrySample ? <DataSourceBadge source="country_sample" /> : null}
          </div>
        }
        titleClassName="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
      />
      <ScoreBreakdown gradesScore={gradesScore} polishSchoolBonus={polishSchoolBonus} />
      {children}
    </DashboardCard>
  );
}

type DetailedPositionProps = {
  data: StatisticsResult;
  userScore: number;
  rankingCountry: string;
  track: ScholarshipTrack;
  cohortLabel: string;
  cohortScope: CohortScope | null;
  /** Explains why the cohort is wider than the applicant's own country. */
  pooledNote: string | null;
};

/** Position inside a cohort that has at least ten responses: rank, percentile, distribution, neighbours. */
export function DetailedPosition({
  data,
  userScore,
  rankingCountry,
  track,
  cohortLabel,
  cohortScope,
  pooledNote,
}: DetailedPositionProps) {
  const { t, locale } = useI18n();
  const groupSize = data.groupResponseCount;
  const medianLine = medianPositionLine(t, locale, userScore, data.medianScore);
  const showStrip = canShowScoreDistribution(groupSize, data.scoreBuckets);
  const percentile =
    data.lowerScorePercentage != null && groupSize >= MIN_COHORT_SIZE
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;

  return (
    <>
      {medianLine ? <p className="text-sm font-medium text-[var(--color-positive)]">{medianLine}</p> : null}

      {data.rankPosition != null && data.rankTotal != null ? (
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {cohortScope === 'country' ? <CountryFlag code={rankingCountry} size={22} /> : null}
          <span>
            {t.dashboard.position.rankLine(String(data.rankPosition), String(data.rankTotal), cohortLabel)}
          </span>
        </p>
      ) : null}

      {pooledNote ? <p className="text-xs text-[var(--text-helper)]">{pooledNote}</p> : null}

      {percentile != null ? (
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {t.dashboard.position.percentileLine(String(percentile))}
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

      <p className="text-xs text-[var(--text-helper)]">
        {data.medianScore != null
          ? t.dashboard.hero.cohortMeta(String(groupSize), formatScore(data.medianScore, locale))
          : t.dashboard.hero.cohortSizeOnly(String(groupSize))}
      </p>
    </>
  );
}

type SmallCohortNoticeProps = {
  cohortLabel: string;
  participantCount: number;
  userScore: number;
  trackWideMedian: number | null;
};

/** What to show while no cohort has ten responses yet: how many are missing, and the track-wide median. */
export function SmallCohortNotice({ cohortLabel, participantCount, userScore, trackWideMedian }: SmallCohortNoticeProps) {
  const { t, locale } = useI18n();
  const remaining = Math.max(0, MIN_COHORT_SIZE - participantCount);

  return (
    <>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {t.dashboard.smallCountry.participants(cohortLabel, String(participantCount))}
      </p>
      {remaining > 0 ? (
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {t.dashboard.smallCountry.remaining(String(remaining))}
        </p>
      ) : null}

      {trackWideMedian != null ? (
        <div className={`space-y-1.5 ${panelClass}`}>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t.dashboard.smallCountry.benchmarkTitle}</p>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {trackBenchmarkCopy(t, userScore, trackWideMedian)}
          </p>
          <p className="text-xs text-[var(--text-helper)]">
            {t.dashboard.smallCountry.benchmarkMedian(formatScore(trackWideMedian, locale))}
          </p>
        </div>
      ) : null}
    </>
  );
}
