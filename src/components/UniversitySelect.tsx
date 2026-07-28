import { useMemo } from 'react';
import type { ScholarshipTrack } from '../../shared/contracts';
import { universitiesForScholarshipTrack } from '../../shared/universities';
import { useI18n } from '../i18n/context';
import { SearchableSelect } from './SearchableSelect';

type UniversitySelectProps = {
  id?: string;
  label: string;
  hint?: string;
  scholarshipTrack: ScholarshipTrack;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function UniversitySelect({
  id,
  label,
  hint,
  scholarshipTrack,
  value,
  onChange,
  error,
}: UniversitySelectProps) {
  const { t } = useI18n();
  const options = useMemo(
    () =>
      universitiesForScholarshipTrack(scholarshipTrack).map((university) => ({
        value: university.id,
        label: university.name,
      })),
    [scholarshipTrack],
  );

  return (
    <SearchableSelect
      id={id}
      label={label}
      hint={hint}
      value={value}
      placeholder={t.universities.placeholder}
      searchPlaceholder={t.universities.searchPlaceholder}
      options={options}
      onChange={onChange}
      error={error}
    />
  );
}
