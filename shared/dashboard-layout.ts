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
