import { useCallback, useMemo } from 'react';
import type { ScholarshipTrack } from '../../shared/contracts';
import { universitySelectionCounts } from '../../shared/universities-metadata';
import { getUniversitySearchIndex } from '../../shared/university-search/index';
import { searchUniversities } from '../../shared/university-search/search';
import { universitiesForScholarshipTrack } from '../../shared/universities';
import {
  formatUniversitySearchResult,
  highlightSearchMatch,
  shouldForceCityOnResults,
} from '../lib/university-search-display';
import { useI18n } from '../i18n/context';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

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

  const trackUniversities = useMemo(
    () => universitiesForScholarshipTrack(scholarshipTrack),
    [scholarshipTrack],
  );

  const searchIndex = useMemo(() => getUniversitySearchIndex(trackUniversities), [trackUniversities]);

  const baseOptions = useMemo(
    () =>
      trackUniversities.map((university) => ({
        value: university.id,
        label: university.name,
        meta: university,
      })),
    [trackUniversities],
  );

  const filterOptions = useCallback(
    (options: readonly SearchableSelectOption[], query: string): SearchableSelectOption[] => {
      const results = searchUniversities(searchIndex, query, {
        enableFuzzy: true,
        selectionCounts: universitySelectionCounts,
      });

      if (!query.trim()) {
        return options.map((option) => ({
          ...option,
          subtitle: trackUniversities.find((u) => u.id === option.value)?.city,
        }));
      }

      const forceCity = shouldForceCityOnResults(results);

      return results.map((result) => {
        const formatted = formatUniversitySearchResult(result, t, {
          isFuzzy: result.isFuzzy,
        });
        const subtitle =
          forceCity && result.university.city
            ? formatted.subtitle ?? result.university.city
            : formatted.subtitle;
        return {
          value: result.university.id,
          label: result.university.name,
          subtitle,
          labelContent: highlightSearchMatch(formatted.label, query),
          meta: result,
        };
      });
    },
    [searchIndex, t, trackUniversities],
  );

  const emptyState = (
    <div className="space-y-2">
      <p>{t.universities.emptyTitle}</p>
      <ul className="list-disc space-y-1 pl-4 text-xs">
        <li>{t.universities.emptyTipAbbreviation}</li>
        <li>{t.universities.emptyTipCity}</li>
        <li>{t.universities.emptyTipFormerName}</li>
      </ul>
      <p className="text-xs">{t.universities.emptySupportHint}</p>
    </div>
  );

  return (
    <SearchableSelect
      id={id}
      label={label}
      hint={hint}
      value={value}
      placeholder={t.universities.placeholder}
      searchPlaceholder={t.universities.searchPlaceholder}
      options={baseOptions}
      filterOptions={filterOptions}
      emptyState={emptyState}
      onChange={onChange}
      error={error}
    />
  );
}
