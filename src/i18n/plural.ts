import type { Locale } from './types';

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/**
 * Picks the grammatical form of a counted noun by the CLDR plural rules of `locale`.
 * Polish, Russian, Ukrainian and Belarusian need `one`, `few`, `many` and `other`; English needs `one` and `other`.
 * `count` may be a localized number ("82,4"). A number written with a decimal separator, even "6,0" as `formatScore`
 * prints it, always selects `other`: the fractional form ("6,0 балла").
 */
export function plural(locale: Locale, count: number | string, forms: PluralForms): string {
  if (typeof count === 'string' && /[.,]/.test(count)) return forms.other;
  const value = typeof count === 'number' ? count : Number(count.replace(/\s/g, ''));
  // Without Belarusian data a browser would apply English rules; Russian has the same one/few/many classes.
  const rules = new Intl.PluralRules(locale === 'be' ? ['be', 'ru'] : locale);
  const category = Number.isFinite(value) ? rules.select(value) : 'other';
  return forms[category] ?? forms.other;
}
