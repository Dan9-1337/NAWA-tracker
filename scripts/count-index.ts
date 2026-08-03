import { universities, enrichUniversities } from '../shared/universities';
import { buildUniversitySearchIndex } from '../shared/university-search/index';
import { generateSearchAliases } from '../shared/university-search/generated-aliases';

const enriched = enrichUniversities(universities);
let generatedStrings = 0;
for (const u of enriched) generatedStrings += generateSearchAliases(u).length;

const index = buildUniversitySearchIndex(enriched);
const indexTerms = index.reduce((sum, e) => sum + e.terms.length, 0);
const byField: Record<string, number> = {};
for (const entry of index) {
  for (const term of entry.terms) {
    byField[term.field] = (byField[term.field] ?? 0) + 1;
  }
}

console.log(`Generated alias strings (runtime): ${generatedStrings}`);
console.log(`Search index unique normalized terms: ${indexTerms}`);
console.log(`Average terms per school: ${(indexTerms / universities.length).toFixed(1)}`);
console.log('By field:', byField);
