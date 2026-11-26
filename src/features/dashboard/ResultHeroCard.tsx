import type { ReactNode } from 'react';
import type { OrientationMarkResult, ScholarshipTrack, StatisticsResult } from '../../../shared/contracts';
import { nawaOrientationThreshold } from '../../../shared/nawa-score';
import { CountryFlag } from '../../components/CountryFlag';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { DensityStrip } from '../../components/DensityStrip';
import { TargetIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatPrecise, formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { formatPercentileValue } from '../../lib/stats-verdict';
import { ThresholdChip } from '../score/ThresholdChip';

type Messages = ReturnType<typeof useI18n>['t'];

function medianPositionLine(
  t: Messages,
  locale: ReturnType<typeof useI18n>['locale'],
  userScore: number,
  medianScore: number | null | undefined,
): { text: string; below: boolean } | null {
  if (medianScore == null) return null;
  const delta = Math.round((userScore - medianScore) * 10) / 10;
  if (Math.abs(delta) < 0.1) return { text: t.dashboard.hero.aroundMedian, below: false };
  if (delta > 0) return { text: t.dashboard.hero.aboveMedianBy(formatScore(delta, locale)), below: false };
  return { text: t.dashboard.hero.belowMedianBy(formatScore(Math.abs(delta), locale)), below: true };
}

type ResultCardProps = {
  /** The saved orientation score; the what-if never changes it. */
  score: number;
  seasonLabel: string;
  /** The cohort body: the detailed position, the "only you" line or a statistics status line. */
  children?: ReactNode;
  /** The unofficial-sample caption; shown only when the body is about a cohort. */
  caption?: string | null;
};

/** The saved result and its position in the country cohort, in one card at the top of the dashboard. */
export function ResultCard({ score, seasonLabel, children, caption }: ResultCardProps) {
  const { t, locale } = useI18n();

  return (
    <DashboardCard tone="hero" aria-labelledby="dashboard-result-hero-title">
      <CardHeader
        titleId="dashboard-result-hero-title"
        title={t.dashboard.hero.title}
        icon={<TargetIcon size={16} />}
        badge={<span className="text-sm text-[var(--text-secondary)]">{seasonLabel}</span>}
        titleClassName="text-sm font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
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
        <p className="text-sm text-[var(--text-helper)]" data-testid="result-card-caption">
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
  /** The country mark (ADR 0017), when the caller has one. */
  orientation?: OrientationMarkResult | null;
  /** Opens the scholarship-holder flow from the `n = 0` invitation. */
  onOrientationInvite?: () => void;
};

/**
 * The `ориентир 2026` line: under the country position, and equally on the "only you" card (ADR 0017). With no
 * counted holder it says so, and invites a holder to answer only when the survey scores at least 60.
 */
export function OrientationMarkLine({
  orientation,
  cohortLabel,
  userScore,
  onOrientationInvite,
}: {
  orientation?: OrientationMarkResult | null;
  cohortLabel: string;
  userScore: number;
  onOrientationInvite?: () => void;
}) {
  const { t } = useI18n();

  if (!orientation) return null;

  if (orientation.mark == null) {
    const missing = t.dashboard.hero.orientationMarkMissing(cohortLabel);
    const canInvite = userScore >= nawaOrientationThreshold && onOrientationInvite != null;

    if (canInvite) {
      return (
        <button
          type="button"
          data-testid="orientation-mark-line"
          className="text-left text-sm leading-6 font-medium text-[var(--text-secondary)] underline decoration-dotted underline-offset-2"
          onClick={onOrientationInvite}
        >
          {missing} {t.dashboard.hero.orientationMarkInvitation}
        </button>
      );
    }

    return (
      <p className="text-sm leading-6 text-[var(--text-secondary)]" data-testid="orientation-mark-line">
        {missing}
      </p>
    );
  }

  return (
    <p className="text-sm leading-6 text-[var(--text-secondary)]" data-testid="orientation-mark-line">
      {t.dashboard.hero.orientationMarkLine(cohortLabel, String(orientation.n))}
    </p>
  );
}

/** Position inside the country cohort: rank, percentile, median, distribution and the number of responses. */
export function DetailedPosition({
  data,
  userScore,
  rankingCountry,
  track,
  cohortLabel,
  orientation,
  onOrientationInvite,
}: DetailedPositionProps) {
  const { t, locale } = useI18n();
  const groupSize = data.groupResponseCount;
  const medianLine = medianPositionLine(t, locale, userScore, data.medianScore);
  const showStrip = canShowScoreDistribution(data.scoreBuckets);
  const percentile =
    data.lowerScorePercentage != null
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;

  return (
    <>
      {data.rankPosition != null && data.rankTotal != null ? (
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          <CountryFlag code={rankingCountry} size={22} />
          <span>
            {t.dashboard.position.rankLine(String(data.rankPosition), String(data.rankTotal), cohortLabel)}
          </span>
        </p>
      ) : null}

      <OrientationMarkLine
        orientation={orientation}
        cohortLabel={cohortLabel}
        userScore={userScore}
        onOrientationInvite={onOrientationInvite}
      />

      {percentile != null ? (
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {t.dashboard.position.percentileLine(String(percentile))}
        </p>
      ) : null}

      {medianLine ? (
        <p
          className={`text-sm font-medium ${
            medianLine.below ? 'text-[var(--color-warning)]' : 'text-[var(--color-positive)]'
          }`}
        >
          {medianLine.text}
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

      <p className="text-sm text-[var(--text-helper)]">
        {data.medianScore != null
          ? t.dashboard.hero.cohortMeta(String(groupSize), formatScore(data.medianScore, locale))
          : t.dashboard.hero.cohortSizeOnly(String(groupSize))}
      </p>
    </>
  );
}

type OnlyYouNoticeProps = {
  /** The applicant's country of citizenship, already formatted for the active locale. */
  cohortLabel: string;
  intakeYear: number;
  /** The saved orientation score, for the "n = 0" invitation threshold. */
  userScore: number;
  /** The country mark (ADR 0017), shown on this card too. */
  orientation?: OrientationMarkResult | null;
  onOrientationInvite?: () => void;
};

/**
 * The card body while the country has none or one valid survey: one line and nothing else — no percentile,
 * no median, no distribution and no what-if band (ADR 0015). The country mark still appears below it.
 */
export function OnlyYouNotice({
  cohortLabel,
  intakeYear,
  userScore,
  orientation,
  onOrientationInvite,
}: OnlyYouNoticeProps) {
  const { t } = useI18n();

  return (
    <>
      <p className="text-sm leading-6 text-[var(--text-secondary)]" data-testid="only-you-notice">
        {t.dashboard.hero.onlyYou(cohortLabel, String(intakeYear))}
      </p>
      <OrientationMarkLine
        orientation={orientation}
        cohortLabel={cohortLabel}
        userScore={userScore}
        onOrientationInvite={onOrientationInvite}
      />
    </>
  );
}
