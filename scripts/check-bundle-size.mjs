/**
 * Fails when the gzipped production bundle grows past its budget (run after `npm run build`).
 *
 *   node scripts/check-bundle-size.mjs
 *
 * The Mini App is opened inside Telegram on mobile networks, so JavaScript and CSS size matter. Raise a budget on
 * purpose, in the same pull request as the change that needs it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/** Gzipped bytes. Current sizes (2026-11): JS ~163 kB, CSS ~7 kB. */
export const budgets = { js: 190 * 1024, css: 12 * 1024 };

export function measureBundle(assetsDir) {
  const sizes = { js: 0, css: 0 };
  for (const name of readdirSync(assetsDir)) {
    const kind = name.endsWith('.js') ? 'js' : name.endsWith('.css') ? 'css' : null;
    if (kind) sizes[kind] += gzipSync(readFileSync(join(assetsDir, name)), { level: 9 }).length;
  }
  return sizes;
}

export function checkBudgets(sizes, limits = budgets) {
  return Object.entries(limits)
    .filter(([kind, limit]) => sizes[kind] > limit)
    .map(([kind, limit]) => `${kind}: ${(sizes[kind] / 1024).toFixed(1)} kB gzip exceeds the ${(limit / 1024).toFixed(0)} kB budget`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sizes = measureBundle(new URL('../dist/assets/', import.meta.url).pathname);
  console.log(`Bundle (gzip): js ${(sizes.js / 1024).toFixed(1)} kB, css ${(sizes.css / 1024).toFixed(1)} kB`);
  const failures = checkBudgets(sizes);
  failures.forEach((failure) => console.error(`ERROR: ${failure}`));
  process.exit(failures.length > 0 ? 1 : 0);
}
