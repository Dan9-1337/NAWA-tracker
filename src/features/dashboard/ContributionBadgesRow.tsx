import type { ContributionBadgeId } from '../../../shared/contribution-badges';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { UsersIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';

type ContributionBadgesRowProps = {
  badges: ContributionBadgeId[];
};

export function ContributionBadgesRow({ badges }: ContributionBadgesRowProps) {
  const { t } = useI18n();

  if (badges.length === 0) return null;

  return (
    <DashboardCard aria-label={t.badges.title}>
      <CardHeader title={t.badges.title} icon={<UsersIcon size={16} />} />

      <ul className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <li
            key={badge}
            className="rounded-full border border-[color-mix(in_srgb,var(--color-accent)_30%,var(--section-divider-color))] bg-[var(--tg-theme-bg-color)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
            title={t.badges.descriptions[badge]}
          >
            {t.badges.labels[badge]}
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
