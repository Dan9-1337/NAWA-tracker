import type { Messages } from '../../i18n/types';

export type SettingsView = 'menu' | 'data' | 'privacy' | 'language' | 'appearance' | 'help' | 'about';

/** Title shown in the sheet header for each view. */
export function settingsViewTitle(view: SettingsView, t: Messages): string {
  const titles: Record<SettingsView, string> = {
    menu: t.settings.title,
    data: t.settings.viewData,
    privacy: t.settings.privacyPolicy,
    language: t.settings.language,
    appearance: t.settings.appearance,
    help: t.settings.help,
    about: t.about.title,
  };
  return titles[view];
}
