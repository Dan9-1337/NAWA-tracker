import { useState } from 'react';
import type { StatisticsHistoryPoint } from '../../shared/contracts';
import { HistorySparkline } from './HistorySparkline';
import { ChevronIcon } from './icons';
import { useI18n } from '../i18n/context';
import { formatShortDayTime } from '../lib/format';
import { computeHistoryTrend, percentileAt } from '../lib/position-history';

type PositionHistoryListProps = {
  history: StatisticsHistoryPoint[];
};

export function PositionHistoryList({ history }: PositionHistoryListProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  if (history.length < 2) return null;

  const points = [...history].reverse();
  const trend = computeHistoryTrend(history);

  return (
    <div>
      <button type="button" className="disclosure-row" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="min-w-0">
          <span className="block text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
            {t.stats.historyTitle}
          </span>

          {!open && trend ? (
            <div className="history-trend">
              <HistorySparkline values={trend.sparkline} />
              <div className="history-trend__copy">
                <p className="history-trend__values">{t.stats.historyTrend(String(trend.from), String(trend.to))}</p>
                <p
                  className={`history-trend__delta${
                    trend.delta > 0
                      ? ' history-trend__delta--up'
                      : trend.delta < 0
                        ? ' history-trend__delta--down'
                        : ' history-trend__delta--flat'
                  }`}
                >
                  {trend.delta > 0 ? '↑ ' : trend.delta < 0 ? '↓ ' : ''}
                  {t.stats.historyDelta(String(Math.abs(trend.delta)))}
                </p>
              </div>
            </div>
          ) : null}

          {open ? (
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-primary)]">
              {points.map((point) => {
                const value = percentileAt(point);
                return (
                  <li key={point.recordedAt} className="flex items-center justify-between gap-3">
                    <span className="text-[var(--tg-theme-subtitle-text-color)]">
                      {formatShortDayTime(point.recordedAt, locale)}
                    </span>
                    <span className="font-medium tabular-nums">{value != null ? `${value}%` : '—'}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </span>
        <span className="disclosure-row__chevron">
          <ChevronIcon />
        </span>
      </button>
    </div>
  );
}
