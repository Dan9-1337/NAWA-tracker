import type { StatisticsResult } from '../../shared/contracts';
import type { StatsSnapshot } from '../lib/stats-snapshot';
import { WhatChangedContent } from '../features/dashboard/WhatChangedCard';

type WeeklyActivityProps = {
  previous: StatsSnapshot | null;
  current: StatisticsResult;
};

/** @deprecated Use WhatChangedCard or WhatChangedContent from features/dashboard */
export function WeeklyActivityBlock({ previous, current }: WeeklyActivityProps) {
  return <WhatChangedContent previous={previous} current={current} />;
}
