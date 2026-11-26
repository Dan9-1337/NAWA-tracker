import { describe, expect, it } from 'vitest';
import { resolveLocaleFromTags, russianFallbackLanguages, supportedLocaleFromTag } from './locale-fallback';

describe('resolveLocaleFromTags', () => {
  it.each(['kk', 'ka', 'az', 'hy', 'uz', 'ro', 'ky-KG', 'lt_LT'])('maps the region language %s to Russian', (code) => {
    expect(resolveLocaleFromTags([code])).toBe('ru');
  });

  it.each(['de', 'fr', 'ja', 'tr', '', null, undefined])('maps %s to English', (code) => {
    expect(resolveLocaleFromTags([code])).toBe('en');
  });

  it('gives English when there is no language information at all', () => {
    expect(resolveLocaleFromTags([])).toBe('en');
    expect(resolveLocaleFromTags([null, undefined])).toBe('en');
  });

  it.each([
    ['ru', 'ru'],
    ['uk-UA', 'uk'],
    ['be', 'be'],
    ['pl-PL', 'pl'],
    ['en-GB', 'en'],
  ])('keeps the supported language %s as %s', (code, locale) => {
    expect(resolveLocaleFromTags([code])).toBe(locale);
  });

  it('prefers a supported language of a later tag over a region language of an earlier one', () => {
    expect(resolveLocaleFromTags(['kk', 'uk-UA'])).toBe('uk');
    expect(resolveLocaleFromTags(['kk', 'en-US'])).toBe('en');
  });

  it('uses the region fallback of a later tag when no tag is supported', () => {
    expect(resolveLocaleFromTags(['de', 'kk-KZ'])).toBe('ru');
    expect(resolveLocaleFromTags([null, 'de-DE'])).toBe('en');
  });

  it('keeps the region list as a named constant that never holds a supported locale', () => {
    expect(russianFallbackLanguages).toContain('kk');
    for (const code of russianFallbackLanguages) expect(supportedLocaleFromTag(code)).toBeNull();
  });
});
