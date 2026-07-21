import { useI18n } from '../i18n/context';
import type { Locale } from '../i18n/types';

const localeOrder: Locale[] = ['pl', 'en', 'ru'];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t.language.label}</span>
      <div
        className="inline-flex rounded-full border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-1"
        role="group"
        aria-label={t.language.label}
      >
        {localeOrder.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                active
                  ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                  : 'text-[var(--tg-theme-subtitle-text-color)]'
              }`}
              aria-pressed={active}
              onClick={() => setLocale(code)}
            >
              {t.language[code]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
