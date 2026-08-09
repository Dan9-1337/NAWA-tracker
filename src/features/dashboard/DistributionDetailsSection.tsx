import { useState } from 'react';
import type { ScholarshipTrack } from '../../../shared/contracts';
import { DashboardCard } from '../../components/DashboardCard';
import { DensityStrip } from '../../components/DensityStrip';
import { ChevronIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';

type DistributionDetailsSectionProps = {
  buckets: number[];
  track: ScholarshipTrack;
  userScore: number;
  medianScore?: number | null;
  groupSize: number;
};

export function DistributionDetailsSection({
  buckets,
  track,
  userScore,
  medianScore,
  groupSize,
}: DistributionDetailsSectionProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <DashboardCard className="!space-y-0">
      <button
        type="button"
        className="disclosure-row flex w-full items-center justify-between gap-3 !px-0 !py-0"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="disclosure-row__label">
          {expanded ? t.dashboard.hero.collapseDistribution : t.dashboard.hero.expandDistribution}
        </span>
        <span className="disclosure-row__chevron">
          <ChevronIcon />
        </span>
      </button>

      {expanded ? (
        <div className="mt-3">
          <DensityStrip
            variant="detailed"
            buckets={buckets}
            track={track}
            userScore={userScore}
            medianScore={medianScore}
            groupSize={groupSize}
          />
        </div>
      ) : null}
    </DashboardCard>
  );
}
