import type { StatisticsResult } from '../../../shared/contracts';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';
import {
  explainPositionChange,
  hasGrowthActivity,
  hasPositionChanged,
} from '../../lib/position-change';
import type { Locale } from '../../i18n/types';
import type { StatsSnapshot } from '../../lib/stats-snapshot';
import { formatPercentileValue } from '../../lib/stats-verdict';

export type AllocationSnapshot = {
  applicationShare: number;
  estimatedSeatRange: { min: number; max: number } | null;
};

type WhatChangedCardProps = {
  previous: StatsSnapshot | null;
  current: StatisticsResult;
  previousAllocation?: AllocationSnapshot | null;
  currentAllocation?: AllocationSnapshot | null;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

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

function formatShare(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(share * 100);
}

function formatSeatRange(
  range: { min: number; max: number },
  t: ReturnType<typeof useI18n>['t'],
): string {
  return t.dashboard.whatChanged.seatRangeValue(String(range.min), String(range.max));
}

type DeltaRow = {
  key: string;
  label: string;
  value: string;
};

function buildDeltaRows(
  t: ReturnType<typeof useI18n>['t'],
  locale: Locale,
  previous: StatsSnapshot | null,
  current: StatisticsResult,
  previousAllocation: AllocationSnapshot | null | undefined,
  currentAllocation: AllocationSnapshot | null | undefined,
): DeltaRow[] {
  if (!previous) return [];

  const rows: DeltaRow[] = [];

  if (
    previous.lowerScorePercentage != null &&
    current.lowerScorePercentage != null &&
    hasPositionChanged(previous, current)
  ) {
    rows.push({
      key: 'position',
      label: t.dashboard.whatChanged.position,
      value: t.dashboard.whatChanged.valueChange(
        `${formatPercentileValue(previous.lowerScorePercentage, previous.groupResponseCount)}%`,
        `${formatPercentileValue(current.lowerScorePercentage, current.groupResponseCount)}%`,
      ),
    });
  }

  if (previous.groupResponseCount !== current.groupResponseCount) {
    rows.push({
      key: 'group-size',
      label: t.dashboard.whatChanged.groupSize,
      value: t.dashboard.whatChanged.valueChange(
        String(previous.groupResponseCount),
        String(current.groupResponseCount),
      ),
    });
  }

  if (
    previous.medianScore != null &&
    current.medianScore != null &&
    Math.abs(current.medianScore - previous.medianScore) >= 0.5
  ) {
    rows.push({
      key: 'median',
      label: t.dashboard.whatChanged.median,
      value: t.dashboard.whatChanged.valueChange(
        formatScore(previous.medianScore, locale),
        formatScore(current.medianScore, locale),
      ),
    });
  }

  if (
    previousAllocation &&
    currentAllocation &&
    Math.abs(previousAllocation.applicationShare - currentAllocation.applicationShare) >= 0.001
  ) {
    rows.push({
      key: 'country-share',
      label: t.dashboard.whatChanged.countryShare,
      value: t.dashboard.whatChanged.valueChange(
        `${formatShare(previousAllocation.applicationShare, locale)}%`,
        `${formatShare(currentAllocation.applicationShare, locale)}%`,
      ),
    });
  }

  if (
    previousAllocation?.estimatedSeatRange &&
    currentAllocation?.estimatedSeatRange &&
    (previousAllocation.estimatedSeatRange.min !== currentAllocation.estimatedSeatRange.min ||
      previousAllocation.estimatedSeatRange.max !== currentAllocation.estimatedSeatRange.max)
  ) {
    rows.push({
      key: 'seat-range',
      label: t.dashboard.whatChanged.seatRange,
      value: t.dashboard.whatChanged.valueChange(
        formatSeatRange(previousAllocation.estimatedSeatRange, t),
        formatSeatRange(currentAllocation.estimatedSeatRange, t),
      ),
    });
  }

  return rows;
}

export function WhatChangedContent({
  previous,
  current,
}: {
  previous: StatsSnapshot | null;
  current: StatisticsResult;
}) {
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

export function WhatChangedCard({
  previous,
  current,
  previousAllocation = null,
  currentAllocation = null,
}: WhatChangedCardProps) {
  const { t, locale } = useI18n();
  const deltaRows = buildDeltaRows(
    t,
    locale,
    previous,
    current,
    previousAllocation,
    currentAllocation,
  );

  return (
    <section className={cardClass} aria-labelledby="dashboard-what-changed-title">
      <h2
        id="dashboard-what-changed-title"
        className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
      >
        {t.dashboard.whatChanged.title}
      </h2>

      {deltaRows.length > 0 ? (
        <dl className="space-y-1.5">
          {deltaRows.map((row) => (
            <div key={row.key} className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-[var(--text-secondary)]">{row.label}</dt>
              <dd className="font-medium tabular-nums text-[var(--text-primary)]">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <WhatChangedContent previous={previous} current={current} />
      )}
    </section>
  );
}
