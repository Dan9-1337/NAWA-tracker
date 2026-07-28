import { useMemo } from 'react';
import { countryCodes, type CountryCode } from '../../shared/countries';
import { useI18n } from '../i18n/context';
import { SearchableSelect } from './SearchableSelect';

const popularCountryCodes: CountryCode[] = ['UA', 'BY', 'KZ', 'PL', 'RU'];

type CountrySelectProps = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function CountrySelect({ id, label, hint, value, onChange, error }: CountrySelectProps) {
  const { t } = useI18n();

  const options = useMemo(() => {
    const popular = popularCountryCodes.filter((code) => (countryCodes as readonly string[]).includes(code));
    const rest = countryCodes.filter((code) => !popularCountryCodes.includes(code));
    return [
      ...popular.map((code) => ({
        value: code,
        label: t.countries[code],
        group: t.countries.popular,
      })),
      ...rest.map((code) => ({
        value: code,
        label: t.countries[code as CountryCode],
      })),
    ];
  }, [t.countries]);

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
