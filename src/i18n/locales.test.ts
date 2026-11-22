import { describe, expect, it } from 'vitest';
import { formatScore } from '../lib/format';
import { isLocale, localeFromLanguageTag, localeOrder, messages } from './index';

type Leaf = string | ((...args: never[]) => string) | readonly unknown[];

function leaves(value: unknown, path = ''): Array<[string, Leaf]> {
  if (typeof value === 'string' || typeof value === 'function' || Array.isArray(value)) {
    return [[path, value as Leaf]];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key),
  );
}

/** Every user-visible string of a locale, except the language names, which are endonyms by design. */
function strings(locale: keyof typeof messages): string[] {
  return leaves(messages[locale]).flatMap(([path, leaf]) => {
    if (path.startsWith('language.')) return [];
    if (typeof leaf === 'string') return [leaf];
    if (typeof leaf === 'function') return [(leaf as (...args: string[]) => string)(...Array(leaf.length).fill('X'))];
    return (leaf as readonly unknown[]).filter((item): item is string => typeof item === 'string');
  });
}

describe('locales', () => {
  const reference = leaves(messages.pl).map(([path]) => path);

  it.each(localeOrder.filter((locale) => locale !== 'pl'))('%s has exactly the keys of pl', (locale) => {
    expect(leaves(messages[locale]).map(([path]) => path)).toEqual(reference);
  });

  it.each(localeOrder)('%s has no empty strings and keeps function arity', (locale) => {
    for (const [path, leaf] of leaves(messages[locale])) {
      if (typeof leaf === 'string') expect(leaf.trim(), `${locale}.${path}`).not.toBe('');
      if (typeof leaf === 'function') {
        const plLeaf = leaves(messages.pl).find(([plPath]) => plPath === path)?.[1] as (...args: never[]) => string;
        expect(leaf.length, `${locale}.${path} arity`).toBe(plLeaf.length);
      }
    }
    expect(strings(locale).join('\n')).not.toMatch(/undefined|\[object/);
  });

  it('keeps Ukrainian free of Russian-only letters and Belarusian-only letters', () => {
    const text = strings('uk').join('\n');
    expect(text).not.toMatch(/[ыэъё]/i);
    expect(text).not.toMatch(/ў/i);
    expect(text).toMatch(/[іїєґ]/);
  });

  it('keeps Belarusian free of Russian and Ukrainian spellings', () => {
    const text = strings('be').join('\n');
    // Belarusian writes і (not и), has no ъ, and never uses Ukrainian ї є ґ.
    expect(text).not.toMatch(/[иъїєґ]/i);
    expect(text).toMatch(/ў/);
  });

  it('keeps Ukrainian and Belarusian names untranslated across the language switcher', () => {
    for (const locale of localeOrder) {
      expect(messages[locale].language.uk).toBe('Українська');
      expect(messages[locale].language.be).toBe('Беларуская');
    }
  });

  it.each(localeOrder)('%s explains the score-change trail right after the delete-everything point', (locale) => {
    const points = messages[locale].privacyNotice.points;
    const deleteIndex = points.findIndex((point) =>
      /usunąć wszystko|delete everything|удалить всё|видалити всі|выдаліць усё/i.test(point),
    );
    expect(deleteIndex).toBeGreaterThanOrEqual(0);
    expect(points[deleteIndex + 1]).toMatch(
      {
        pl: /około dob[ęy].*kod konta/i,
        en: /about a day.*account code/i,
        ru: /около суток.*код аккаунта/i,
        uk: /приблизно добу.*код акаунта/i,
        be: /каля сутак.*код акаўнта/i,
      }[locale],
    );
  });
});

describe('locale detection', () => {
  it('maps language tags to supported locales', () => {
    expect(localeFromLanguageTag('uk')).toBe('uk');
    expect(localeFromLanguageTag('be-BY')).toBe('be');
    expect(localeFromLanguageTag('ru_RU')).toBe('ru');
    expect(localeFromLanguageTag('pl-PL')).toBe('pl');
    expect(localeFromLanguageTag('en-GB')).toBe('en');
    expect(localeFromLanguageTag('de')).toBeNull();
    expect(localeFromLanguageTag(null)).toBeNull();
  });

  it('knows every supported locale', () => {
    for (const locale of localeOrder) expect(isLocale(locale)).toBe(true);
    expect(isLocale('de')).toBe(false);
  });
});

describe('number formatting', () => {
  it.each(['uk', 'be'] as const)('uses a decimal comma in %s', (locale) => {
    expect(formatScore(82.4, locale)).toBe('82,4');
  });
});
