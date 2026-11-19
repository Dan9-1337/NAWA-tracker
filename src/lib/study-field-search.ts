import { normalizeSearchText } from '../../shared/university-search/normalize';
import {
  narrowGroups,
  narrowGroupOf,
  studyFields,
  type FieldLocale,
  type StudyField,
} from '../../shared/study-fields';

const locales: FieldLocale[] = ['pl', 'en', 'ru', 'uk', 'be'];

/** Everything a person might type for a field: names in every language, Polish keywords, its narrow group. */
function searchableText(field: StudyField): string {
  const names = locales.map((locale) => field.name[locale]);
  const group = narrowGroups[narrowGroupOf(field.code)];
  const groupNames = group ? locales.map((locale) => group[locale]) : [];
  return normalizeSearchText([...names, ...(field.keywords ?? []), ...groupNames].join(' '));
}

const index = studyFields.map((field) => ({ field, text: searchableText(field) }));

/**
 * Fields matching every word of the query (diacritics and case ignored), in catalogue order. An empty query returns
 * every field.
 */
export function searchStudyFields(query: string): StudyField[] {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  if (words.length === 0) return [...studyFields];
  return index.filter(({ text }) => words.every((word) => text.includes(word))).map(({ field }) => field);
}
