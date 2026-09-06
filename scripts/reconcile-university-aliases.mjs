import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizeSearchText,
  stripPatronAndCityBoilerplate,
} from './lib/university-normalize.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'shared/data/university-alias-seed-2026.json');
const manualPath = join(root, 'shared/data/university-alias-manual-mappings.json');
const universitiesPath = join(root, 'shared/universities.ts');
const reportPath = join(root, 'shared/data/university-reconcile-report.json');

function parseUniversitiesFromTs(content) {
  const entries = [];
  const re = /\{\s*id:\s*'([^']+)',\s*ministry:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g;
  for (const match of content.matchAll(re)) {
    entries.push({ id: match[1], ministry: match[2], name: match[3] });
  }
  return entries;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function matchSeedToApp(seedRow, appUniversities, manualMappings) {
  if (manualMappings[seedRow.key]) {
    const id = manualMappings[seedRow.key];
    const uni = appUniversities.find((u) => u.id === id);
    return uni ? [uni] : [];
  }

  const canonicalNorm = normalizeSearchText(seedRow.canonicalName);
  const exact = appUniversities.filter((u) => normalizeSearchText(u.name) === canonicalNorm);
  if (exact.length === 1) return exact;
  if (exact.length > 1) return exact;

  const strippedNorm = stripPatronAndCityBoilerplate(seedRow.canonicalName);
  const stripped = appUniversities.filter((u) => stripPatronAndCityBoilerplate(u.name) === strippedNorm);
  if (stripped.length === 1) return stripped;
  if (stripped.length > 1) return stripped;

  return [];
}

export function reconcileUniversityAliases(options = {}) {
  const { check = false, writeReport = false } = options;
  const seed = loadJson(seedPath);
  const manualMappings = loadJson(manualPath);
  const appUniversities = parseUniversitiesFromTs(readFileSync(universitiesPath, 'utf8'));

  const matched = [];
  const ambiguous = [];
  const seedAbsentFromApp = [];
  const appMissingFromSeed = new Set(appUniversities.map((u) => u.id));
  const aliasSourcesByAppId = new Map();

  for (const seedRow of seed) {
    const candidates = matchSeedToApp(seedRow, appUniversities, manualMappings);
    if (candidates.length === 1) {
      const appId = candidates[0].id;
      matched.push({ seedKey: seedRow.key, appId, canonicalName: seedRow.canonicalName });
      appMissingFromSeed.delete(appId);

      const sources = aliasSourcesByAppId.get(appId) ?? [];
      sources.push(seedRow.key);
      aliasSourcesByAppId.set(appId, sources);
    } else if (candidates.length > 1) {
      ambiguous.push({
        seedKey: seedRow.key,
        canonicalName: seedRow.canonicalName,
        candidateIds: candidates.map((c) => c.id),
      });
    } else {
      seedAbsentFromApp.push({ seedKey: seedRow.key, canonicalName: seedRow.canonicalName });
    }
  }

  const duplicateAliasSources = [...aliasSourcesByAppId.entries()]
    .filter(([, sources]) => sources.length > 1)
    .map(([appId, sources]) => ({ appId, sources }));

  const report = {
    matched,
    appMissingFromSeed: [...appMissingFromSeed].map((id) => {
      const u = appUniversities.find((x) => x.id === id);
      return { appId: id, name: u?.name };
    }),
    seedAbsentFromApp,
    ambiguous,
    duplicateAliasSources,
  };

  if (writeReport) {
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  const failures = [];
  if (duplicateAliasSources.length > 0) {
    failures.push(`duplicate alias sources: ${duplicateAliasSources.length}`);
  }
  if (ambiguous.length > 0) {
    failures.push(`ambiguous matches: ${ambiguous.length}`);
  }

  if (check && failures.length > 0) {
    console.error('University alias reconcile failed:');
    for (const f of failures) console.error(`  - ${f}`);
    if (duplicateAliasSources.length > 0) {
      console.error(JSON.stringify(duplicateAliasSources, null, 2));
    }
    process.exit(1);
  }

  console.log(
    `Reconcile OK: ${matched.length} matched, ${appMissingFromSeed.size} app without seed, ${seedAbsentFromApp.length} seed without app, ${ambiguous.length} ambiguous`,
  );

  return report;
}

const args = new Set(process.argv.slice(2));
reconcileUniversityAliases({
  check: args.has('--check'),
  writeReport: args.has('--write-report'),
});
