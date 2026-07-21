import { getTelegramWebApp, type TelegramThemeParams } from './telegram';

export const THEME_STORAGE_KEY = 'nawa-theme';

export type ThemePreference = 'light' | 'dark';

type TypographyTokens = {
  secondary: string;
  helper: string;
  disabled: string;
};

const LIGHT_THEME: TelegramThemeParams = {
  bg_color: '#ffffff',
  text_color: '#000000',
  hint_color: '#6b7280',
  link_color: '#2481cc',
  button_color: '#2481cc',
  button_text_color: '#ffffff',
  secondary_bg_color: '#f4f4f5',
  section_bg_color: '#ffffff',
  subtitle_text_color: '#2d3236',
  destructive_text_color: '#e53935',
};

const LIGHT_TYPOGRAPHY: TypographyTokens = {
  secondary: '#2d3236',
  helper: '#4a5158',
  disabled: '#6b7280',
};

const LIGHT_SUCCESS_COLOR = '#2e7d32';
const DARK_SUCCESS_COLOR = '#4caf50';

const DARK_THEME: TelegramThemeParams = {
  bg_color: '#18222d',
  text_color: '#ffffff',
  hint_color: '#7d91a8',
  link_color: '#6ab2f2',
  button_color: '#5288c1',
  button_text_color: '#ffffff',
  secondary_bg_color: '#232e3c',
  section_bg_color: '#232e3c',
  subtitle_text_color: '#e8eef4',
  header_bg_color: '#18222d',
  destructive_text_color: '#ff6b6b',
};

const DARK_TYPOGRAPHY: TypographyTokens = {
  secondary: '#e8eef4',
  helper: '#b8c9d9',
  disabled: '#7d91a8',
};

function setCssVar(name: string, value: string | undefined) {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: Number.parseInt(normalized[0] + normalized[0], 16),
      g: Number.parseInt(normalized[1] + normalized[1], 16),
      b: Number.parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

export function isDarkBackground(color: string | undefined): boolean {
  if (!color) return false;
  const rgb = parseHexColor(color);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.45;
}

function typographyForTheme(theme: TelegramThemeParams): TypographyTokens {
  return isDarkBackground(theme.bg_color) ? DARK_TYPOGRAPHY : LIGHT_TYPOGRAPHY;
}

function resolveBaseTheme(preference: ThemePreference | null, params: TelegramThemeParams): TelegramThemeParams {
  if (preference === 'dark') return DARK_THEME;
  if (preference === 'light') return LIGHT_THEME;
  return isDarkBackground(params.bg_color) ? DARK_THEME : LIGHT_THEME;
}

function withReadableTextColors(theme: TelegramThemeParams, typography: TypographyTokens): TelegramThemeParams {
  return {
    ...theme,
    subtitle_text_color: typography.secondary,
    hint_color: typography.disabled,
  };
}

export function applyTelegramTheme(params: TelegramThemeParams = {}): void {
  const preference = getStoredThemePreference();
  const base = resolveBaseTheme(preference, params);
  const merged = preference ? { ...base } : { ...base, ...params };
  const typography = typographyForTheme(merged);
  const theme = withReadableTextColors(merged, typography);

  setCssVar('--tg-theme-bg-color', theme.bg_color);
  setCssVar('--tg-theme-text-color', theme.text_color);
  setCssVar('--tg-theme-hint-color', theme.hint_color);
  setCssVar('--tg-theme-link-color', theme.link_color);
  setCssVar('--tg-theme-button-color', theme.button_color);
  setCssVar('--tg-theme-button-text-color', theme.button_text_color);
  setCssVar('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
  setCssVar('--tg-theme-section-bg-color', theme.section_bg_color);
  setCssVar('--tg-theme-subtitle-text-color', theme.subtitle_text_color);
  setCssVar('--tg-theme-header-bg-color', theme.header_bg_color ?? theme.bg_color);
  setCssVar('--tg-theme-accent-text-color', theme.accent_text_color ?? theme.link_color);
  setCssVar('--tg-theme-destructive-text-color', theme.destructive_text_color ?? '#e53935');
  setCssVar('--text-primary', theme.text_color);
  setCssVar('--text-secondary', typography.secondary);
  setCssVar('--text-helper', typography.helper);
  setCssVar('--text-disabled', typography.disabled);
  setCssVar(
    '--tg-theme-success-text-color',
    isDarkBackground(theme.bg_color) ? DARK_SUCCESS_COLOR : LIGHT_SUCCESS_COLOR,
  );
  setCssVar(
    '--section-divider-color',
    isDarkBackground(theme.bg_color) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
  );
  document.documentElement.style.colorScheme = isDarkBackground(theme.bg_color) ? 'dark' : 'light';
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
