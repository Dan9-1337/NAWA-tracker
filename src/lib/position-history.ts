import type { StatisticsHistoryPoint } from '../../shared/contracts';
import { formatPercentileValue } from './stats-verdict';

export type HistoryTrend = {
  from: number;
  to: number;
  delta: number;
  sparkline: number[];
};

export function percentileAt(point: StatisticsHistoryPoint): number | null {
  if (point.lowerScorePercentage == null) return null;
  return formatPercentileValue(point.lowerScorePercentage, point.groupResponseCount);
}

export function computeHistoryTrend(history: StatisticsHistoryPoint[]): HistoryTrend | null {
  const values = history
    .map((point) => percentileAt(point))
    .filter((value): value is number => value != null);

  if (values.length < 2) return null;

  const from = values[0];
  const to = values[values.length - 1];

  return {
    from,
    to,
    delta: to - from,
    sparkline: values.slice(-5),
  };
}
