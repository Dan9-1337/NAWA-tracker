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
            <StatCard label={t.stats.sameUniversity} value={data.sameUniversityCount == null ? t.stats.noValue : String(data.sameUniversityCount)} />
            <StatCard label={t.stats.sameUniversityAndField} value={data.sameUniversityAndFieldCount == null ? t.stats.noValue : String(data.sameUniversityAndFieldCount)} />
            <StatCard label={t.stats.groupResponseCount} value={String(data.groupResponseCount)} />
            <StatCard
              label={t.stats.percentileLabel}
              value={data.lowerGradePercentage == null
                ? t.stats.noValue
                : t.stats.percentileSentence(data.lowerGradePercentage.toFixed(1))}
              hint={data.medianGradePercentage == null
                ? t.stats.medianUnavailable
                : t.stats.medianSentence(data.medianGradePercentage.toFixed(1))}
            />
            <StatCard label={t.stats.waitingLabel} value={data.waitingForDecisionCount == null ? t.stats.noValue : String(data.waitingForDecisionCount)} />
            <StatCard label={t.stats.positiveLabel} value={data.positiveDecisionCount == null ? t.stats.noValue : String(data.positiveDecisionCount)} />
            <StatCard label={t.stats.negativeLabel} value={data.negativeDecisionCount == null ? t.stats.noValue : String(data.negativeDecisionCount)} />
          </div>
        </>
      ) : null}
    </section>
  );
}
