import type { GlobalBenchmark, ReportedMeritOutcomeStats } from '../../../shared/contracts';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import {
  resolveCommunityMilestones,
  type CommunityMilestoneId,
} from '../../lib/community-milestones';

type CommunityMilestonesCardProps = {
  globalBenchmark: GlobalBenchmark;
  reportedMeritOutcomes: ReportedMeritOutcomeStats | null;
  seasonLabel?: string;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2.5';

export function CommunityMilestonesCard({
  globalBenchmark,
  reportedMeritOutcomes,
  seasonLabel = '2026',
}: CommunityMilestonesCardProps) {
  const { t } = useI18n();
  const { unlocked, latest } = resolveCommunityMilestones({
    sampleSize: globalBenchmark.sampleSize,
    representedCountryCount: globalBenchmark.representedCountryCount,
    detailedCountriesCount: globalBenchmark.detailedCountriesCount,
    meritOutcomeCount:
      (reportedMeritOutcomes?.positiveCount ?? 0) +
      (reportedMeritOutcomes?.negativeCount ?? 0),
  });

  if (globalBenchmark.sampleSize == null) return null;

  return (
    <section className={cardClass} aria-label={t.milestones.title(seasonLabel)}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {t.milestones.title(seasonLabel)}
        </h2>
        <DataSourceBadge source="global_sample" />
      </div>

      <ul className="space-y-0.5 text-sm text-[var(--text-primary)]">
        <li>{t.milestones.apps(String(globalBenchmark.sampleSize))}</li>
        {globalBenchmark.representedCountryCount != null ? (
          <li>{t.milestones.countries(String(globalBenchmark.representedCountryCount))}</li>
        ) : null}
        {globalBenchmark.detailedCountriesCount != null ? (
          <li>{t.milestones.detailed(String(globalBenchmark.detailedCountriesCount))}</li>
        ) : null}
      </ul>

      {unlocked.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-helper)]">
            {t.milestones.unlockedTitle}
          </p>
          <ul className="space-y-0.5 text-xs leading-5 text-[var(--text-secondary)]">
            {unlocked.map((id: CommunityMilestoneId) => (
              <li key={id}>{t.milestones.items[id]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {latest ? (
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {t.milestones.celebration[latest]}
        </p>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.milestones.disclaimer}</p>
    </section>
  );
}
