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
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)]"
      role="region"
    >
      <h2 id={titleId} className="text-xl font-semibold text-slate-900">{t.stats.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t.stats.subtitle}</p>

      {state.status === 'unavailable' ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t.stats.unavailable}
        </p>
      ) : null}
      {state.status === 'loading' ? (
        <p className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status" aria-label={t.stats.loadingAriaLabel} aria-live="polite">
          {t.stats.loading}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert" aria-label={t.stats.errorAriaLabel}>
          {t.stats.error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">{formatGroup(data.group, t)}</p>
            <p>{state.status === 'suppressed' ? t.stats.noStats : t.stats.fallbackNotice}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t.stats.totalResponses} value={String(data.totalValidResponses)} />
            <StatCard label={t.stats.sameTrack} value={String(data.sameTrackCount)} />
            <StatCard label={t.stats.sameCountry} value={data.sameCountryCount == null ? t.stats.noValue : String(data.sameCountryCount)} />
            <StatCard label={t.stats.groupResponseCount} value={String(data.groupResponseCount)} />
            <StatCard
              label={t.stats.percentileLabel}
              value={data.lowerScorePercentage == null
                ? t.stats.noValue
                : t.stats.percentileSentence(data.lowerScorePercentage.toFixed(1))}
              hint={data.medianScore == null
                ? t.stats.medianUnavailable
                : t.stats.medianSentence(data.medianScore.toFixed(2))}
            />
          </div>
          {data.statusCounts ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-700">{t.stats.statusBreakdown}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(data.statusCounts).map(([status, count]) => (
                  <StatCard
                    key={status}
                    label={t.choices.currentStatus[status as keyof typeof t.choices.currentStatus]}
                    value={String(count)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-6 text-xs leading-5 text-slate-500">{t.stats.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
