import type { GroupProgress } from '../../../shared/contracts';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';

type ProgressInGroupCardProps = {
  progress: GroupProgress;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

export function ProgressInGroupCard({ progress }: ProgressInGroupCardProps) {
  const { t } = useI18n();

  const rows = [
    { key: 'submitted', label: t.dashboard.groupProgress.submitted, value: progress.submitted },
    {
      key: 'formal',
      label: t.dashboard.groupProgress.formalPositive,
      value: progress.formalPositive,
    },
    {
      key: 'merit',
      label: t.dashboard.groupProgress.meritPositive,
      value: progress.meritPositive,
    },
    {
      key: 'awarded',
      label: t.dashboard.groupProgress.scholarshipAwarded,
      value: progress.scholarshipAwarded,
    },
  ];

  return (
    <section className={cardClass} aria-labelledby="dashboard-group-progress-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-group-progress-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.groupProgress.title}
        </h2>
        <DataSourceBadge source="reported" />
      </div>

      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-[var(--text-secondary)]">{row.label}</dt>
            <dd className="font-medium tabular-nums text-[var(--text-primary)]">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.groupProgress.disclaimer}</p>
    </section>
  );
}
