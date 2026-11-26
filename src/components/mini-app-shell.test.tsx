import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_STORAGE_KEY } from '../i18n';
import { I18nProvider } from '../i18n/context';
import { createDevTelegramWebApp, type TelegramWebAppBridge } from '../lib/telegram';
import { MiniAppShell } from './MiniAppShell';

const telegramTestState = vi.hoisted(() => ({ webApp: null as TelegramWebAppBridge | null }));

vi.mock('../lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/telegram')>();
  return { ...actual, getTelegramWebApp: vi.fn(() => telegramTestState.webApp) };
});

const backLabels = {
  pl: '← Wstecz',
  en: '← Back',
  ru: '← Назад',
  uk: '← Назад',
  be: '← Назад',
} as const;

beforeEach(() => {
  telegramTestState.webApp = createDevTelegramWebApp('user=%7B%22id%22%3A900000001%7D');
});

const onBack = vi.fn();

afterEach(() => {
  telegramTestState.webApp?.backButton.offClick(onBack);
  telegramTestState.webApp?.backButton.hide();
  onBack.mockClear();
});

describe('MiniAppShell dev back button', () => {
  it.each(Object.entries(backLabels))('reads "%s" outside Telegram in the active language (A6)', async (locale, label) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    const user = userEvent.setup();
    telegramTestState.webApp?.backButton.onClick(onBack);
    telegramTestState.webApp?.backButton.show();

    render(
      <I18nProvider>
        <MiniAppShell title="NAWAmeter">content</MiniAppShell>
      </I18nProvider>,
    );

    await user.click(await screen.findByRole('button', { name: label }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders no bar inside Telegram', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    telegramTestState.webApp = { ...createDevTelegramWebApp('x'), isTelegram: true };
    telegramTestState.webApp.backButton.show();

    render(
      <I18nProvider>
        <MiniAppShell title="NAWAmeter">content</MiniAppShell>
      </I18nProvider>,
    );

    expect(screen.queryByRole('button', { name: '← Back' })).not.toBeInTheDocument();
  });
});
