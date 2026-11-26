import { describe, expect, it } from 'vitest';
import { messages, localeOrder } from '../../i18n';
import { settingsViewTitle, type SettingsView } from './settings-view';

const views: SettingsView[] = ['menu', 'data', 'privacy', 'language', 'appearance', 'help', 'about'];

describe('settingsViewTitle', () => {
  it.each(localeOrder)('gives every view a non-empty title in %s', (locale) => {
    for (const view of views) {
      expect(settingsViewTitle(view, messages[locale]).trim(), `${locale}/${view}`).not.toBe('');
    }
  });

  it('titles the menu "Settings" and the sub-views with their own section names', () => {
    const t = messages.en;
    expect(settingsViewTitle('menu', t)).toBe(t.settings.title);
    expect(settingsViewTitle('privacy', t)).toBe(t.settings.privacyPolicy);
    expect(settingsViewTitle('about', t)).toBe(t.about.title);
  });
});
