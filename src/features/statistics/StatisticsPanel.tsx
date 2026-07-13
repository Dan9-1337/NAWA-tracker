import type { StatisticsResult } from '../../../shared/contracts';
import { pl } from '../../i18n/pl';
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

function formatGroup(group: StatisticsResult['group']) {
  return group ? pl.stats.groupLabels[group] : pl.stats.noGroup;
}

export function StatisticsPanel({ state }: StatisticsPanelProps) {
  const titleId = 'statistics-title';
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;

  return (
    <section
      aria-busy={state.status === 'loading'}
      aria-labelledby={titleId}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)]"
      role="region"
    >
      <h2 id={titleId} className="text-xl font-semibold text-slate-900">{pl.stats.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{pl.stats.subtitle}</p>

      {state.status === 'unavailable' ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {pl.stats.unavailable}
        </p>
      ) : null}
      {state.status === 'loading' ? (
        <p className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status" aria-label={pl.stats.loadingAriaLabel} aria-live="polite">
          {pl.stats.loading}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert" aria-label={pl.stats.errorAriaLabel}>
          {pl.stats.error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">{formatGroup(data.group)}</p>
            <p>{state.status === 'suppressed' ? pl.stats.noStats : pl.stats.fallbackNotice}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label={pl.stats.totalResponses} value={String(data.totalValidResponses)} />
            <StatCard label={pl.stats.sameTrack} value={String(data.sameTrackCount)} />
            <StatCard label={pl.stats.sameUniversity} value={data.sameUniversityCount == null ? pl.stats.noValue : String(data.sameUniversityCount)} />
            <StatCard label={pl.stats.sameUniversityAndField} value={data.sameUniversityAndFieldCount == null ? pl.stats.noValue : String(data.sameUniversityAndFieldCount)} />
            <StatCard label={pl.stats.groupResponseCount} value={String(data.groupResponseCount)} />
            <StatCard
              label={pl.stats.percentileLabel}
              value={data.lowerGradePercentage == null
                ? pl.stats.noValue
                : pl.stats.percentileSentence(data.lowerGradePercentage.toFixed(1))}
              hint={data.medianGradePercentage == null
                ? pl.stats.medianUnavailable
                : pl.stats.medianSentence(data.medianGradePercentage.toFixed(1))}
            />
            <StatCard label={pl.stats.waitingLabel} value={data.waitingForDecisionCount == null ? pl.stats.noValue : String(data.waitingForDecisionCount)} />
            <StatCard label={pl.stats.positiveLabel} value={data.positiveDecisionCount == null ? pl.stats.noValue : String(data.positiveDecisionCount)} />
            <StatCard label={pl.stats.negativeLabel} value={data.negativeDecisionCount == null ? pl.stats.noValue : String(data.negativeDecisionCount)} />
          </div>
        </>
      ) : null}
    </section>
  );
}
