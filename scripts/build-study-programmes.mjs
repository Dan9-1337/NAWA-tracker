#!/usr/bin/env node
/**
 * Builds `shared/study-programmes.ts` from the official RAD-on / POL-on course registry.
 *
 * The script is run by hand, never in CI or at build time. It downloads the public course list, keeps first-cycle
 * and long-cycle full-time Polish-taught programmes that are still active at any institution, deduplicates them by
 * normalized kierunek name and writes a deterministic TypeScript module.
 *
 * Usage:
 *   node scripts/build-study-programmes.mjs
 *   node scripts/build-study-programmes.mjs --output /tmp/study-programmes.ts
 *   node scripts/build-study-programmes.mjs --input fixture.json --output /tmp/study-programmes.ts --date 2026-11-22
 *
 * `--input` reads a JSON array of course records (or an object with a `results` array) instead of downloading; it
 * exists for the fixture-based determinism test. The real dataset must always be downloaded from RAD-on.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_URL = 'https://radon.nauka.gov.pl/opendata/polon/courses';
const DEFAULT_OUTPUT = fileURLToPath(new URL('../shared/study-programmes.ts', import.meta.url));

const LEVELS = [
  { code: '1', name: 'jednolite magisterskie' },
  { code: '2', name: 'pierwszego stopnia' },
];

const FILTER_DESCRIPTION =
  'levelCode=1 (jednolite magisterskie) or levelCode=2 (pierwszego stopnia); ' +
  'formCode=1 (stacjonarne); educationLanguageCode=pol (polski); ' +
  'currentStatusCode=3 (prowadzone) and instance statusCode=3; all institutions';

const PAGE_SIZE = '100';
const MAX_PAGES = 200;
const REQUEST_ATTEMPTS = 4;
const INSTITUTION_CONCURRENCY = 6;

const POLISH_DIACRITICS = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

const INCLUDED_LEVELS = new Set(LEVELS.map((level) => level.code));

/** Mirrors `shared/university-search/normalize.ts`; the test checks every generated id against that module. */
function replacePolishDiacritics(value) {
  let result = '';
  for (const char of value) {
    const lower = char.toLowerCase();
    const mapped = POLISH_DIACRITICS[lower];
    if (mapped) result += char === lower ? mapped : mapped.toUpperCase();
    else result += char;
  }
  return result;
}

function normalizeSearchText(text) {
  const nfkc = text.normalize('NFKC').trim().toLowerCase();
  const withoutDiacritics = replacePolishDiacritics(nfkc);
  const nfd = withoutDiacritics.normalize('NFD').replace(/\p{M}/gu, '');
  return nfd.replace(/[.,\-·()\/\\'"`;:]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Stable ASCII slug: normalize like search, then turn every non-alphanumeric run into one hyphen. */
function slugify(name) {
  return normalizeSearchText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const options = { input: null, output: DEFAULT_OUTPUT, date: todayUtc(), help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const [flag, inlineValue] = arg.includes('=') ? arg.split('=', 2) : [arg, undefined];
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      const value = argv[index];
      if (value === undefined) throw new Error(`Missing value for ${flag}`);
      return value;
    };
    if (flag === '--input') options.input = resolve(readValue());
    else if (flag === '--output') options.output = resolve(readValue());
    else if (flag === '--date') options.date = readValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error(`--date must be YYYY-MM-DD, got "${options.date}"`);
  }
  return options;
}

function printHelp() {
  console.log(`Build shared/study-programmes.ts from RAD-on / POL-on.

Options:
  --input <file>    read a JSON fixture instead of downloading the dataset
  --output <file>   write here (default: shared/study-programmes.ts)
  --date <date>     download date in the header, YYYY-MM-DD (default: today, UTC)
  --help            show this message`);
}

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'nawa-tracker-study-programmes-builder' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_ATTEMPTS) await sleep(500 * attempt);
    }
  }
  throw new Error(`Download failed for ${url}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

async function fetchAllCourses(params) {
  const courses = [];
  let token = '';
  let pages = 0;
  do {
    const url = new URL(DATASET_URL);
    url.searchParams.set('resultNumbers', PAGE_SIZE);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (token) url.searchParams.set('token', token);

    const payload = await fetchJson(url);
    if (!Array.isArray(payload.results)) {
      throw new Error(`Unexpected RAD-on response: no results array for ${url.searchParams}`);
    }
    courses.push(...payload.results);
    token = payload.pagination?.token ?? '';
    pages += 1;
    if (pages > MAX_PAGES) throw new Error(`Pagination did not finish after ${MAX_PAGES} pages`);
  } while (token);
  return courses;
}

function courseKey(course) {
  return (
    course.courseUuid ??
    `${course.courseCode ?? ''}|${course.mainInstitutionUuid ?? ''}|${course.courseName ?? ''}`
  );
}

function collectInstitutionIds(course, ids) {
  if (course.mainInstitutionUuid) ids.add(course.mainInstitutionUuid);
  if (course.leadingInstitutionUuid) ids.add(course.leadingInstitutionUuid);
  for (const institution of course.coLeadingInstitutions ?? []) {
    if (institution.coLeadingInstitutionUuid) ids.add(institution.coLeadingInstitutionUuid);
  }
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * The public API's global pagination is not stable: pages can silently omit a few records. Fetching one institution
 * at a time keeps every result set small (and, in practice, stable), and the discovery pass seeds the map so a course
 * that only appears in it is kept too.
 */
async function downloadCourses() {
  const byUuid = new Map();
  const institutionIds = new Set();

  for (const level of LEVELS) {
    const courses = await fetchAllCourses({ levelCode: level.code, currentStatusCode: '3' });
    console.error(`discovery ${level.name}: ${courses.length} courses`);
    for (const course of courses) {
      collectInstitutionIds(course, institutionIds);
      byUuid.set(courseKey(course), course);
    }
  }

  const ids = [...institutionIds].sort();
  let institutionCourses = 0;
  const lists = await mapWithConcurrency(ids, INSTITUTION_CONCURRENCY, async (institutionId) => {
    const courses = await fetchAllCourses({ mainInstitutionUuid: institutionId, currentStatusCode: '3' });
    institutionCourses += courses.length;
    return courses;
  });
  for (const list of lists) {
    for (const course of list) byUuid.set(courseKey(course), course);
  }

  console.error(
    `institutions: ${ids.length}; institution courses: ${institutionCourses}; deduplicated: ${byUuid.size}`,
  );
  return [...byUuid.values()];
}

function hasMatchingInstance(course) {
  if (!Array.isArray(course.courseInstances)) return false;
  return course.courseInstances.some(
    (instance) =>
      String(instance.formCode) === '1' &&
      String(instance.languageCode) === 'pol' &&
      String(instance.statusCode) === '3',
  );
}

function isIncluded(course) {
  return (
    INCLUDED_LEVELS.has(String(course.levelCode)) &&
    String(course.currentStatusCode) === '3' &&
    hasMatchingInstance(course)
  );
}

function mostFrequent(counts) {
  let best = null;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && (best === null || value < best))) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function buildProgrammes(courses) {
  const bySlug = new Map();
  let included = 0;

  for (const course of courses) {
    if (!isIncluded(course)) continue;
    included += 1;

    const name = typeof course.courseName === 'string' ? course.courseName.trim() : '';
    if (!name) throw new Error(`A course without a name was included (uuid ${course.courseUuid ?? 'unknown'})`);

    const isced = String(course.iscedCode ?? '');
    if (!/^\d{4}$/.test(isced)) {
      throw new Error(
        `No four-digit ISCED-F code for "${name}" (uuid ${course.courseUuid ?? 'unknown'}); ` +
          'refusing to invent a mapping',
      );
    }

    const id = slugify(name);
    if (!id) throw new Error(`Cannot build an ASCII slug for "${name}"`);

    if (!bySlug.has(id)) bySlug.set(id, { names: new Map(), isced: new Map() });
    const entry = bySlug.get(id);
    entry.names.set(name, (entry.names.get(name) ?? 0) + 1);
    entry.isced.set(isced, (entry.isced.get(isced) ?? 0) + 1);
  }

  const programmes = [...bySlug.entries()]
    .map(([id, entry]) => ({ id, name: mostFrequent(entry.names), isced: mostFrequent(entry.isced) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  console.error(`included ${included} matching programmes, ${programmes.length} unique kierunki`);
  return programmes;
}

function quote(value) {
  return JSON.stringify(value);
}

function render(programmes, downloadedOn) {
  const lines = [
    '/**',
    ' * Generated by `node scripts/build-study-programmes.mjs`; do not edit by hand.',
    ' *',
    ` * Dataset: RAD-on / POL-on course registry, ${DATASET_URL}`,
    ` * Downloaded: ${downloadedOn}`,
    ` * Filter: ${FILTER_DESCRIPTION}.`,
    ' * One entry per kierunek name, deduplicated case-, diacritics- and punctuation-insensitively. The most',
    ' * frequent official spelling and the most frequent four-digit ISCED-F code are kept; on a tie the lowest',
    ' * code wins. A code whose two-digit group is missing from `broadGroups` maps to "other".',
    ' */',
    "import { broadGroups } from './study-fields';",
    '',
    'export type StudyProgramme = {',
    '  /** Stable ASCII slug of the normalized kierunek name. */',
    '  id: string;',
    '  /** Official Polish spelling kept from the dataset. */',
    '  name: string;',
    '  /** ISCED-F detailed code (four digits). */',
    '  isced: string;',
    '};',
    '',
    'export const studyProgrammes: readonly StudyProgramme[] = [',
    ...programmes.map(
      (programme) =>
        `  { id: ${quote(programme.id)}, name: ${quote(programme.name)}, isced: ${quote(programme.isced)} },`,
    ),
    '];',
    '',
    '/** Two-digit ISCED-F broad group from `broadGroups`, or "other" when the group is not listed there. */',
    'export function iscedBroadGroup(code: string): string {',
    "  const group = code.slice(0, 2);",
    "  return Object.prototype.hasOwnProperty.call(broadGroups, group) ? group : 'other';",
    '}',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  let courses;
  if (options.input) {
    const parsed = JSON.parse(await readFile(options.input, 'utf8'));
    courses = Array.isArray(parsed) ? parsed : parsed.results;
    if (!Array.isArray(courses)) throw new Error(`No course array in ${options.input}`);
    console.error(`read ${courses.length} fixture courses from ${options.input}`);
  } else {
    courses = await downloadCourses();
  }

  const programmes = buildProgrammes(courses);
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, render(programmes, options.date), 'utf8');
  console.error(`wrote ${programmes.length} programmes to ${options.output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
