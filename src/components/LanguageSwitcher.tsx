import { useI18n } from '../i18n/context';
import type { Locale } from '../i18n/types';

const localeOrder: Locale[] = ['pl', 'en', 'ru'];

const localeCodes: Record<Locale, string> = {
  pl: 'PL',
  en: 'EN',
  ru: 'RU',
};

const headerButtonClass =
  'flex h-11 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]';

type LanguageSwitcherProps = {
  fullWidth?: boolean;
};

export function LanguageSwitcher({ fullWidth = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`${fullWidth ? 'flex w-full gap-2' : 'flex items-center gap-2'}`}
      role="group"
      aria-label={t.language.label}
    >
      {localeOrder.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={`${headerButtonClass} ${fullWidth ? 'flex-1' : 'w-11'} ${
              active
                ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)] text-[var(--color-accent)]'
                : 'border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] text-[var(--text-disabled)] hover:bg-[var(--tg-theme-secondary-bg-color)] hover:text-[var(--text-secondary)] active:bg-[var(--tg-theme-secondary-bg-color)]'
            }`}
            aria-pressed={active}
            aria-label={t.language[code]}
            onClick={() => setLocale(code)}
          >
            {localeCodes[code]}
          </button>
        );
      })}
    </div>
  );
}
