import { useMemo, useState } from 'react';
import { countryCodes, type CountryCode } from '../../shared/countries';
import { useI18n } from '../i18n/context';

const popularCountryCodes: CountryCode[] = ['UA', 'BY', 'KZ', 'PL', 'RU'];

type CountrySelectProps = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
};

export function CountrySelect({ id, label, hint, value, onChange }: CountrySelectProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const known = (countryCodes as readonly string[]).includes(value);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return countryCodes;
    return countryCodes.filter((code) => {
      const name = t.countries[code as CountryCode].toLowerCase();
      return code.toLowerCase().includes(normalized) || name.includes(normalized);
    });
  }, [query, t.countries]);

  const popular = popularCountryCodes.filter((code) => filtered.includes(code));
  const rest = filtered.filter((code) => !popularCountryCodes.includes(code));

  return (
    <div className="space-y-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {hint ? <p className="text-xs font-normal text-[var(--tg-theme-subtitle-text-color)]">{hint}</p> : null}
      <input
        type="search"
        aria-label={t.countries.searchPlaceholder}
        placeholder={t.countries.searchPlaceholder}
        className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-base"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        id={id}
        aria-label={label}
        className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-base text-[var(--tg-theme-text-color)]"
        value={known ? value : ''}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery('');
        }}
      >
        <option value="" disabled>
          {t.countries.placeholder}
        </option>
        {popular.length > 0 ? (
          <optgroup label={t.countries.popular}>
            {popular.map((code) => (
              <option key={code} value={code}>
                {t.countries[code]}
              </option>
            ))}
          </optgroup>
        ) : null}
        {rest.map((code) => (
          <option key={code} value={code}>
            {t.countries[code as CountryCode]}
          </option>
        ))}
      </select>
    </div>
  );
}
