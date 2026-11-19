import { describe, expect, it, vi } from 'vitest';
import { pl } from '../i18n/pl';
import { buildDashboardChrome, type DashboardChromeInput } from './dashboard-chrome';

function input(overrides: Partial<DashboardChromeInput> = {}): DashboardChromeInput {
  return {
    t: pl,
    tab: 'score',
    disabled: false,
    pending: false,
    statusDirty: false,
    canReportStatus: true,
    statusEditorOpen: false,
    seasonYear: 2026,
    actions: {
      submitStatus: vi.fn(),
      openStatusEditor: vi.fn(),
      showOutcomes: vi.fn(),
      openOfficialSystem: vi.fn(),
    },
    ...overrides,
  };
}

describe('buildDashboardChrome', () => {
  it('score tab offers the comparison with the season outcomes', () => {
    const config = buildDashboardChrome(input());

    expect(config.main?.text).toBe(pl.scoreScreen.compareCta('2026'));
    config.main?.onClick?.();
    expect(config.closingConfirmation).toBe(false);
  });

  it('outcomes tab offers to report an outcome while nothing is unsaved', () => {
    const base = input({ tab: 'outcomes' });
    const config = buildDashboardChrome(base);

    expect(config.main?.text).toBe(pl.outcomes.reportCta);
    config.main?.onClick?.();
    expect(base.actions.openStatusEditor).toHaveBeenCalledOnce();
  });

  it('outcomes tab becomes a save button, with a closing confirmation, once the status is edited', () => {
    const base = input({ tab: 'outcomes', statusDirty: true, statusEditorOpen: true });
    const config = buildDashboardChrome(base);

    expect(config.main).toMatchObject({ text: pl.form.submitUpdate, enabled: true, loading: false });
    expect(config.closingConfirmation).toBe(true);
    config.main?.onClick?.();
    expect(base.actions.submitStatus).toHaveBeenCalledOnce();
  });

  it('disables the save button while pending or when the dashboard is disabled', () => {
    expect(buildDashboardChrome(input({ tab: 'outcomes', statusDirty: true, pending: true })).main).toMatchObject({
      enabled: false,
      loading: true,
    });
    expect(buildDashboardChrome(input({ tab: 'outcomes', statusDirty: true, disabled: true })).main?.enabled).toBe(false);
  });

  it('shows no button on the outcomes tab when there is nothing to report or the editor is already open', () => {
    expect(buildDashboardChrome(input({ tab: 'outcomes', canReportStatus: false }))).toEqual({});
    expect(buildDashboardChrome(input({ tab: 'outcomes', statusEditorOpen: true }))).toEqual({});
  });

  it('season tab links to the official NAWA system', () => {
    const base = input({ tab: 'season', statusDirty: true });
    const config = buildDashboardChrome(base);

    expect(config.main?.text).toBe(pl.season.officialCta);
    expect(config.closingConfirmation).toBe(true);
    config.main?.onClick?.();
    expect(base.actions.openOfficialSystem).toHaveBeenCalledOnce();
  });
});
