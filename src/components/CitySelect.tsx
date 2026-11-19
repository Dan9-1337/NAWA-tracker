import { useMemo } from 'react';
import { OTHER_CITY, prepCourseCities } from '../../shared/prep-course-cities';
import { useI18n } from '../i18n/context';
import { normalizeSearchText } from '../../shared/university-search/normalize';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

type CitySelectProps = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (city: string) => void;
};

/** Picker for the preparatory-course city (curated list plus "other"; see shared/prep-course-cities.ts). */
export function CitySelect({ id, label, hint, value, onChange }: CitySelectProps) {
  const { t } = useI18n();

  const options = useMemo<SearchableSelectOption[]>(
    () => [
      ...prepCourseCities.map((city) => ({ value: city, label: city })),
      { value: OTHER_CITY, label: t.cities.other },
    ],
    [t.cities.other],
  );

  return (
    <SearchableSelect
      id={id}
      label={label}
      hint={hint}
      value={value}
      placeholder={t.cities.placeholder}
      searchPlaceholder={t.cities.searchPlaceholder}
      options={options}
      matchesQuery={(option, query) => normalizeSearchText(option.label).includes(normalizeSearchText(query))}
      onChange={onChange}
    />
  );
}
