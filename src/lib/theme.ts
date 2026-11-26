import { getTelegramWebApp, type TelegramThemeParams } from './telegram';

export const THEME_STORAGE_KEY = 'nawa-theme';

export type ThemePreference = 'light' | 'dark';

type TypographyTokens = {
  secondary: string;
  helper: string;
  disabled: string;
};

export type SemanticColors = {
  /** Tape-yellow fill. Never used as text on the page background. */
  accent: string;
  /** Accent for text and icons: ink on light, tape-yellow on dark. */
  accentInk: string;
  median: string;
  positive: string;
  /** Amber text for a caution such as a score below the group median. */
  warning: string;
  reliability: string;
};

/** Ruler palette (light): paper ground, ink text, tape-yellow accent. */
export const LIGHT_THEME: TelegramThemeParams = {
  bg_color: '#f2f3f0',
  text_color: '#14161a',
  hint_color: '#6b7079',
  link_color: '#14161a',
  button_color: '#14161a',
  button_text_color: '#ffc72c',
  secondary_bg_color: '#ffffff',
  section_bg_color: '#e6e8e2',
  subtitle_text_color: '#555a64',
  destructive_text_color: '#c8102e',
};

export const LIGHT_TYPOGRAPHY: TypographyTokens = {
  secondary: '#555a64',
  helper: '#5f646d',
  disabled: '#6b7079',
};

export const LIGHT_SEMANTIC: SemanticColors = {
  accent: '#ffc72c',
  accentInk: '#14161a',
  median: '#14161a',
  positive: '#1e7a3c',
  warning: '#8a5a00',
  reliability: '#8a5a00',
};

/** Ruler palette (dark): graphite ground, paper text, tape-yellow accent. */
export const DARK_THEME: TelegramThemeParams = {
  bg_color: '#121316',
  text_color: '#f2f3f0',
  hint_color: '#8a9099',
  link_color: '#ffc72c',
  button_color: '#ffc72c',
  button_text_color: '#14161a',
  secondary_bg_color: '#1d1f24',
  section_bg_color: '#272a30',
  subtitle_text_color: '#b4b9c2',
  header_bg_color: '#0c0d0f',
  destructive_text_color: '#ff6b7f',
};

export const DARK_TYPOGRAPHY: TypographyTokens = {
  secondary: '#b4b9c2',
  helper: '#a0a6af',
  disabled: '#8a9099',
};

export const DARK_SEMANTIC: SemanticColors = {
  accent: '#ffc72c',
  accentInk: '#ffc72c',
  median: '#f2f3f0',
  positive: '#7ed957',
  warning: '#ffc72c',
  reliability: '#ffc72c',
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

function semanticForTheme(theme: TelegramThemeParams): SemanticColors {
  return isDarkBackground(theme.bg_color) ? DARK_SEMANTIC : LIGHT_SEMANTIC;
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

function applySemanticColors(semantic: SemanticColors): void {
  setCssVar('--color-accent', semantic.accent);
  setCssVar('--color-accent-ink', semantic.accentInk);
  setCssVar('--color-median', semantic.median);
  setCssVar('--color-positive', semantic.positive);
  setCssVar('--color-warning', semantic.warning);
  setCssVar('--color-reliability', semantic.reliability);
  setCssVar('--tg-theme-success-text-color', semantic.positive);
}

export function applyTelegramTheme(params: TelegramThemeParams = {}): void {
  const preference = getStoredThemePreference();
  const base = resolveBaseTheme(preference, params);
  // The brand palette stays constant; Telegram only supplies the page background and text colours.
  const merged: TelegramThemeParams = preference
    ? { ...base }
    : {
        ...base,
        bg_color: params.bg_color ?? base.bg_color,
        text_color: params.text_color ?? base.text_color,
        header_bg_color: params.header_bg_color ?? base.header_bg_color,
      };
  const typography = typographyForTheme(merged);
  const semantic = semanticForTheme(merged);
  const theme = withReadableTextColors(merged, typography);
  const dark = isDarkBackground(theme.bg_color);

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
  setCssVar('--tg-theme-accent-text-color', theme.accent_text_color ?? semantic.accentInk);
  setCssVar('--tg-theme-destructive-text-color', theme.destructive_text_color ?? '#e53935');
  setCssVar('--text-primary', theme.text_color);
  setCssVar('--text-secondary', typography.secondary);
  setCssVar('--text-helper', typography.helper);
  setCssVar('--text-disabled', typography.disabled);
  setCssVar('--section-divider-color', dark ? 'rgba(242, 243, 240, 0.14)' : 'rgba(20, 22, 26, 0.14)');
  applySemanticColors(semantic);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  // The native main button is always the tape-yellow fill with ink text, on both themes.
  getTelegramWebApp()?.applyChromeColors({
    background: theme.bg_color ?? LIGHT_THEME.bg_color!,
    header: theme.header_bg_color ?? theme.bg_color ?? LIGHT_THEME.bg_color!,
    bottomBar: theme.bg_color ?? LIGHT_THEME.bg_color!,
    mainButton: DARK_THEME.button_color!,
    mainButtonText: DARK_THEME.button_text_color!,
  });
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
  };

  app.onThemeChanged(onThemeChanged);
}
