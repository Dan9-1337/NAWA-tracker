import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const metadataPath = join(root, 'shared/universities-metadata.ts');
const seedPath = join(root, 'shared/data/university-alias-seed-2026.json');

function parseMetadata(content) {
  let shortNames = 0;
  let aliases = 0;
  let formerNames = 0;
  let cities = 0;
  let schools = 0;
  const blockRe = /'([^']+)':\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(blockRe)) {
    schools++;
    const block = match[2];
    if (/city:/.test(block)) cities++;
    const sn = block.match(/shortNames:\s*\[([^\]]+)\]/);
    if (sn) shortNames += [...sn[1].matchAll(/'([^']+)'/g)].length;
    const al = block.match(/aliases:\s*\[([^\]]+)\]/);
    if (al) aliases += [...al[1].matchAll(/'([^']+)'/g)].length;
    const fn = block.match(/formerNames:\s*\[([^\]]+)\]/);
    if (fn) formerNames += [...fn[1].matchAll(/'([^']+)'/g)].length;
  }
  return { schools, shortNames, aliases, formerNames, cities };
}

function parseSeed(seed) {
  let shortNames = 0;
  let aliases = 0;
  let formerNames = 0;
  for (const row of seed) {
    shortNames += row.shortNames?.length ?? 0;
    aliases += row.aliases?.length ?? 0;
    formerNames += row.formerNames?.length ?? 0;
  }
  return { rows: seed.length, shortNames, aliases, formerNames };
}

const meta = parseMetadata(readFileSync(metadataPath, 'utf8'));
const seed = parseSeed(JSON.parse(readFileSync(seedPath, 'utf8')));
const metaTotal = meta.shortNames + meta.aliases + meta.formerNames;
const seedTotal = seed.shortNames + seed.aliases + seed.formerNames;

console.log('University alias counts');
console.log('========================');
console.log(`Schools in catalog: 141`);
console.log(`Schools with search metadata: ${meta.schools}`);
console.log('');
console.log('Stored in universities-metadata.ts (hand-curated):');
console.log(`  shortNames:   ${meta.shortNames}`);
console.log(`  aliases:      ${meta.aliases}`);
console.log(`  formerNames:  ${meta.formerNames}`);
console.log(`  cities:       ${meta.cities}`);
console.log(`  TOTAL strings: ${metaTotal}`);
console.log('');
console.log('Seed JSON (mirror of metadata + derived cities):');
console.log(`  shortNames:   ${seed.shortNames}`);
console.log(`  aliases:      ${seed.aliases}`);
console.log(`  formerNames:  ${seed.formerNames}`);
console.log(`  TOTAL strings: ${seedTotal}`);
console.log('');
console.log('Note: search also uses canonical names, cities, and generated');
console.log('variants (polibuda+miasto, Russian phrases, etc.) built at runtime.');
console.log('Run with vitest for full index term count.');
