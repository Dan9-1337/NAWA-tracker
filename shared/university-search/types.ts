import type { University } from '../universities';

export type SearchField =
  | 'shortName'
  | 'alias'
  | 'formerName'
  | 'canonicalName'
  | 'city'
  | 'generated'
  | 'fuzzy';

export type IndexedTerm = {
  normalized: string;
  tokens: readonly string[];
  field: SearchField;
  displayHint?: string;
  raw?: string;
};

export type SearchIndexEntry = {
  university: University;
  terms: readonly IndexedTerm[];
};

export type SearchResult = {
  university: University;
  score: number;
  matchedField: SearchField;
  matchedTerm: string;
  formerNameHint?: string;
  isFuzzy?: boolean;
};
