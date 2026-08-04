import type { ContributionBadgeId } from '../../../shared/contribution-badges';
import { useI18n } from '../../i18n/context';

type ContributionBadgesRowProps = {
  badges: ContributionBadgeId[];
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

export function ContributionBadgesRow({ badges }: ContributionBadgesRowProps) {
  const { t } = useI18n();

  if (badges.length === 0) return null;

  return (
    <section className={cardClass} aria-label={t.badges.title}>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.badges.title}</h2>
      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.badges.disclaimer}</p>
      <ul className="flex flex-wrap gap-2 pt-1">
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
    </section>
  );
}
