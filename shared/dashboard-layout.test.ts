import { describe, expect, it } from 'vitest';
import {
  getDashboardSectionOrder,
  resolveDashboardVisitMode,
  type DashboardSectionId,
} from './dashboard-layout';

function sectionSet(...sections: DashboardSectionId[]): Set<DashboardSectionId> {
  return new Set(sections);
}

describe('resolveDashboardVisitMode', () => {
  it('prefers terminal over other modes', () => {
    expect(
      resolveDashboardVisitMode({
        isReturningVisit: true,
        hasChanges: true,
        applicationStatus: 'scholarship_awarded',
        recentlyUpdatedStatus: true,
      }),
    ).toBe('terminal');
  });

  it('returns post_merit after a formal/merit status update', () => {
    expect(
      resolveDashboardVisitMode({
        isReturningVisit: true,
        hasChanges: false,
        applicationStatus: 'formal_review_positive',
        recentlyUpdatedStatus: true,
      }),
    ).toBe('post_merit');
  });

  it('returns first_result when there is no snapshot', () => {
    expect(
      resolveDashboardVisitMode({
        isReturningVisit: false,
        hasChanges: false,
        applicationStatus: 'submitted',
      }),
    ).toBe('first_result');
  });

  it('does not enter returning_with_changes only because a snapshot exists', () => {
    expect(
      resolveDashboardVisitMode({
        isReturningVisit: true,
        hasChanges: false,
        applicationStatus: 'submitted',
      }),
    ).toBe('returning_no_changes');
  });
});

describe('getDashboardSectionOrder', () => {
  it('returns first-visit order when all sections are available', () => {
    expect(
      getDashboardSectionOrder(
        { mode: 'first_result' },
        sectionSet(
          'result_hero',
          'global_benchmark',
          'country_context',
          'cohort_pulse',
          'distribution_detailed',
          'allocation',
        ),
      ),
    ).toEqual([
      'result_hero',
      'global_benchmark',
      'country_context',
      'cohort_pulse',
      'distribution_detailed',
      'allocation',
    ]);
  });

  it('returns returning-visit order with changes when all sections are available', () => {
    expect(
      getDashboardSectionOrder(
        { mode: 'returning_with_changes' },
        sectionSet(
          'what_changed',
          'result_hero',
          'global_benchmark',
          'country_context',
          'cohort_pulse',
          'distribution_detailed',
          'reported_merit_outcomes',
          'group_progress',
          'allocation',
        ),
      ),
    ).toEqual([
      'what_changed',
      'result_hero',
      'global_benchmark',
      'country_context',
      'cohort_pulse',
      'distribution_detailed',
      'reported_merit_outcomes',
      'group_progress',
      'allocation',
    ]);
  });

  it('keeps result hero first in terminal mode and places passport next', () => {
    expect(
      getDashboardSectionOrder(
        { mode: 'terminal' },
        sectionSet(
          'result_hero',
          'nawa_passport',
          'global_benchmark',
          'country_context',
          'cohort_pulse',
        ),
      ),
    ).toEqual([
      'result_hero',
      'nawa_passport',
      'global_benchmark',
      'country_context',
      'cohort_pulse',
    ]);
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
