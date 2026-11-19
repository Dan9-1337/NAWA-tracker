import type { DashboardTab } from '../components/DashboardTabs';
import type { Messages } from '../i18n/types';
import type { MiniAppChromeConfig } from '../lib/useMiniAppChrome';

export type DashboardChromeInput = {
  t: Messages;
  tab: DashboardTab;
  disabled: boolean;
  pending: boolean;
  statusDirty: boolean;
  canReportStatus: boolean;
  statusEditorOpen: boolean;
  seasonYear: number;
  actions: {
    submitStatus: () => void;
    openStatusEditor: () => void;
    showOutcomes: () => void;
    openOfficialSystem: () => void;
  };
};

/** Telegram's native bottom button for the dashboard tabs (the main button changes with the tab and unsaved state). */
export function buildDashboardChrome({
  t,
  tab,
  disabled,
  pending,
  statusDirty,
  canReportStatus,
  statusEditorOpen,
  seasonYear,
  actions,
}: DashboardChromeInput): MiniAppChromeConfig {
  if (tab === 'outcomes') {
    if (statusDirty) {
      return {
        main: {
          text: t.form.submitUpdate,
          visible: true,
          enabled: !disabled && !pending,
          loading: pending,
          onClick: actions.submitStatus,
        },
        closingConfirmation: true,
      };
    }
    if (canReportStatus && !statusEditorOpen) {
      return { main: { text: t.outcomes.reportCta, visible: true, onClick: actions.openStatusEditor } };
    }
    return {};
  }

  if (tab === 'season') {
    return {
      main: { text: t.season.officialCta, visible: true, onClick: actions.openOfficialSystem },
      closingConfirmation: statusDirty,
    };
  }

  return {
    main: { text: t.scoreScreen.compareCta(String(seasonYear)), visible: true, onClick: actions.showOutcomes },
    closingConfirmation: statusDirty,
  };
}
