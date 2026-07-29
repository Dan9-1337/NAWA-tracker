import { DataSourceBadge } from '../../../components/DataSourceBadge';
import { useI18n } from '../../../i18n/context';

export type SeatAllocationEstimateView = {
  scope: 'country' | 'country_group';
  applicationCount: number;
  totalApplicationCount: number;
  applicationShare: number;
  estimatedSeatRange: { min: number; max: number };
  userRankInScope: number | null;
  sampleSize: number;
  dataBasis: 'submitted_proxy' | 'reported_formal_positive';
  confidenceExplanation: string;
  groupScenarioLabel?: string;
};

type AllocationEstimateCardProps = {
  estimate: SeatAllocationEstimateView;
  groupEstimate?: SeatAllocationEstimateView | null;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-3';

function formatShare(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(share * 100);
}

function EstimateBlock({ estimate }: { estimate: SeatAllocationEstimateView }) {
  const { t, locale } = useI18n();

  return (
    <div className="space-y-2">
      {estimate.groupScenarioLabel ? (
        <p className="text-sm font-semibold text-[var(--text-primary)]">{estimate.groupScenarioLabel}</p>
      ) : null}
      <dl className="space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[var(--text-secondary)]">{t.dashboard.allocation.countryShare}</dt>
          <dd className="font-medium tabular-nums text-[var(--text-primary)]">
            {formatShare(estimate.applicationShare, locale)}%
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[var(--text-secondary)]">{t.dashboard.allocation.seatRange}</dt>
          <dd className="font-medium tabular-nums text-[var(--text-primary)]">
            {t.dashboard.allocation.seatRangeValue(
              String(estimate.estimatedSeatRange.min),
              String(estimate.estimatedSeatRange.max),
            )}
          </dd>
        </div>
        {estimate.userRankInScope != null ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--text-secondary)]">{t.dashboard.allocation.yourRank}</dt>
            <dd className="font-medium tabular-nums text-[var(--text-primary)]">
              {t.dashboard.allocation.rankInSample(
                String(estimate.userRankInScope),
                String(estimate.sampleSize),
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="text-xs leading-5 text-[var(--text-helper)]">
        {estimate.dataBasis === 'reported_formal_positive'
          ? t.dashboard.allocation.basisFormalPositive
          : t.dashboard.allocation.basisSubmittedProxy}
      </p>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{estimate.confidenceExplanation}</p>
    </div>
  );
}

export function AllocationEstimateCard({ estimate, groupEstimate = null }: AllocationEstimateCardProps) {
  const { t } = useI18n();

  return (
    <section className={cardClass} aria-labelledby="dashboard-allocation-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-allocation-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {groupEstimate ? t.dashboard.allocation.titleGroup : t.dashboard.allocation.title}
        </h2>
        <DataSourceBadge source="estimate" />
      </div>

      <EstimateBlock estimate={estimate} />
      {groupEstimate ? (
        <>
          <hr className="border-0 border-t border-[var(--section-divider-color)]" />
          <EstimateBlock estimate={groupEstimate} />
        </>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.allocation.disclaimer}</p>
    </section>
  );
}
