import { useState } from 'react';
import { useI18n } from '../i18n/context';
import { getStoredThemePreference, setThemePreference, type ThemePreference } from '../lib/theme';
import { getTelegramWebApp } from '../lib/telegram';

function resolveTheme(): ThemePreference {
  const stored = getStoredThemePreference();
  if (stored) return stored;
  return getTelegramWebApp()?.colorScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeSwitcher() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemePreference>(resolveTheme);

  function toggle() {
    const next: ThemePreference = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setThemePreference(next);
  }

  return (
    <button
      type="button"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] text-base leading-none transition hover:opacity-80"
      onClick={toggle}
      aria-label={theme === 'light' ? t.theme.switchToDark : t.theme.switchToLight}
      title={theme === 'light' ? t.theme.switchToDark : t.theme.switchToLight}
    >
      <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
    </button>
  );
}
