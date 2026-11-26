import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error plain ES module script without type declarations
import { budgets, checkBudgets, measureBundle } from './check-bundle-size.mjs';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('check-bundle-size', () => {
  it('sums gzipped JS and CSS and ignores other assets', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bundle-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'a.js'), 'x'.repeat(10_000));
    writeFileSync(join(dir, 'b.js'), 'y'.repeat(10_000));
    writeFileSync(join(dir, 'c.css'), 'z'.repeat(5_000));
    writeFileSync(join(dir, 'font.woff2'), 'f'.repeat(50_000));

    const sizes = measureBundle(dir) as { js: number; css: number };

    expect(sizes.js).toBeGreaterThan(0);
    expect(sizes.js).toBeLessThan(200);
    expect(sizes.css).toBeGreaterThan(0);
    expect(Object.keys(sizes).sort()).toEqual(['css', 'js']);
  });

  it('reports nothing within budget and one message per exceeded budget', () => {
    expect(checkBudgets({ js: budgets.js, css: budgets.css })).toEqual([]);
    const failures = checkBudgets({ js: budgets.js + 1, css: budgets.css + 1 }) as string[];
    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain('js');
    expect(failures[1]).toContain('css');
  });
});
