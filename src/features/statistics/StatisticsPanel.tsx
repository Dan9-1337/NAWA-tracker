import type { StatisticsResult } from '../../../shared/contracts';
import { useI18n } from '../../i18n/context';
import { StatCard } from '../../components/StatCard';

export type StatisticsState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'suppressed'; data: StatisticsResult }
  | { status: 'success'; data: StatisticsResult };

type StatisticsPanelProps = {
  state: StatisticsState;
};

export function statisticsStateFromResult(data: StatisticsResult): StatisticsState {
  return data.detailsAvailable ? { status: 'success', data } : { status: 'suppressed', data };
}

function formatGroup(group: StatisticsResult['group'], t: ReturnType<typeof useI18n>['t']) {
  return group ? t.stats.groupLabels[group] : t.stats.noGroup;
}

export function StatisticsPanel({ state }: StatisticsPanelProps) {
  const { t } = useI18n();
  const titleId = 'statistics-title';
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;

  return (
    <section
      aria-busy={state.status === 'loading'}
      aria-labelledby={titleId}
      className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-4"
      role="region"
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {t.stats.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.subtitle}</p>

      {state.status === 'unavailable' ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
          {t.stats.unavailable}
        </p>
      ) : null}
      {state.status === 'loading' ? (
        <p
          className="mt-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm"
          role="status"
          aria-label={t.stats.loadingAriaLabel}
          aria-live="polite"
        >
          {t.stats.loading}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p
          className="mt-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm text-[var(--tg-theme-destructive-text-color)]"
          role="alert"
          aria-label={t.stats.errorAriaLabel}
        >
          {t.stats.error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="mt-5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
            <p className="font-semibold">{formatGroup(data.group, t)}</p>
            <p className="text-[var(--tg-theme-subtitle-text-color)]">
              {state.status === 'suppressed' ? t.stats.noStats : t.stats.fallbackNotice}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <StatCard label={t.stats.groupResponseCount} value={String(data.groupResponseCount)} />
            <StatCard
              label={t.stats.percentileLabel}
              value={
                data.lowerScorePercentage == null
                  ? t.stats.noValue
                  : t.stats.percentileSentence(data.lowerScorePercentage.toFixed(1))
              }
              hint={
                data.medianScore == null
                  ? t.stats.medianUnavailable
                  : t.stats.medianSentence(data.medianScore.toFixed(2))
              }
            />
            <StatCard label={t.stats.totalResponses} value={String(data.totalValidResponses)} />
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
