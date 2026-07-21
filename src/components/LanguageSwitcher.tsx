import { useI18n } from '../i18n/context';
import type { Locale } from '../i18n/types';

const localeOrder: Locale[] = ['pl', 'en', 'ru'];

const localeCodes: Record<Locale, string> = {
  pl: 'PL',
  en: 'EN',
  ru: 'RU',
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="inline-flex h-9 items-stretch overflow-hidden rounded-full border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)]"
      role="group"
      aria-label={t.language.label}
    >
      {localeOrder.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={`min-w-[2.25rem] px-2 text-xs font-semibold tracking-wide transition ${
              active
                ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'
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
