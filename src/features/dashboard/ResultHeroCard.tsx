import type { ReactNode } from 'react';
import type { CohortScope, ScholarshipTrack, StatisticsResult } from '../../../shared/contracts';
import { MIN_COHORT_SIZE } from '../../../shared/product-rules';
import { CountryFlag } from '../../components/CountryFlag';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { DensityStrip } from '../../components/DensityStrip';
import { TargetIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatPrecise, formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { getMedianBand, formatPercentileValue } from '../../lib/stats-verdict';
import { ThresholdChip } from '../score/ThresholdChip';

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

type ResultCardProps = {
  /** The saved orientation score; the what-if never changes it. */
  score: number;
  seasonLabel: string;
  /** The cohort body: detailed position, small-cohort notice or a statistics status line. */
  children?: ReactNode;
  /** The unofficial-sample caption; shown only when the body is about a cohort. */
  caption?: string | null;
};

/** The saved result and its position in the cohort, in one card at the top of the dashboard. */
export function ResultCard({ score, seasonLabel, children, caption }: ResultCardProps) {
  const { t, locale } = useI18n();

  return (
    <DashboardCard tone="hero" aria-labelledby="dashboard-result-hero-title">
      <CardHeader
        titleId="dashboard-result-hero-title"
        title={t.dashboard.hero.title}
        icon={<TargetIcon size={16} />}
        badge={<span className="text-xs text-[var(--text-secondary)]">{seasonLabel}</span>}
        titleClassName="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
      />

      <div className="flex items-baseline gap-2">
        <span
          className="font-display text-[clamp(56px,16vw,64px)] font-semibold leading-[0.95] tracking-[-0.02em] tabular-nums"
          data-testid="saved-score-value"
        >
          {formatPrecise(score, locale)}
        </span>
        <span className="font-display text-[22px] font-medium text-[var(--text-secondary)]">
          {t.scoreScreen.scaleMax}
        </span>
      </div>

      <ThresholdChip score={score} testId="saved-score-chip" />

      {children}

      {caption ? (
        <p className="text-[11px] text-[var(--text-helper)]" data-testid="result-card-caption">
          {caption}
        </p>
      ) : null}
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
      {data.rankPosition != null && data.rankTotal != null ? (
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {cohortScope === 'country' ? <CountryFlag code={rankingCountry} size={22} /> : null}
          <span>
            {t.dashboard.position.rankLine(String(data.rankPosition), String(data.rankTotal), cohortLabel)}
          </span>
        </p>
      ) : null}

      {percentile != null ? (
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {t.dashboard.position.percentileLine(String(percentile))}
        </p>
      ) : null}

      {medianLine ? <p className="text-sm font-medium text-[var(--color-positive)]">{medianLine}</p> : null}

      {pooledNote ? <p className="text-xs text-[var(--text-helper)]">{pooledNote}</p> : null}

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
