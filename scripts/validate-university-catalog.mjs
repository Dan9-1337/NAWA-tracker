import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeSearchText } from './lib/university-normalize.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(root, 'shared/data/university-alias-seed-2026.json');
const metadataPath = join(root, 'shared/universities-metadata.ts');
const universitiesPath = join(root, 'shared/universities.ts');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseUniversitiesFromTs(content) {
  const entries = [];
  const re = /\{\s*id:\s*'([^']+)',\s*ministry:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g;
  for (const match of content.matchAll(re)) {
    entries.push({ id: match[1], ministry: match[2], name: match[3] });
  }
  return entries;
}

function parseMetadataShortNames(content) {
  const map = new Map();
  const blockRe = /'([^']+)':\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(blockRe)) {
    const id = match[1];
    const block = match[2];
    const shortNames = block.match(/shortNames:\s*\[([^\]]+)\]/);
    if (shortNames) {
      map.set(id, [...shortNames[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
    }
  }
  return map;
}

const args = new Set(process.argv.slice(2));
const failOnWarn = args.has('--fail-on-warn');

const seed = loadJson(seedPath);
const universities = parseUniversitiesFromTs(readFileSync(universitiesPath, 'utf8'));
const metadataShortNames = parseMetadataShortNames(readFileSync(metadataPath, 'utf8'));

const warnings = [];
const errors = [];

const aliasOwners = new Map();
for (const row of seed) {
  const aliases = [...(row.shortNames ?? []), ...(row.aliases ?? []), ...(row.formerNames ?? [])];
  for (const alias of aliases) {
    const key = normalizeSearchText(alias);
    if (!key) continue;
    const owners = aliasOwners.get(key) ?? [];
    owners.push({ seedKey: row.key, alias });
    aliasOwners.set(key, owners);
  }
}

for (const [key, owners] of aliasOwners.entries()) {
  const uniqueIds = new Set(owners.map((o) => o.seedKey));
  if (uniqueIds.size > 1) {
    warnings.push(`alias "${key}" maps to multiple universities: ${owners.map((o) => o.seedKey).join(', ')}`);
  }
}

const allShortNames = new Map();
for (const [id, shortNames] of metadataShortNames.entries()) {
  for (const sn of shortNames) {
    const key = normalizeSearchText(sn);
    if (!allShortNames.has(key)) allShortNames.set(key, []);
    allShortNames.get(key).push(id);
  }
}

for (const row of seed) {
  const aliases = [...(row.aliases ?? []), ...(row.formerNames ?? [])];
  for (const alias of aliases) {
    const key = normalizeSearchText(alias);
    const shortOwners = allShortNames.get(key);
    if (shortOwners && shortOwners.length === 1 && shortOwners[0] !== row.key) {
      warnings.push(
        `alias "${alias}" equals another university's short name (${shortOwners[0]})`,
      );
    }
  }
}

const mediumConfidence = seed.filter((row) => row.confidence === 'medium');
if (mediumConfidence.length > 0) {
  warnings.push(`${mediumConfidence.length} seed entries still have medium confidence`);
}

const appIds = new Set(universities.map((u) => u.id));
const seedKeys = new Set(seed.map((s) => s.key));
for (const id of appIds) {
  if (!seedKeys.has(id)) errors.push(`app university ${id} missing from seed`);
}
for (const key of seedKeys) {
  if (!appIds.has(key)) warnings.push(`seed entry ${key} has no matching app university`);
}

console.log('University catalog validation');
console.log(`  warnings: ${warnings.length}`);
console.log(`  errors: ${errors.length}`);
for (const w of warnings.slice(0, 20)) console.warn(`WARN: ${w}`);
for (const e of errors) console.error(`ERROR: ${e}`);

if (errors.length > 0 || (failOnWarn && warnings.length > 0)) {
  process.exit(1);
}
