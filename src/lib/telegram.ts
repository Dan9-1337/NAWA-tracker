import WebApp from '@twa-dev/sdk';

export type TelegramWebAppBridge = {
  initData: string;
  ready: () => void;
  expand: () => void;
};

function resolveBridge(): TelegramWebAppBridge | null {
  const initData = WebApp.initData?.trim() ?? '';
  if (initData.length > 0) {
    return {
      initData,
      ready: () => WebApp.ready(),
      expand: () => WebApp.expand(),
    };
  }

  const devInitData = import.meta.env.VITE_TELEGRAM_DEV_INIT_DATA?.trim();
  if (import.meta.env.DEV && devInitData) {
    return {
      initData: devInitData,
      ready: () => undefined,
      expand: () => undefined,
    };
  }

  return null;
}

const bridge = resolveBridge();

export function getTelegramWebApp(): TelegramWebAppBridge | null {
  return bridge;
}

export function getTelegramInitData(): string | null {
  return bridge?.initData ?? null;
}

export function initializeTelegramWebApp(): void {
  bridge?.ready();
  bridge?.expand();
}
