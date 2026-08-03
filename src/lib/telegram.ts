import WebApp from '@twa-dev/sdk';

export type ColorScheme = 'light' | 'dark';

export type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
};

export type StoryShareParams = {
  text?: string;
  widgetLink?: {
    url: string;
    name?: string;
  };
};

export type TelegramWebAppBridge = {
  initData: string;
  isTelegram: boolean;
  ready: () => void;
  expand: () => void;
  colorScheme: ColorScheme;
  themeParams: TelegramThemeParams;
  viewportStableHeight: number;
  mainButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  secondaryButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  backButton: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  haptic: {
    selection: () => void;
    impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type: 'error' | 'success' | 'warning') => void;
  };
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onThemeChanged: (handler: () => void) => void;
  offThemeChanged: (handler: () => void) => void;
  applyChromeColors: () => void;
  shareToStory: (mediaUrl: string, params?: StoryShareParams) => void;
};

type ClickHandler = () => void;

const noop = () => undefined;

const devMainHandlers = new Set<ClickHandler>();
const devSecondaryHandlers = new Set<ClickHandler>();
const devBackHandlers = new Set<ClickHandler>();
const themeChangedHandlers = new Set<ClickHandler>();

let devMainText = '';
let devMainVisible = false;
let devMainEnabled = true;
let devMainProgress = false;
let devSecondaryText = '';
let devSecondaryVisible = false;
let devSecondaryEnabled = true;
let devBackVisible = false;

function createDevBridge(initData: string): TelegramWebAppBridge {
  return {
    initData,
    isTelegram: false,
    ready: noop,
    expand: noop,
    colorScheme: 'light',
    themeParams: {},
    viewportStableHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    mainButton: {
      setText: (text) => {
        devMainText = text;
      },
      show: () => {
        devMainVisible = true;
      },
      hide: () => {
        devMainVisible = false;
      },
      enable: () => {
        devMainEnabled = true;
      },
      disable: () => {
        devMainEnabled = false;
      },
      showProgress: () => {
        devMainProgress = true;
      },
      hideProgress: () => {
        devMainProgress = false;
      },
      onClick: (handler) => {
        devMainHandlers.add(handler);
      },
      offClick: (handler) => {
        devMainHandlers.delete(handler);
      },
    },
    secondaryButton: {
      setText: (text) => {
        devSecondaryText = text;
      },
      show: () => {
        devSecondaryVisible = true;
      },
      hide: () => {
        devSecondaryVisible = false;
      },
      enable: () => {
        devSecondaryEnabled = true;
      },
      disable: () => {
        devSecondaryEnabled = false;
      },
      onClick: (handler) => {
        devSecondaryHandlers.add(handler);
      },
      offClick: (handler) => {
        devSecondaryHandlers.delete(handler);
      },
    },
    backButton: {
      show: () => {
        devBackVisible = true;
      },
      hide: () => {
        devBackVisible = false;
      },
      onClick: (handler) => {
        devBackHandlers.add(handler);
      },
      offClick: (handler) => {
        devBackHandlers.delete(handler);
      },
    },
    haptic: {
      selection: noop,
      impact: noop,
      notification: noop,
    },
    enableClosingConfirmation: noop,
    disableClosingConfirmation: noop,
    onThemeChanged: (handler) => {
      themeChangedHandlers.add(handler);
    },
    offThemeChanged: (handler) => {
      themeChangedHandlers.delete(handler);
    },
    applyChromeColors: noop,
    shareToStory: (mediaUrl, params) => {
      if (import.meta.env.DEV) {
        console.info('[dev] shareToStory', mediaUrl, params);
      }
    },
  };
}

function createTelegramBridge(initData: string): TelegramWebAppBridge {
  const scheme: ColorScheme = WebApp.colorScheme === 'dark' ? 'dark' : 'light';

  return {
    initData,
    isTelegram: true,
    ready: () => WebApp.ready(),
    expand: () => WebApp.expand(),
    colorScheme: scheme,
    themeParams: { ...WebApp.themeParams },
    viewportStableHeight: WebApp.viewportStableHeight || window.innerHeight,
    mainButton: {
      setText: (text) => WebApp.MainButton.setText(text),
      show: () => WebApp.MainButton.show(),
      hide: () => WebApp.MainButton.hide(),
      enable: () => WebApp.MainButton.enable(),
      disable: () => WebApp.MainButton.disable(),
      showProgress: (leaveActive) => WebApp.MainButton.showProgress(leaveActive),
      hideProgress: () => WebApp.MainButton.hideProgress(),
      onClick: (handler) => WebApp.MainButton.onClick(handler),
      offClick: (handler) => WebApp.MainButton.offClick(handler),
    },
    secondaryButton: {
      setText: (text) => WebApp.SecondaryButton.setText(text),
      show: () => WebApp.SecondaryButton.show(),
      hide: () => WebApp.SecondaryButton.hide(),
      enable: () => WebApp.SecondaryButton.enable(),
      disable: () => WebApp.SecondaryButton.disable(),
      onClick: (handler) => WebApp.SecondaryButton.onClick(handler),
      offClick: (handler) => WebApp.SecondaryButton.offClick(handler),
    },
    backButton: {
      show: () => WebApp.BackButton.show(),
      hide: () => WebApp.BackButton.hide(),
      onClick: (handler) => WebApp.BackButton.onClick(handler),
      offClick: (handler) => WebApp.BackButton.offClick(handler),
    },
    haptic: {
      selection: () => WebApp.HapticFeedback.selectionChanged(),
      impact: (style = 'light') => WebApp.HapticFeedback.impactOccurred(style),
      notification: (type) => WebApp.HapticFeedback.notificationOccurred(type),
    },
    enableClosingConfirmation: () => WebApp.enableClosingConfirmation(),
    disableClosingConfirmation: () => WebApp.disableClosingConfirmation(),
    onThemeChanged: (handler) => WebApp.onEvent('themeChanged', handler),
    offThemeChanged: (handler) => WebApp.offEvent('themeChanged', handler),
    applyChromeColors: () => {
      const bg = WebApp.themeParams.bg_color;
      const header = WebApp.themeParams.header_bg_color ?? bg;
      if (bg) WebApp.setBackgroundColor(bg);
      if (header) WebApp.setHeaderColor(header);
    },
    shareToStory: (mediaUrl, params) => {
      const webApp = WebApp as typeof WebApp & {
        shareToStory?: (url: string, storyParams?: { text?: string; widget_link?: { url: string; name?: string } }) => void;
      };
      if (typeof webApp.shareToStory !== 'function') return;
      webApp.shareToStory(mediaUrl, {
        text: params?.text,
        widget_link: params?.widgetLink
          ? { url: params.widgetLink.url, name: params.widgetLink.name }
          : undefined,
      });
    },
  };
}

function resolveBridge(): TelegramWebAppBridge | null {
  const initData = WebApp.initData?.trim() ?? '';
  if (initData.length > 0) return createTelegramBridge(initData);

  const devInitData = import.meta.env.VITE_TELEGRAM_DEV_INIT_DATA?.trim();
  if (import.meta.env.DEV && devInitData) return createDevBridge(devInitData);

  return null;
}

const bridge = resolveBridge();

export function createDevTelegramWebApp(initData: string): TelegramWebAppBridge {
  return createDevBridge(initData);
}

export function getTelegramWebApp(): TelegramWebAppBridge | null {
  return bridge;
}

export function getTelegramInitData(): string | null {
  return bridge?.initData ?? null;
}

export function getTelegramUserId(): string | null {
  const initData = getTelegramInitData();
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get('user');
    if (!userRaw) return null;
    const parsed: unknown = JSON.parse(userRaw);
    if (parsed != null && typeof parsed === 'object' && 'id' in parsed) {
      const id = (parsed as { id: unknown }).id;
      if (typeof id === 'number' || typeof id === 'string') return String(id);
    }
    return null;
  } catch {
    return null;
  }
}

export function initializeTelegramWebApp(): void {
  bridge?.ready();
  bridge?.expand();
  bridge?.applyChromeColors();
}

export function getDevChromeState() {
  return {
    mainText: devMainText,
    mainVisible: devMainVisible,
    mainEnabled: devMainEnabled,
    mainProgress: devMainProgress,
    secondaryText: devSecondaryText,
    secondaryVisible: devSecondaryVisible,
    secondaryEnabled: devSecondaryEnabled,
    backVisible: devBackVisible,
    triggerMain: () => devMainHandlers.forEach((handler) => handler()),
    triggerSecondary: () => devSecondaryHandlers.forEach((handler) => handler()),
    triggerBack: () => devBackHandlers.forEach((handler) => handler()),
  };
}
