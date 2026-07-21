import { getTelegramWebApp, type TelegramThemeParams } from './telegram';

export const THEME_STORAGE_KEY = 'nawa-theme';

export type ThemePreference = 'light' | 'dark';

const LIGHT_THEME: TelegramThemeParams = {
  bg_color: '#ffffff',
  text_color: '#000000',
  hint_color: '#999999',
  link_color: '#2481cc',
  button_color: '#2481cc',
  button_text_color: '#ffffff',
  secondary_bg_color: '#f4f4f5',
  section_bg_color: '#ffffff',
  subtitle_text_color: '#707579',
  destructive_text_color: '#e53935',
};

const LIGHT_SUCCESS_COLOR = '#2e7d32';
const DARK_SUCCESS_COLOR = '#4caf50';

const DARK_THEME: TelegramThemeParams = {
  bg_color: '#18222d',
  text_color: '#ffffff',
  hint_color: '#708499',
  link_color: '#6ab2f2',
  button_color: '#5288c1',
  button_text_color: '#ffffff',
  secondary_bg_color: '#232e3c',
  section_bg_color: '#232e3c',
  subtitle_text_color: '#708499',
  header_bg_color: '#18222d',
  destructive_text_color: '#ff6b6b',
};

function setCssVar(name: string, value: string | undefined) {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
}

export function applyTelegramTheme(params: TelegramThemeParams = {}): void {
  const fallback = getStoredThemePreference() === 'dark' ? DARK_THEME : LIGHT_THEME;
  const merged = { ...fallback, ...params };
  setCssVar('--tg-theme-bg-color', merged.bg_color);
  setCssVar('--tg-theme-text-color', merged.text_color);
  setCssVar('--tg-theme-hint-color', merged.hint_color);
  setCssVar('--tg-theme-link-color', merged.link_color);
  setCssVar('--tg-theme-button-color', merged.button_color);
  setCssVar('--tg-theme-button-text-color', merged.button_text_color);
  setCssVar('--tg-theme-secondary-bg-color', merged.secondary_bg_color);
  setCssVar('--tg-theme-section-bg-color', merged.section_bg_color);
  setCssVar('--tg-theme-subtitle-text-color', merged.subtitle_text_color);
  setCssVar('--tg-theme-header-bg-color', merged.header_bg_color ?? merged.bg_color);
  setCssVar('--tg-theme-accent-text-color', merged.accent_text_color ?? merged.link_color);
  setCssVar('--tg-theme-destructive-text-color', merged.destructive_text_color ?? '#e53935');
  setCssVar(
    '--tg-theme-success-text-color',
    merged.bg_color === DARK_THEME.bg_color ? DARK_SUCCESS_COLOR : LIGHT_SUCCESS_COLOR,
  );
  document.documentElement.style.colorScheme = merged.bg_color === DARK_THEME.bg_color ? 'dark' : 'light';
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : null;
}

export function setThemePreference(preference: ThemePreference): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  applyTelegramTheme(preference === 'dark' ? DARK_THEME : LIGHT_THEME);
}

export function initializeTheme(): void {
  const stored = getStoredThemePreference();
  if (stored) {
    applyTelegramTheme(stored === 'dark' ? DARK_THEME : LIGHT_THEME);
    return;
  }

  const app = getTelegramWebApp();
  applyTelegramTheme(app?.themeParams);

  if (!app) return;

  const onThemeChanged = () => {
    if (getStoredThemePreference()) return;
    applyTelegramTheme(app.themeParams);
    app.applyChromeColors();
  };

  app.onThemeChanged(onThemeChanged);
}
