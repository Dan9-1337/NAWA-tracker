import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeSearchText } from './lib/university-normalize.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const metadataPath = join(root, 'shared/universities-metadata.ts');
const universitiesPath = join(root, 'shared/universities.ts');

function parseUniversitiesFromTs(content) {
  const entries = [];
  const re = /\{\s*id:\s*'([^']+)',\s*ministry:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g;
  for (const match of content.matchAll(re)) {
    entries.push({ id: match[1], ministry: match[2], name: match[3] });
  }
  return entries;
}

function parseMetadata(content) {
  const map = new Map();
  const blockRe = /'([^']+)':\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(blockRe)) {
    const names = [];
    for (const list of match[2].matchAll(/(?:shortNames|aliases|formerNames):\s*\[([^\]]+)\]/g)) {
      names.push(...[...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
    }
    map.set(match[1], names);
  }
  return map;
}

const failOnWarn = process.argv.slice(2).includes('--fail-on-warn');
const universities = parseUniversitiesFromTs(readFileSync(universitiesPath, 'utf8'));
const metadata = parseMetadata(readFileSync(metadataPath, 'utf8'));

const warnings = [];
const errors = [];

const ids = new Set();
for (const university of universities) {
  if (ids.has(university.id)) errors.push(`duplicate university id ${university.id}`);
  ids.add(university.id);
  if (!['science', 'culture', 'health'].includes(university.ministry)) {
    errors.push(`${university.id} has unknown ministry ${university.ministry}`);
  }
  if (!university.name.trim()) errors.push(`${university.id} has an empty name`);
}

for (const id of metadata.keys()) {
  if (!ids.has(id)) errors.push(`search metadata references unknown university ${id}`);
}

const owners = new Map();
for (const [id, names] of metadata.entries()) {
  for (const name of names) {
    const key = normalizeSearchText(name);
    if (!key) continue;
    const list = owners.get(key) ?? new Set();
    list.add(id);
    owners.set(key, list);
  }
}
for (const [key, list] of owners.entries()) {
  if (list.size > 1) warnings.push(`search term "${key}" maps to several universities: ${[...list].join(', ')}`);
}

console.log('University catalog validation');
console.log(`  universities: ${universities.length}`);
console.log(`  warnings: ${warnings.length}`);
console.log(`  errors: ${errors.length}`);
for (const w of warnings.slice(0, 20)) console.warn(`WARN: ${w}`);
for (const e of errors) console.error(`ERROR: ${e}`);

if (errors.length > 0 || (failOnWarn && warnings.length > 0)) {
  process.exit(1);
}
