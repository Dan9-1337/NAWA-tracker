import { useState } from 'react';
import { countryCodes, type CountryCode } from '../../shared/countries';
import { useI18n } from '../i18n/context';

type CountrySelectProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowLegacy?: boolean;
};

export function CountrySelect({ id, label, value, onChange, allowLegacy = true }: CountrySelectProps) {
  const { t } = useI18n();
  const known = (countryCodes as readonly string[]).includes(value);
  const showLegacy = allowLegacy && value.length > 0 && !known;

  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <select
        id={id}
        aria-label={label}
        className="w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-[var(--tg-theme-text-color)]"
        value={known ? value : showLegacy ? '__legacy__' : ''}
        onChange={(event) => {
          const next = event.target.value;
          if (next === '__legacy__') return;
          onChange(next);
        }}
      >
        <option value="" disabled>
          {t.countries.placeholder}
        </option>
        {showLegacy ? (
          <option value="__legacy__" disabled>
            {value}
          </option>
        ) : null}
        {countryCodes.map((code) => (
          <option key={code} value={code}>
            {t.countries[code as CountryCode]}
          </option>
        ))}
      </select>
    </label>
  );
}
