import type { StatisticsResult } from '../../shared/contracts';
import { MIN_K_ANONYMITY } from '../../shared/product-rules';
import {
  resolveCommunityMilestones,
  type CommunityMilestoneId,
} from './community-milestones';

export const radarFilters = [
  'my_country',
  'all',
  'statuses',
  'official',
  'product',
] as const;

export type RadarFilter = (typeof radarFilters)[number];

export type RadarEventKind =
  | 'country_detailed_opened'
  | 'country_sample_growth'
  | 'global_growth'
  | 'status_pulse'
  | 'merit_pulse'
  | 'community_milestone'
  | 'product_update';

export type RadarEvent = {
  id: string;
  kind: RadarEventKind;
  filterTags: RadarFilter[];
  country: string | null;
  /** Count payload for growth/status pulses — never a personal score. */
  count?: number;
  milestoneId?: CommunityMilestoneId;
};

export type BuildRadarFeedInput = {
  data: StatisticsResult;
  rankingCountry: string;
};

/**
 * Client-side radar feed from existing aggregates.
 * Never includes names, exact new-user scores, or single-person merit outcomes.
 */
export function buildRadarFeed(input: BuildRadarFeedInput): RadarEvent[] {
  const { data, rankingCountry } = input;
  const events: RadarEvent[] = [];
  const countryCount = data.sameCountryCount ?? data.countryContext.countrySampleSize;
  const growth = data.growth7d;

  if (countryCount >= MIN_K_ANONYMITY && data.detailsAvailable) {
    events.push({
      id: 'country-detailed',
      kind: 'country_detailed_opened',
      filterTags: ['my_country', 'all'],
      country: rankingCountry,
    });
  }

  if (growth && growth.newResponsesInGroup > 0 && countryCount >= MIN_K_ANONYMITY) {
    events.push({
      id: `country-growth-${growth.newResponsesInGroup}`,
      kind: 'country_sample_growth',
      filterTags: ['my_country', 'all'],
      country: rankingCountry,
      count: growth.newResponsesInGroup,
    });
  }

  if (growth && growth.trackNewResponses > 0) {
    events.push({
      id: `global-growth-${growth.trackNewResponses}`,
      kind: 'global_growth',
      filterTags: ['all'],
      country: null,
      count: growth.trackNewResponses,
    });
  }

  if (growth && growth.statusUpdatesInGroup >= 5 && countryCount >= MIN_K_ANONYMITY) {
    events.push({
      id: `status-pulse-${growth.statusUpdatesInGroup}`,
      kind: 'status_pulse',
      filterTags: ['my_country', 'statuses', 'all'],
      country: rankingCountry,
      count: growth.statusUpdatesInGroup,
    });
  }

  const meritTotal =
    (data.reportedMeritOutcomes?.positiveCount ?? 0) +
    (data.reportedMeritOutcomes?.negativeCount ?? 0);
  if (meritTotal >= 5 && countryCount >= MIN_K_ANONYMITY) {
    events.push({
      id: `merit-pulse-${meritTotal}`,
      kind: 'merit_pulse',
      filterTags: ['my_country', 'statuses', 'all'],
      country: rankingCountry,
      count: meritTotal,
    });
  }

  const milestones = resolveCommunityMilestones({
    sampleSize: data.globalBenchmark.sampleSize,
    representedCountryCount: data.globalBenchmark.representedCountryCount,
    detailedCountriesCount: data.globalBenchmark.detailedCountriesCount,
    meritOutcomeCount: meritTotal,
  });

  for (const milestoneId of milestones.unlocked) {
    events.push({
      id: `milestone-${milestoneId}`,
      kind: 'community_milestone',
      filterTags: ['all', 'product'],
      country: null,
      milestoneId,
    });
  }

  events.push({
    id: 'product-multilevel',
    kind: 'product_update',
    filterTags: ['product', 'all'],
    country: null,
  });

  return events;
}

export function filterRadarEvents(
  events: RadarEvent[],
  filter: RadarFilter,
  rankingCountry: string,
): RadarEvent[] {
  if (filter === 'all') return events;

  return events.filter((event) => {
    if (!event.filterTags.includes(filter)) return false;
    if (filter === 'my_country') return event.country === rankingCountry;
    return true;
  });
}
