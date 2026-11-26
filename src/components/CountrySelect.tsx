import { useId, useMemo, useRef, useState } from 'react';
import { countryCodes, getCountryDisplayName, popularCountryCodes } from '../../shared/countries';
import { useI18n } from '../i18n/context';
import { getCountrySearchNames } from '../lib/country-label';
import { CountryFlag } from './CountryFlag';
import { CountrySheet, type CountrySheetOption } from './CountrySheet';

type CountrySelectProps = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function CountrySelect({ id, label, hint, value, onChange, error }: CountrySelectProps) {
  const { t, locale } = useI18n();
  const autoId = useId();
  const controlId = id ?? autoId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Popular countries first, in their own order, then everyone else alphabetically in the current language.
  const options = useMemo<CountrySheetOption[]>(() => {
    const popularOrder = new Map<string, number>(popularCountryCodes.map((code, index) => [code, index]));

    return countryCodes
      .map((code) => ({
        value: code,
        label: getCountryDisplayName(code, locale) ?? code,
        aliases: getCountrySearchNames(code),
        popular: popularOrder.has(code),
      }))
      .sort((a, b) => {
        const aPopular = popularOrder.get(a.value);
        const bPopular = popularOrder.get(b.value);
        if (aPopular != null && bPopular != null) return aPopular - bPopular;
        if (aPopular != null) return -1;
        if (bPopular != null) return 1;
        return a.label.localeCompare(b.label, locale);
      });
  }, [locale]);

  const selected = options.find((option) => option.value === value);

  return (
    <div className="space-y-2 text-sm font-medium">
      <label htmlFor={controlId}>{label}</label>
      {hint ? <p className="text-sm font-normal text-[var(--tg-theme-subtitle-text-color)]">{hint}</p> : null}

      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-left text-base ${
          error ? 'border-[var(--tg-theme-destructive-text-color)]' : 'border-[var(--tg-theme-hint-color)]'
        }`}
        onClick={() => setOpen(true)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          {selected ? (
            <span className="shrink-0">
              <CountryFlag code={selected.value} size={20} />
            </span>
          ) : null}
          <span
            className={`truncate ${
              selected ? 'text-[var(--tg-theme-text-color)]' : 'text-[var(--tg-theme-subtitle-text-color)]'
            }`}
          >
            {selected?.label || t.countries.placeholder}
          </span>
        </span>
        <span className="shrink-0 text-[var(--tg-theme-hint-color)]" aria-hidden="true">
          ▾
        </span>
      </button>

      {error ? (
        <p className="text-sm font-normal text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {error}
        </p>
      ) : null}

      {open ? (
        <CountrySheet
          title={label}
          value={value}
          options={options}
          returnFocusRef={triggerRef}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
