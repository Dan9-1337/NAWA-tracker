import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TelegramWebAppBridge } from './lib/telegram';
import { ApiClientError } from './lib/api-client';

const telegramTestState = vi.hoisted(() => ({
  webApp: null as TelegramWebAppBridge | null,
  initData: 'user=%7B%22id%22%3A900000001%7D',
}));

const api = vi.hoisted(() => ({
  getCurrentResponse: vi.fn(),
}));

vi.mock('./lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/api-client')>()),
  ...api,
}));

vi.mock('./lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/telegram')>();
  telegramTestState.webApp = actual.createDevTelegramWebApp(telegramTestState.initData);
  return {
    ...actual,
    initializeTelegramWebApp: vi.fn(),
    getTelegramInitData: vi.fn(() => 'signed-init-data'),
    getTelegramWebApp: vi.fn(() => telegramTestState.webApp),
  };
});

describe('bootstrapApplication', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    api.getCurrentResponse.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('initializes Telegram WebApp and probes the current profile', async () => {
    api.getCurrentResponse.mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', 'unauthorized'));
    const { bootstrapApplication } = await import('./bootstrap');
    const { initializeTelegramWebApp } = await import('./lib/telegram');
    let root!: ReturnType<typeof bootstrapApplication>;

    act(() => {
      root = bootstrapApplication(document.getElementById('root')!);
    });

    expect(initializeTelegramWebApp).toHaveBeenCalled();
    expect(await screen.findByText('Gdzie jesteś wśród kandydatów NAWA?')).toBeInTheDocument();
    act(() => root.unmount());
  });
});
