import type { ApplicationStatus } from './contracts';
import { isTerminalApplicationStatus } from './status-transitions';

export type DashboardSectionId =
  | 'result_hero'
  | 'nawa_passport'
  | 'contribution_badges'
  | 'global_benchmark'
  | 'country_context'
  | 'cohort_pulse'
  | 'community_milestones'
  | 'distribution_detailed'
  | 'what_changed'
  | 'reported_merit_outcomes'
  | 'group_progress'
  | 'allocation';

export type DashboardSectionGroup = 'primary' | 'community' | 'progress';

export const dashboardSectionGroup: Record<DashboardSectionId, DashboardSectionGroup> = {
  what_changed: 'primary',
  result_hero: 'primary',
  nawa_passport: 'primary',
  contribution_badges: 'primary',
  global_benchmark: 'community',
  country_context: 'community',
  cohort_pulse: 'community',
  community_milestones: 'community',
  distribution_detailed: 'community',
  reported_merit_outcomes: 'progress',
  group_progress: 'progress',
  allocation: 'progress',
};

export const dashboardSectionGroupOrder: DashboardSectionGroup[] = [
  'primary',
  'community',
  'progress',
];

export function getDashboardSectionGroup(sectionId: DashboardSectionId): DashboardSectionGroup {
  return dashboardSectionGroup[sectionId];
}

export function groupDashboardSections(sectionOrder: DashboardSectionId[]): Array<{
  group: DashboardSectionGroup;
  sections: DashboardSectionId[];
}> {
  const grouped: Array<{ group: DashboardSectionGroup; sections: DashboardSectionId[] }> = [];

  for (const sectionId of sectionOrder) {
    const group = getDashboardSectionGroup(sectionId);
    const last = grouped[grouped.length - 1];
    if (last?.group === group) {
      last.sections.push(sectionId);
    } else {
      grouped.push({ group, sections: [sectionId] });
    }
  }

  return grouped;
}

export type DashboardVisitMode =
  | 'first_result'
  | 'returning_no_changes'
  | 'returning_with_changes'
  | 'post_merit'
  | 'terminal';

/** @deprecated Prefer `DashboardVisitMode` via `resolveDashboardVisitMode`. */
export type DashboardVisitContext = {
  isReturningVisit: boolean;
  hasChanges: boolean;
};

const firstVisitOrder: DashboardSectionId[] = [
  'result_hero',
  'nawa_passport',
  'global_benchmark',
  'country_context',
  'cohort_pulse',
  'community_milestones',
  'contribution_badges',
  'distribution_detailed',
  'allocation',
];

const returningWithChangesOrder: DashboardSectionId[] = [
  'what_changed',
  'result_hero',
  'nawa_passport',
  'global_benchmark',
  'country_context',
  'cohort_pulse',
  'community_milestones',
  'contribution_badges',
  'distribution_detailed',
  'reported_merit_outcomes',
  'group_progress',
  'allocation',
];

const returningWithoutChangesOrder: DashboardSectionId[] = [
  'result_hero',
  'nawa_passport',
  'global_benchmark',
  'country_context',
  'cohort_pulse',
  'community_milestones',
  'contribution_badges',
  'distribution_detailed',
  'group_progress',
  'allocation',
];

const postMeritOrder: DashboardSectionId[] = [
  'result_hero',
  'nawa_passport',
  'what_changed',
  'global_benchmark',
  'country_context',
  'cohort_pulse',
  'community_milestones',
  'contribution_badges',
  'group_progress',
  'reported_merit_outcomes',
  'allocation',
];

const terminalOrder: DashboardSectionId[] = [
  'result_hero',
  'nawa_passport',
  'contribution_badges',
  'global_benchmark',
  'country_context',
  'cohort_pulse',
  'community_milestones',
  'group_progress',
  'allocation',
];

const orderByMode: Record<DashboardVisitMode, DashboardSectionId[]> = {
  first_result: firstVisitOrder,
  returning_no_changes: returningWithoutChangesOrder,
  returning_with_changes: returningWithChangesOrder,
  post_merit: postMeritOrder,
  terminal: terminalOrder,
};

export type ResolveDashboardVisitModeInput = {
  isReturningVisit: boolean;
  hasChanges: boolean;
  applicationStatus: ApplicationStatus;
  /** True when the user just saved a formal/merit status in this session. */
  recentlyUpdatedStatus?: boolean;
};

export function resolveDashboardVisitMode(
  input: ResolveDashboardVisitModeInput,
): DashboardVisitMode {
  if (isTerminalApplicationStatus(input.applicationStatus)) {
    return 'terminal';
  }

  if (
    input.recentlyUpdatedStatus &&
    (input.applicationStatus === 'formal_review_positive' ||
      input.applicationStatus === 'merit_review_positive')
  ) {
    return 'post_merit';
  }

  if (!input.isReturningVisit) return 'first_result';
  return input.hasChanges ? 'returning_with_changes' : 'returning_no_changes';
}

export function getDashboardSectionOrder(
  context: DashboardVisitContext | { mode: DashboardVisitMode },
  availableSections: Set<DashboardSectionId>,
): DashboardSectionId[] {
  const mode =
    'mode' in context
      ? context.mode
      : resolveDashboardVisitMode({
          isReturningVisit: context.isReturningVisit,
          hasChanges: context.hasChanges,
          applicationStatus: 'submitted',
        });

  return orderByMode[mode].filter((section) => availableSections.has(section));
}
