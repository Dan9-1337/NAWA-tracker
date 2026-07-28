import { useMemo } from 'react';
import { countryCodes, getCountryDisplayName, popularCountryCodes } from '../../shared/countries';
import { useI18n } from '../i18n/context';
import { CountryFlag } from './CountryFlag';
import { SearchableSelect } from './SearchableSelect';

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

  const options = useMemo(() => {
    const popularOrder = new Map<string, number>(
      popularCountryCodes.map((code, index) => [code, index]),
    );

    return countryCodes
      .map((code) => ({
        value: code,
        label: getCountryDisplayName(code, locale) ?? code,
        group: popularOrder.has(code) ? t.countries.popular : undefined,
        leading: <CountryFlag code={code} size={20} />,
      }))
      .sort((a, b) => {
        const aPopular = popularOrder.get(a.value);
        const bPopular = popularOrder.get(b.value);
        if (aPopular != null && bPopular != null) return aPopular - bPopular;
        if (aPopular != null) return -1;
        if (bPopular != null) return 1;
        return a.label.localeCompare(b.label, locale);
      });
  }, [locale, t.countries.popular]);

  return (
    <SearchableSelect
      id={id}
      label={label}
      hint={hint}
      value={value}
      placeholder={t.countries.placeholder}
      searchPlaceholder={t.countries.searchPlaceholder}
      options={options}
      onChange={onChange}
      error={error}
    />
  );
}
