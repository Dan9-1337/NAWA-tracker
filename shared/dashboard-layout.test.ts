import { describe, expect, it } from 'vitest';
import { getDashboardSectionOrder, type DashboardSectionId } from './dashboard-layout';

function sectionSet(...sections: DashboardSectionId[]): Set<DashboardSectionId> {
  return new Set(sections);
}

describe('getDashboardSectionOrder', () => {
  it('returns first-visit order when all sections are available', () => {
    expect(
      getDashboardSectionOrder(
        { isReturningVisit: false, hasChanges: false },
        sectionSet('result_hero', 'distribution_detailed', 'allocation'),
      ),
    ).toEqual(['result_hero', 'distribution_detailed', 'allocation']);
  });

  it('returns returning-visit order with changes when all sections are available', () => {
    expect(
      getDashboardSectionOrder(
        { isReturningVisit: true, hasChanges: true },
        sectionSet(
          'what_changed',
          'result_hero',
          'distribution_detailed',
          'reported_merit_outcomes',
          'group_progress',
          'allocation',
        ),
      ),
    ).toEqual([
      'what_changed',
      'result_hero',
      'distribution_detailed',
      'reported_merit_outcomes',
      'group_progress',
      'allocation',
    ]);
  });

  it('returns returning-visit order without changes', () => {
    expect(
      getDashboardSectionOrder(
        { isReturningVisit: true, hasChanges: false },
        sectionSet('result_hero', 'distribution_detailed', 'group_progress', 'allocation'),
      ),
    ).toEqual(['result_hero', 'distribution_detailed', 'group_progress', 'allocation']);
  });

  it('excludes unavailable sections instead of rendering empty placeholders', () => {
    expect(
      getDashboardSectionOrder(
        { isReturningVisit: false, hasChanges: false },
        sectionSet('result_hero', 'allocation'),
      ),
    ).toEqual(['result_hero', 'allocation']);

    expect(
      getDashboardSectionOrder(
        { isReturningVisit: true, hasChanges: true },
        sectionSet('what_changed', 'result_hero', 'group_progress'),
      ),
    ).toEqual(['what_changed', 'result_hero', 'group_progress']);
  });
});
