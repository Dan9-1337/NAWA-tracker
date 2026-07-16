import { useI18n } from '../i18n/context';
import type { Locale } from '../i18n/types';

const localeOrder: Locale[] = ['pl', 'en', 'ru'];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t.language.label}</span>
      <div
        className="inline-flex rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm"
        role="group"
        aria-label={t.language.label}
      >
        {localeOrder.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
