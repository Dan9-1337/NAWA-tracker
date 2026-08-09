import type { GlobalBenchmark, ScholarshipTrack } from '../../../shared/contracts';
import { canShowGlobalMedian, canShowGlobalPercentile } from '../../../shared/product-rules';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { DensityStrip } from '../../components/DensityStrip';
import { TargetIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';
import { canShowScoreDistribution } from '../../lib/score-buckets';

type GlobalBenchmarkCardProps = {
  userScore: number;
  benchmark: GlobalBenchmark;
  track: ScholarshipTrack;
};

export function GlobalBenchmarkCard({ userScore, benchmark, track }: GlobalBenchmarkCardProps) {
  const { t, locale } = useI18n();
  const showMedian = canShowGlobalMedian(benchmark.sampleSize);
  const median = benchmark.median;
  const scoreDelta =
    benchmark.scoreDelta ??
    (median != null ? Math.round((userScore - median) * 10) / 10 : null);
  const showDistribution =
    showMedian &&
    benchmark.scoreBuckets != null &&
    benchmark.sampleSize != null &&
    canShowScoreDistribution(benchmark.sampleSize, benchmark.scoreBuckets);
  const showSecondaryPercentile =
    canShowGlobalPercentile({ secondary: true }) && benchmark.lowerScorePercentage != null;

  return (
    <DashboardCard aria-label={t.dashboard.globalBenchmark.title}>
      <CardHeader title={t.dashboard.globalBenchmark.title} icon={<TargetIcon size={16} />} />

      <p className="text-sm text-[var(--text-secondary)]">
        {t.dashboard.globalBenchmark.yourScore(formatScore(userScore, locale))}
      </p>

      {showMedian && median != null ? (
        <>
          <p className="text-sm text-[var(--text-primary)]">
            {t.dashboard.globalBenchmark.trackMedian(formatScore(median, locale))}
          </p>
          {scoreDelta != null ? (
            <p className="text-sm text-[var(--text-primary)]">
              {t.dashboard.globalBenchmark.delta(
                scoreDelta > 0 ? `+${formatScore(scoreDelta, locale)}` : formatScore(scoreDelta, locale),
              )}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">{t.dashboard.globalBenchmark.insufficient}</p>
      )}

      {benchmark.sampleSize != null && benchmark.representedCountryCount != null ? (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.dashboard.globalBenchmark.sampleMeta(
            String(benchmark.sampleSize),
            String(benchmark.representedCountryCount),
          )}
        </p>
      ) : null}

      {showSecondaryPercentile ? (
        <p className="text-xs text-[var(--text-helper)]">
          {t.dashboard.globalBenchmark.secondaryPercentile(
            String(Math.round(benchmark.lowerScorePercentage!)),
          )}
        </p>
      ) : null}

      {showDistribution && benchmark.scoreBuckets ? (
        <DensityStrip
          variant="mini"
          buckets={benchmark.scoreBuckets}
          track={track}
          userScore={userScore}
          medianScore={median}
          groupSize={benchmark.sampleSize ?? 0}
        />
      ) : null}
    </DashboardCard>
  );
}
