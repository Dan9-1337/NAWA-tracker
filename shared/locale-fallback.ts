/** The interface languages shared by the app and the bot. */
export const supportedLocaleCodes = ['pl', 'en', 'ru', 'uk', 'be'] as const;
export type SupportedLocaleCode = (typeof supportedLocaleCodes)[number];

/**
 * Languages of the audience's region that the app does not translate. Their speakers read Russian more easily than
 * English or Polish, so they get Russian when no supported language is available.
 */
export const russianFallbackLanguages = [
  'kk', 'ky', 'uz', 'tg', 'tk', 'az', 'hy', 'ka', 'ro', 'mo', 'lt', 'lv', 'et', 'tt', 'ba', 'ce',
] as const;

/** The language part of an IETF tag ("uk-UA", "be_BY" -> "uk", "be"), lower-cased, or null when there is none. */
function languagePrefix(tag: string | null | undefined): string | null {
  const prefix = tag?.toLowerCase().split(/[-_]/)[0];
  return prefix ? prefix : null;
}

/** Maps a language tag to a supported locale, or null for any other language. */
export function supportedLocaleFromTag(tag: string | null | undefined): SupportedLocaleCode | null {
  const prefix = languagePrefix(tag);
  return prefix && (supportedLocaleCodes as readonly string[]).includes(prefix) ? (prefix as SupportedLocaleCode) : null;
}

function isRussianFallbackTag(tag: string | null | undefined): boolean {
  const prefix = languagePrefix(tag);
  return prefix !== null && (russianFallbackLanguages as readonly string[]).includes(prefix);
}

/**
 * Picks the locale from language tags in order of preference (for the app: Telegram, then the browser):
 * the first supported language wins; otherwise Russian when any tag is a language of the region; otherwise English.
 * A stored user choice is handled by the caller before this.
 */
export function resolveLocaleFromTags(tags: ReadonlyArray<string | null | undefined>): SupportedLocaleCode {
  for (const tag of tags) {
    const supported = supportedLocaleFromTag(tag);
    if (supported) return supported;
  }
  return tags.some(isRussianFallbackTag) ? 'ru' : 'en';
}
