import type { GlobalBenchmark, ReportedMeritOutcomeStats } from '../../../shared/contracts';
import { DashboardCard, CardHeader } from '../../components/DashboardCard';
import { FlagIcon } from '../../components/icons';
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
    <DashboardCard aria-label={t.milestones.title(seasonLabel)}>
      <CardHeader title={t.milestones.title(seasonLabel)} icon={<FlagIcon size={16} />} />

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
    </DashboardCard>
  );
}
