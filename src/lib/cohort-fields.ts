import type { ResponseFormInput } from '../../shared/contracts';

export const COHORT_FIELDS = [
  'hasPolishCitizenship',
  'scholarshipTrack',
  'studyRoute',
  'rankingCountry',
  'schoolCountry',
] as const;

export type CohortField = (typeof COHORT_FIELDS)[number];

export function cohortFieldsChanged(before: ResponseFormInput, after: ResponseFormInput): CohortField[] {
  return COHORT_FIELDS.filter((field) => before[field] !== after[field]);
}
