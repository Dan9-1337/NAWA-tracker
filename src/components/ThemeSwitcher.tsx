import { useState } from 'react';
import { MoonIcon, SunIcon } from './icons';
import { useI18n } from '../i18n/context';
import { getStoredThemePreference, setThemePreference, type ThemePreference } from '../lib/theme';
import { getTelegramWebApp } from '../lib/telegram';

function resolveTheme(): ThemePreference {
  const stored = getStoredThemePreference();
  if (stored) return stored;
  return getTelegramWebApp()?.colorScheme === 'dark' ? 'dark' : 'light';
}

type ThemeSwitcherProps = {
  layout?: 'compact' | 'segmented';
};

export function ThemeSwitcher({ layout = 'compact' }: ThemeSwitcherProps) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemePreference>(resolveTheme);

  function select(next: ThemePreference) {
    if (next === theme) return;
    setTheme(next);
    setThemePreference(next);
  }

  if (layout === 'segmented') {
    return (
      <div
        className="flex h-11 w-full items-stretch overflow-hidden rounded-full border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-bg-color)]"
        role="group"
        aria-label={t.settings.appearance}
      >
        <button
          type="button"
          className={`flex flex-1 items-center justify-center transition ${
            theme === 'light'
              ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
              : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'
          }`}
          aria-pressed={theme === 'light'}
          aria-label={t.theme.switchToLight}
          onClick={() => select('light')}
        >
          <SunIcon size={17} />
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center transition ${
            theme === 'dark'
              ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
              : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'
          }`}
          aria-pressed={theme === 'dark'}
          aria-label={t.theme.switchToDark}
          onClick={() => select('dark')}
        >
          <MoonIcon size={17} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] transition hover:opacity-80"
      onClick={() => select(theme === 'light' ? 'dark' : 'light')}
      aria-label={theme === 'light' ? t.theme.switchToDark : t.theme.switchToLight}
      title={theme === 'light' ? t.theme.switchToDark : t.theme.switchToLight}
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
