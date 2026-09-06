import { getTelegramWebApp, type TelegramThemeParams } from './telegram';

export const THEME_STORAGE_KEY = 'nawa-theme';

export type ThemePreference = 'light' | 'dark';

type TypographyTokens = {
  secondary: string;
  helper: string;
  disabled: string;
};

export type SemanticColors = {
  accent: string;
  median: string;
  positive: string;
  reliability: string;
};

/** Catppuccin Latte — light surfaces with calm graphite cards. */
export const LIGHT_THEME: TelegramThemeParams = {
  bg_color: '#eff1f5',
  text_color: '#4c4f69',
  hint_color: '#8c8fa1',
  link_color: '#04a5e5',
  button_color: '#04a5e5',
  button_text_color: '#ffffff',
  secondary_bg_color: '#e6e9ef',
  section_bg_color: '#dce0e8',
  subtitle_text_color: '#5c5f77',
  destructive_text_color: '#d20f39',
};

export const LIGHT_TYPOGRAPHY: TypographyTokens = {
  secondary: '#5c5f77',
  helper: '#6c6f85',
  disabled: '#8c8fa1',
};

export const LIGHT_SEMANTIC: SemanticColors = {
  accent: '#04a5e5',
  median: '#8839ef',
  positive: '#5a8f5c',
  reliability: '#df8e1d',
};

/** Catppuccin Mocha — dark purple base with atmospheric washes. */
export const DARK_THEME: TelegramThemeParams = {
  bg_color: '#1e1e2e',
  text_color: '#cdd6f4',
  hint_color: '#7f849c',
  link_color: '#89dceb',
  button_color: '#89dceb',
  button_text_color: '#11111b',
  secondary_bg_color: '#313244',
  section_bg_color: '#313244',
  subtitle_text_color: '#bac2de',
  header_bg_color: '#181825',
  destructive_text_color: '#f38ba8',
};

export const DARK_TYPOGRAPHY: TypographyTokens = {
  secondary: '#bac2de',
  helper: '#a6adc8',
  disabled: '#7f849c',
};

export const DARK_SEMANTIC: SemanticColors = {
  accent: '#89dceb',
  median: '#cba6f7',
  positive: '#94b894',
  reliability: '#f9e2af',
};

export const THEME_PALETTES = {
  light: { theme: LIGHT_THEME, typography: LIGHT_TYPOGRAPHY, semantic: LIGHT_SEMANTIC },
  dark: { theme: DARK_THEME, typography: DARK_TYPOGRAPHY, semantic: DARK_SEMANTIC },
} as const;

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
  setCssVar('--color-median', semantic.median);
  setCssVar('--color-positive', semantic.positive);
  setCssVar('--color-reliability', semantic.reliability);
  setCssVar('--tg-theme-success-text-color', semantic.positive);
}

export function applyTelegramTheme(params: TelegramThemeParams = {}): void {
  const preference = getStoredThemePreference();
  const base = resolveBaseTheme(preference, params);
  const merged = preference ? { ...base } : { ...base, ...params };
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
  setCssVar('--tg-theme-accent-text-color', theme.accent_text_color ?? semantic.accent);
  setCssVar('--tg-theme-destructive-text-color', theme.destructive_text_color ?? '#e53935');
  setCssVar('--text-primary', theme.text_color);
  setCssVar('--text-secondary', typography.secondary);
  setCssVar('--text-helper', typography.helper);
  setCssVar('--text-disabled', typography.disabled);
  setCssVar('--section-divider-color', dark ? 'rgba(205, 214, 244, 0.12)' : 'rgba(76, 79, 105, 0.14)');
  applySemanticColors(semantic);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
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
