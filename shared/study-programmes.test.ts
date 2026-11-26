import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { broadGroups } from './study-fields';
import { iscedBroadGroup, studyProgrammes } from './study-programmes';
import { normalizeSearchText } from './university-search/normalize';

const slugify = (name: string) =>
  normalizeSearchText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const byName = new Map(studyProgrammes.map((programme) => [programme.name, programme]));

describe('studyProgrammes', () => {
  it('has a non-empty list, sorted unique ASCII ids, and names unique after normalization', () => {
    expect(studyProgrammes.length).toBeGreaterThan(1000);

    const ids = studyProgrammes.map((programme) => programme.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true);

    expect(studyProgrammes.map((programme) => slugify(programme.name))).toEqual(ids);
    expect(new Set(studyProgrammes.map((programme) => slugify(programme.name))).size).toBe(studyProgrammes.length);
    expect(studyProgrammes.every((programme) => programme.name === programme.name.trim() && programme.name !== '')).toBe(
      true,
    );
  });

  it('carries a four-digit ISCED-F code for every programme', () => {
    for (const programme of studyProgrammes) {
      expect(programme.isced, `${programme.id} ${programme.name}`).toMatch(/^\d{4}$/);
    }
  });

  it('contains common kierunki with the expected broad groups', () => {
    const expected: ReadonlyArray<readonly [string, string]> = [
      ['Informatyka', '06'],
      ['Prawo', '04'],
      ['Architektura', '07'],
      ['Psychologia', '03'],
      ['Filologia polska', '02'],
    ];
    for (const [name, group] of expected) {
      const programme = byName.get(name);
      expect(programme, name).toBeDefined();
      expect(iscedBroadGroup(programme!.isced), name).toBe(group);
    }
  });

  it('maps every code to a broadGroups key or "other"', () => {
    const groups = new Set(Object.keys(broadGroups));
    for (const programme of studyProgrammes) {
      const group = iscedBroadGroup(programme.isced);
      expect(group === 'other' || groups.has(group), `${programme.id} ${programme.isced}`).toBe(true);
    }
    expect(iscedBroadGroup('0613')).toBe('06');
    expect(iscedBroadGroup('9999')).toBe('other');
    expect(iscedBroadGroup('other')).toBe('other');
  });
});

function fixtureCourse(
  courseName: string,
  iscedCode: string,
  levelCode: string,
  instance: Record<string, string> = {},
): Record<string, unknown> {
  return {
    courseUuid: `${courseName}-${iscedCode}-${levelCode}-${JSON.stringify(instance)}`,
    courseName,
    iscedCode,
    levelCode,
    currentStatusCode: '3',
    courseInstances: [{ formCode: '1', languageCode: 'pol', statusCode: '3', ...instance }],
  };
}

describe('build-study-programmes.mjs', () => {
  it('is deterministic on a fixture and applies the filter, frequency and tie rules', () => {
    const directory = mkdtempSync(join(tmpdir(), 'nawa-study-programmes-'));
    try {
      const input = join(directory, 'fixture.json');
      const first = join(directory, 'first.ts');
      const second = join(directory, 'second.ts');
      const fixture = [
        fixtureCourse('Informatyka', '0613', '1'),
        fixtureCourse('Informatyka', '0613', '2'),
        fixtureCourse('Informatyka', '0612', '2'),
        fixtureCourse('Prawo', '0421', '1'),
        fixtureCourse('Prawo', '0421', '1'),
        fixtureCourse('prawo', '0421', '2'),
        fixtureCourse('Architektura', '0732', '1'),
        fixtureCourse('Architektura', '0731', '2'),
        fixtureCourse('Filologia polska', '0232', '1'),
        fixtureCourse('Anglistyka', '0231', '2', { formCode: '2' }),
        fixtureCourse('Zarządzanie', '0413', '2', { languageCode: 'eng' }),
        fixtureCourse('Historia', '0222', '1', { statusCode: '1' }),
        fixtureCourse('Ekonomia', '0311', '3'),
        { ...fixtureCourse('Chemia', '0531', '1'), currentStatusCode: '2' },
      ];
      writeFileSync(input, JSON.stringify(fixture), 'utf8');

      const script = join(process.cwd(), 'scripts', 'build-study-programmes.mjs');
      const run = (output: string) =>
        execFileSync(process.execPath, [script, '--input', input, '--output', output, '--date', '2026-11-22'], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      run(first);
      run(second);

      const firstOutput = readFileSync(first, 'utf8');
      expect(readFileSync(second, 'utf8')).toBe(firstOutput);
      expect(firstOutput).toContain('Downloaded: 2026-11-22');
      expect(firstOutput).toContain('{ id: "informatyka", name: "Informatyka", isced: "0613" }');
      expect(firstOutput).toContain('{ id: "prawo", name: "Prawo", isced: "0421" }');
      expect(firstOutput).toContain('{ id: "architektura", name: "Architektura", isced: "0731" }');
      expect(firstOutput).toContain('{ id: "filologia-polska", name: "Filologia polska", isced: "0232" }');
      for (const excluded of ['anglistyka', 'zarzadzanie', 'historia', 'ekonomia', 'chemia']) {
        expect(firstOutput, excluded).not.toContain(`id: "${excluded}"`);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
