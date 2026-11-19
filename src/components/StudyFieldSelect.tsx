import { useCallback, useMemo } from 'react';
import {
  narrowGroupOf,
  narrowGroups,
  OTHER_STUDY_FIELD,
  studyFields,
} from '../../shared/study-fields';
import { useI18n } from '../i18n/context';
import { searchStudyFields } from '../lib/study-field-search';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

type StudyFieldSelectProps = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (code: string) => void;
  error?: string | null;
};

/** Search-as-you-type picker for the ISCED-F detailed fields (see shared/study-fields.ts). */
export function StudyFieldSelect({ id, label, hint, value, onChange, error }: StudyFieldSelectProps) {
  const { t, locale } = useI18n();

  const options = useMemo<SearchableSelectOption[]>(
    () => [
      ...studyFields.map((field) => ({
        value: field.code,
        label: field.name[locale],
        subtitle: narrowGroups[narrowGroupOf(field.code)]?.[locale],
      })),
      { value: OTHER_STUDY_FIELD, label: t.studyFields.other },
    ],
    [locale, t.studyFields.other],
  );

  const filterOptions = useCallback(
    (all: readonly SearchableSelectOption[], query: string): SearchableSelectOption[] => {
      if (!query.trim()) return [...all];
      const matched = new Set(searchStudyFields(query).map((field) => field.code));
      return all.filter((option) => matched.has(option.value));
    },
    [],
  );

  return (
    <SearchableSelect
      id={id}
      label={label}
      hint={hint}
      value={value}
      placeholder={t.studyFields.placeholder}
      searchPlaceholder={t.studyFields.searchPlaceholder}
      options={options}
      filterOptions={filterOptions}
      emptyState={<p>{t.studyFields.emptyTitle}</p>}
      onChange={onChange}
      error={error}
    />
  );
}
