import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routes } from './local-api-routes.js';

const apiDir = join(import.meta.dirname, '..', 'api');

// Handler files are every api/**/*.ts except api/_lib/** and tests; Vercel serves each as its own route.
function handlerPaths(dir = apiDir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_lib' ? [] : handlerPaths(full);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
    return [`/api/${relative(apiDir, full).split(sep).join('/').replace(/\.ts$/, '')}`];
  });
}

describe('local API route table', () => {
  it('has a route for every handler file in api/', () => {
    const served = new Set(routes.map((route) => route.path));
    const missing = handlerPaths().filter((path) => !served.has(path));

    expect(missing, `api/ handlers without a local route in scripts/local-api-routes.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('serves the expected method and path pairs', () => {
    expect(routes.map((route) => `${route.method} ${route.path}`).sort()).toEqual(
      [
        'POST /api/responses',
        'PUT /api/responses',
        'DELETE /api/responses',
        'POST /api/responses/current',
        'POST /api/statistics',
        'POST /api/intake-summary',
        'POST /api/product-events',
        'GET /api/scholarship-report',
        'POST /api/scholarship-report',
        'PUT /api/scholarship-report',
        'DELETE /api/scholarship-report',
        'POST /api/bot',
        'GET /api/cron/reminders',
        'GET /api/cron/keep-alive',
        'GET /api/orientation-mark',
      ].sort(),
    );
  });
});
