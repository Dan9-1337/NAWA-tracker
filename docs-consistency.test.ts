import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const docs = [
  'AGENTS.md',
  'README.md',
  'docs/adr/README.md',
  'tasks/README.md',
  'tasks/TEMPLATE.md',
  ...readdirSync(join(root, 'docs')).map((name) => `docs/${name}`),
].filter((path) => path.endsWith('.md'));
const readme = read('README.md');
const architecture = read('docs/architecture.md');

describe('documentation stays in step with the code', () => {
  it('documents every environment variable of .env.example in the README', () => {
    const variables = read('.env.example')
      .split('\n')
      .map((line) => /^([A-Z][A-Z0-9_]+)=/.exec(line)?.[1])
      .filter((name): name is string => name !== undefined);

    expect(variables.length).toBeGreaterThan(5);
    for (const name of variables) {
      expect(readme, `${name} missing from the README`).toContain(name);
    }
  });

  it('has an API file for every cron path in vercel.json', () => {
    const { crons } = JSON.parse(read('vercel.json')) as { crons: Array<{ path: string }> };

    expect(crons.length).toBeGreaterThanOrEqual(2);
    for (const { path } of crons) {
      expect(existsSync(join(root, `${path.replace(/^\//, '')}.ts`)), `${path} has no handler`).toBe(true);
      expect(architecture, `${path} missing from architecture.md`).toContain(path);
    }
  });

  it('only references npm scripts that exist', () => {
    const scripts = Object.keys((JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts);

    for (const doc of docs) {
      for (const [, name] of read(doc).matchAll(/npm run ([a-z0-9:-]+)/g)) {
        expect(scripts, `${doc} mentions "npm run ${name}"`).toContain(name);
      }
    }
  });

  it('mentions every migration after the baseline in the architecture changelog', () => {
    const migrations = readdirSync(join(root, 'supabase/migrations'))
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .slice(1);

    for (const name of migrations) {
      const id = name.split('_')[0]!;
      expect(architecture, `migration ${id} is not described in architecture.md`).toContain(id);
    }
  });

  it('only links to files that exist', () => {
    for (const doc of docs) {
      for (const [, target] of read(doc).matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
        if (/^(https?:|mailto:)/.test(target!)) continue;
        const resolved = join(root, dirname(doc), target!);
        expect(existsSync(resolved), `${doc} links to missing ${target}`).toBe(true);
      }
    }
  });
});
