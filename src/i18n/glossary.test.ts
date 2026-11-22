import { describe, expect, it } from 'vitest';
import { botLocales, botMessages } from '../../shared/bot-messages';
import { localeOrder, messages } from './index';
import type { Locale } from './types';

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
function appStrings(locale: Locale): string[] {
  return leaves(messages[locale]).flatMap(([path, leaf]) => {
    if (path.startsWith('language.')) return [];
    if (typeof leaf === 'string') return [leaf];
    if (typeof leaf === 'function') return [(leaf as (...args: string[]) => string)(...Array(leaf.length).fill('X'))];
    return (leaf as readonly unknown[]).filter((item): item is string => typeof item === 'string');
  });
}

function botStrings(locale: Locale): string[] {
  const copy = botMessages[locale];
  return [
    copy.welcome,
    copy.welcomeCountry('Testland'),
    copy.openApp,
    copy.subscribed,
    copy.alreadySubscribed,
    copy.unsubscribed,
    copy.help,
    ...Object.values(copy.reminders).map((message) => message('2026')),
  ];
}

/**
 * Terms the glossary rejects. Each locale is checked on its own, so a translation that drifts
 * back to a rejected synonym fails CI instead of reaching a reader.
 */
const banned: Record<Locale, readonly RegExp[]> = {
  pl: [/ścieżk/i, /\bprofil/i, /nieodwracalny skrót/i, /faktów/i],
  en: [/\bround\b/i, /\bcall\b/i, /\bseason\b/i, /danger zone/i, /one-way/i, /telegram id/, /\bprofile\b/i, /\btrack\b/i],
  ru: [/опрос/i, /предварительн\w*\s+(бал|расч[её]т)/i, /профил/i, /по-честному/i, /по всей программе/i, /односторонн/i, /telegram id/, /\bтрек\b/i],
  uk: [/опитуванн/i, /попередн\w*\s+(бал|розрахун)/i, /профіл/i, /чесно/i, /односторонн/i, /telegram id/, /\bтрек\b/i],
  be: [/апытанн/i, /папярэдн\w*\s+(бал|разлік)/i, /профіл/i, /сумленна/i, /аднабаков/i, /telegram id/, /\bтрэк\b/i],
};

describe('locale glossary', () => {
  it.each(localeOrder)('%s app copy has no rejected term', (locale) => {
    const text = appStrings(locale).join('\n');
    for (const pattern of banned[locale]) expect(text, `banned ${pattern}`).not.toMatch(pattern);
  });

  it.each(botLocales)('%s bot copy has no rejected term', (locale) => {
    const text = botStrings(locale).join('\n');
    for (const pattern of banned[locale]) expect(text, `banned ${pattern}`).not.toMatch(pattern);
  });

  it('uses the agreed term for the recruitment round in English', () => {
    expect(appStrings('en').join('\n')).toMatch(/\bintake\b/i);
    expect(botStrings('en').join('\n')).toMatch(/\bintake\b/i);
  });

  it.each(localeOrder)('%s points at the real edit label in whatIfNote', (locale) => {
    expect(messages[locale].scoreScreen.whatIfNote).toContain(messages[locale].settings.editProfile);
  });

  it.each(localeOrder)('%s says a small country can be guessed, without pooling countries', (locale) => {
    const text = [messages[locale].privacyNotice.body, ...messages[locale].privacyNotice.points].join('\n');
    expect(text).toMatch({
      pl: /znajomi mogą domyślić się, czyj to wynik/,
      en: /acquaintances may guess whose score is whose/,
      ru: /знакомые могут догадаться, чей это бал/,
      uk: /знайомі можуть здогадатися, чий це бал/,
      be: /знаёмыя могуць здагадацца, чый гэта бал/,
    }[locale]);
    expect(text).not.toMatch({
      pl: /Małe kraje|łączone w grupy|grupy krajów/i,
      en: /Small countries|country group/i,
      ru: /Небольшие страны|группе стран|группы стран/i,
      uk: /Невеликі країни|групі країн|групи країн/i,
      be: /Невялікія краіны|групе краін|групы краін/i,
    }[locale]);
  });

  it.each(localeOrder)('%s no longer carries the country-group and small-country copy', (locale) => {
    expect(messages[locale]).not.toHaveProperty('cohort');
    expect(messages[locale].dashboard).not.toHaveProperty('smallCountry');
  });

  it.each(localeOrder)('%s treats an average above the maximum as a typo', (locale) => {
    expect(messages[locale].wizard.averageAboveMaximum).toMatch({
      pl: /sprawdź/i,
      en: /check/i,
      ru: /проверьте/i,
      uk: /перевірте/i,
      be: /праверце/i,
    }[locale]);
  });

  it.each(['pl', 'ru', 'uk', 'be'] as const)('%s puts the invited country before a colon', (locale) => {
    expect(botMessages[locale].welcomeCountry('Testland')).toContain('Testland:');
  });
});
