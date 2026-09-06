import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractCityFromName, normalizeSearchText } from './lib/university-normalize.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const universitiesPath = join(root, 'shared/universities.ts');
const metadataPath = join(root, 'shared/universities-metadata.ts');
const seedPath = join(root, 'shared/data/university-alias-seed-2026.json');

function parseUniversitiesFromTs(content) {
  const entries = [];
  const re = /\{\s*id:\s*'([^']+)',\s*ministry:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g;
  for (const match of content.matchAll(re)) {
    entries.push({ id: match[1], ministry: match[2], name: match[3] });
  }
  return entries;
}

function parseMetadataFromTs(content) {
  const meta = {};
  const blockRe = /'([^']+)':\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(blockRe)) {
    const id = match[1];
    const block = match[2];
    const entry = {};
    const city = block.match(/city:\s*'([^']+)'/);
    if (city) entry.city = city[1];
    const shortNames = block.match(/shortNames:\s*\[([^\]]+)\]/);
    if (shortNames) {
      entry.shortNames = [...shortNames[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    }
    const aliases = block.match(/aliases:\s*\[([^\]]+)\]/);
    if (aliases) {
      entry.aliases = [...aliases[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    }
    const formerNames = block.match(/formerNames:\s*\[([^\]]+)\]/);
    if (formerNames) {
      entry.formerNames = [...formerNames[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    }
    meta[id] = entry;
  }
  return meta;
}

const universities = parseUniversitiesFromTs(readFileSync(universitiesPath, 'utf8'));
const metadata = parseMetadataFromTs(readFileSync(metadataPath, 'utf8'));

const seed = universities.map((u) => {
  const meta = metadata[u.id] ?? {};
  const city = meta.city ?? extractCityFromName(u.name);
  const row = {
    key: u.id,
    canonicalName: u.name,
    confidence: meta.shortNames || meta.aliases || meta.formerNames ? 'high' : 'medium',
  };
  if (city) row.city = city;
  if (meta.shortNames) row.shortNames = meta.shortNames;
  if (meta.aliases) row.aliases = meta.aliases;
  if (meta.formerNames) row.formerNames = meta.formerNames;
  return row;
});

writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Wrote ${seed.length} seed entries to ${seedPath}`);
