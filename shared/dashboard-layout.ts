export type DashboardSectionId =
  | 'result_hero'
  | 'distribution_detailed'
  | 'what_changed'
  | 'reported_merit_outcomes'
  | 'group_progress'
  | 'allocation';

export type DashboardVisitContext = {
  isReturningVisit: boolean;
  hasChanges: boolean;
};

const firstVisitOrder: DashboardSectionId[] = [
  'result_hero',
  'distribution_detailed',
  'allocation',
];

const returningWithChangesOrder: DashboardSectionId[] = [
  'what_changed',
  'result_hero',
  'distribution_detailed',
  'reported_merit_outcomes',
  'group_progress',
  'allocation',
];

const returningWithoutChangesOrder: DashboardSectionId[] = [
  'result_hero',
  'distribution_detailed',
  'group_progress',
  'allocation',
];

export function getDashboardSectionOrder(
  context: DashboardVisitContext,
  availableSections: Set<DashboardSectionId>,
): DashboardSectionId[] {
  const template = !context.isReturningVisit
    ? firstVisitOrder
    : context.hasChanges
      ? returningWithChangesOrder
      : returningWithoutChangesOrder;

  return template.filter((section) => availableSections.has(section));
}
