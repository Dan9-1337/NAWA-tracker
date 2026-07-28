import type { StatisticsResult } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import { formatScore } from '../lib/format';
import { explainPositionChange, hasGrowthActivity, hasPositionChanged } from '../lib/position-change';
import type { StatsSnapshot } from '../lib/stats-snapshot';
import { formatPercentileValue } from '../lib/stats-verdict';

type WeeklyActivityProps = {
  previous: StatsSnapshot | null;
  current: StatisticsResult;
};

function growthSummaryLine(
  t: ReturnType<typeof useI18n>['t'],
  growth: NonNullable<StatisticsResult['growth7d']>,
): string | null {
  const { newResponsesInGroup, newResponsesTotal } = growth;
  if (newResponsesInGroup > 0 && newResponsesTotal > 0) {
    return t.stats.growthSummaryBoth(String(newResponsesInGroup), String(newResponsesTotal));
  }
  if (newResponsesInGroup > 0) {
    return t.stats.growthSummaryInGroup(String(newResponsesInGroup));
  }
  if (newResponsesTotal > 0) {
    return t.stats.growthSummaryTotal(String(newResponsesTotal));
  }
  return null;
}

function positionStatusLine(
  t: ReturnType<typeof useI18n>['t'],
  previous: StatsSnapshot | null,
  current: StatisticsResult,
  groupSize: number,
): string | null {
  const growth = current.growth7d;
  if (
    growth?.percentileThen != null &&
    growth.percentileNow != null &&
    Math.round(growth.percentileThen) !== Math.round(growth.percentileNow)
  ) {
    return t.stats.growthPercentileShift(
      String(formatPercentileValue(growth.percentileThen, groupSize)),
      String(formatPercentileValue(growth.percentileNow, groupSize)),
    );
  }

  if (previous && hasPositionChanged(previous, current)) {
    const percentileFrom =
      previous.lowerScorePercentage != null
        ? formatPercentileValue(previous.lowerScorePercentage, previous.groupResponseCount)
        : null;
    const percentileTo =
      current.lowerScorePercentage != null
        ? formatPercentileValue(current.lowerScorePercentage, groupSize)
        : null;
    if (percentileFrom != null && percentileTo != null) {
      return t.delta.percentileChange(String(percentileFrom), String(percentileTo));
    }
  }

  if (
    growth &&
    (growth.newResponsesInGroup > 0 || growth.newResponsesTotal > 0) &&
    (growth.percentileThen == null ||
      growth.percentileNow == null ||
      Math.round(growth.percentileThen) === Math.round(growth.percentileNow))
  ) {
    return t.delta.positionStable;
  }

  if (previous && !hasPositionChanged(previous, current)) {
    const groupDelta = current.groupResponseCount - previous.groupResponseCount;
    if (groupDelta > 0) return t.delta.positionStable;
    return t.delta.noChangesInline;
  }

  return null;
}

export function WeeklyActivityBlock({ previous, current }: WeeklyActivityProps) {
  const { t, locale } = useI18n();
  const growth = current.growth7d;
  const groupSize = current.groupResponseCount;

  if (growth && hasGrowthActivity(growth)) {
    const summary = growthSummaryLine(t, growth);
    const status = positionStatusLine(t, previous, current, groupSize);

    return (
      <div className="weekly-activity" role="status">
        <p className="weekly-activity__title">{t.stats.growthTitle}</p>
        {summary ? <p className="weekly-activity__primary">{summary}</p> : null}
        {status ? <p className="weekly-activity__secondary">{status}</p> : null}
      </div>
    );
  }

  if (!previous) return null;

  const groupDelta = current.groupResponseCount - previous.groupResponseCount;
  const positionChanged = hasPositionChanged(previous, current);
  const hasAnyChange = groupDelta !== 0 || positionChanged;

  if (!hasAnyChange) {
    return <p className="weekly-activity__secondary">{t.delta.noChangesInline}</p>;
  }

  const reasons = positionChanged ? explainPositionChange(previous, current) : [];

  return (
    <div className="weekly-activity" role="status">
      {groupDelta !== 0 ? (
        <p className="weekly-activity__primary">
          {groupDelta > 0 ? '↑ ' : groupDelta < 0 ? '↓ ' : ''}
          {t.delta.groupSizeChange(String(previous.groupResponseCount), String(current.groupResponseCount))}
        </p>
      ) : null}

      {positionChanged &&
      previous.lowerScorePercentage != null &&
      current.lowerScorePercentage != null ? (
        <p className="weekly-activity__primary">
          {formatPercentileValue(current.lowerScorePercentage, groupSize) >
          formatPercentileValue(previous.lowerScorePercentage, previous.groupResponseCount)
            ? '↑ '
            : '↓ '}
          {t.delta.percentileChange(
            String(formatPercentileValue(previous.lowerScorePercentage, previous.groupResponseCount)),
            String(formatPercentileValue(current.lowerScorePercentage, groupSize)),
          )}
        </p>
      ) : null}

      {!positionChanged && groupDelta > 0 ? (
        <p className="weekly-activity__secondary">{t.delta.positionStable}</p>
      ) : null}

      {positionChanged && reasons.length > 0 ? (
        <ul className="weekly-activity__reasons">
          {reasons.map((reason) => {
            if (reason.kind === 'new_responses') {
              return <li key="new">{t.delta.newResponses(String(reason.count))}</li>;
            }
            if (reason.kind === 'median_shift') {
              const delta = formatScore(reason.delta, locale);
              return (
                <li key="median">
                  {reason.direction === 'up' ? t.delta.medianIncreased(delta) : t.delta.medianDecreased(delta)}
                </li>
              );
            }
            if (reason.kind === 'median_stable') {
              return <li key="stable">{t.delta.medianStable}</li>;
            }
            return null;
          })}
        </ul>
      ) : null}
    </div>
  );
}