import type { StatisticsResult } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import type { StatsSnapshot } from '../lib/stats-snapshot';
import { formatPercentileValue } from '../lib/stats-verdict';

type VisitDeltaBannerProps = {
  previous: StatsSnapshot | null;
  current: StatisticsResult;
};

/** Renders only when there are meaningful visit-to-visit changes. Quiet "updated" lives under reliability. */
export function VisitDeltaBanner({ previous, current }: VisitDeltaBannerProps) {
  const { t } = useI18n();

  if (!previous) return null;

  const groupDelta = current.groupResponseCount - previous.groupResponseCount;
  const positionChanged =
    previous.lowerScorePercentage != null &&
    current.lowerScorePercentage != null &&
    Math.round(previous.lowerScorePercentage) !== Math.round(current.lowerScorePercentage);

  if (positionChanged) {
    const from = formatPercentileValue(previous.lowerScorePercentage!, previous.groupResponseCount);
    const to = formatPercentileValue(current.lowerScorePercentage!, current.groupResponseCount);
    const rose = to > from;
    return (
      <p className="mb-3 text-sm leading-snug">
        <span className="font-medium text-[var(--text-primary)]">
          {rose ? '↑ ' : '↓ '}
          {t.delta.positionGrew(String(from), String(to))}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--tg-theme-subtitle-text-color)]">
          {t.delta.sinceLastVisit}
        </span>
      </p>
    );
  }

  if (groupDelta > 0) {
    return (
      <p className="mb-3 text-sm leading-snug">
        <span className="font-medium text-[var(--text-primary)]">↑ {t.delta.newResponses(String(groupDelta))}</span>
        <span className="mt-0.5 block text-xs text-[var(--tg-theme-subtitle-text-color)]">
          {t.delta.sinceLastVisit}
        </span>
      </p>
    );
  }

  return null;
}
