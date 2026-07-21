import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from './lib/api-client';

const api = vi.hoisted(() => ({
  getCurrentResponse: vi.fn(),
}));

vi.mock('./lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/api-client')>()),
  ...api,
}));

vi.mock('./lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/telegram')>();
  return {
    ...actual,
    initializeTelegramWebApp: vi.fn(),
    getTelegramInitData: vi.fn(() => 'signed-init-data'),
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
    expect(await screen.findByText('Porównaj swoją aplikację z innymi kandydatami')).toBeInTheDocument();
    act(() => root.unmount());
  });
});
