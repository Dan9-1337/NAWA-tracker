import type { GroupProgress } from '../../../shared/contracts';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { UsersIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';

type ProgressInGroupCardProps = {
  progress: GroupProgress;
};

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
    <DashboardCard aria-labelledby="dashboard-group-progress-title">
      <CardHeader
        titleId="dashboard-group-progress-title"
        title={t.dashboard.groupProgress.title}
        icon={<UsersIcon size={16} />}
        titleClassName="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
      />

      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-[var(--text-secondary)]">{row.label}</dt>
            <dd className="font-medium tabular-nums text-[var(--text-primary)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </DashboardCard>
  );
}
