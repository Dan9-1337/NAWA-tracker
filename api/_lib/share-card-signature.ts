import { createHmac, timingSafeEqual } from 'node:crypto';

import { isCountryCode, type CountryCode } from '../../shared/countries.js';

/**
 * Signed, stateless share-card URL (task 066 spike). The query carries only display values: `s` score,
 * `c` country code, `l` locale, and `t` = base64url(HMAC-SHA256(SHARE_CARD_SECRET, canonical message)).
 * No Telegram id, identity hash or survey id goes into the URL or the tag input.
 */
export const shareCardLocales = ['ru', 'uk', 'be', 'pl', 'en'] as const;
export type ShareCardLocale = (typeof shareCardLocales)[number];

export type ShareCardValues = {
  /** Canonical score text: 0–100 with at most two decimals and no trailing zeros, e.g. `83.25`, `70`. */
  score: string;
  country: CountryCode;
  locale: ShareCardLocale;
};

const SIGNATURE_VERSION = 'v1';
const scorePattern = /^(?:100|[1-9]?\d(?:\.\d?[1-9])?)$/;

export function isShareCardLocale(value: string): value is ShareCardLocale {
  return (shareCardLocales as readonly string[]).includes(value);
}

/** Formats a numeric score into the canonical URL form; returns null outside 0–100. */
export function canonicalShareScore(score: number): string | null {
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  const text = String(Math.round(score * 100) / 100);
  return scorePattern.test(text) ? text : null;
}

function canonicalMessage(values: ShareCardValues): string {
  return `${SIGNATURE_VERSION}\n${values.score}\n${values.country}\n${values.locale}`;
}

function tagFor(values: ShareCardValues, secret: string): string {
  return createHmac('sha256', secret).update(canonicalMessage(values), 'utf8').digest('base64url');
}

export function signShareCard(values: ShareCardValues, secret: string): URLSearchParams {
  if (!scorePattern.test(values.score) || !isCountryCode(values.country) || !isShareCardLocale(values.locale)) {
    throw new Error('Invalid share card values');
  }
  return new URLSearchParams({
    s: values.score,
    c: values.country,
    l: values.locale,
    t: tagFor(values, secret),
  });
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Returns the display values when the query is exactly `s`, `c`, `l`, `t` with a valid tag; otherwise null.
 * Repeated or extra parameters are refused so a signed URL has one spelling only.
 */
export function verifyShareCard(
  query: Readonly<Record<string, string | string[] | undefined>>,
  secret: string,
): ShareCardValues | null {
  const keys = Object.keys(query).filter((key) => query[key] !== undefined).sort();
  if (keys.join(',') !== 'c,l,s,t') return null;

  const score = single(query.s);
  const country = single(query.c);
  const locale = single(query.l);
  const tag = single(query.t);
  if (score === undefined || country === undefined || locale === undefined || tag === undefined) return null;
  if (!scorePattern.test(score) || !isCountryCode(country) || !isShareCardLocale(locale)) return null;

  const values: ShareCardValues = { score, country, locale };
  const expected = Buffer.from(tagFor(values, secret), 'utf8');
  const given = Buffer.from(tag, 'utf8');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return values;
}
