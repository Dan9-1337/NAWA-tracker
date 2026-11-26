import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from '@vercel/og';
import { createElement, type CSSProperties, type ReactElement } from 'react';

import { getCountryDisplayName } from '../shared/countries.js';
import { loadShareCardSecret } from './_lib/env.js';
import { assertMethod, sendError, type HttpResponse } from './_lib/http.js';
import { verifyShareCard, type ShareCardLocale, type ShareCardValues } from './_lib/share-card-signature.js';
import { HttpError } from './_lib/errors.js';

/**
 * PROTOTYPE (task 066 spike), not wired into the UI: `GET /api/share-card?s=&c=&l=&t=` renders a 1080×1920 PNG
 * from signed display values only. See docs/research/share-card-spike.md.
 */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;
export const SHARE_CARD_CACHE_CONTROL = 'public, immutable, max-age=31536000';

type ShareCardRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type ShareCardResponse = HttpResponse & { send?(body: Buffer): unknown };

type FontWeight = 500 | 600;
type ShareCardFont = { name: string; data: Buffer; weight: FontWeight; style: 'normal' };

/** Prototype copy; final wording belongs to task 067. ru status matches task 054. */
const copy: Record<ShareCardLocale, { status: string; unofficial: string }> = {
  ru: { status: 'Порог 60 пройден', unofficial: 'неофициально' },
  uk: { status: 'Поріг 60 пройдено', unofficial: 'неофіційно' },
  be: { status: 'Парог 60 пройдзены', unofficial: 'неафіцыйна' },
  pl: { status: 'Próg 60 przekroczony', unofficial: 'nieoficjalnie' },
  en: { status: 'Threshold 60 passed', unofficial: 'unofficial' },
};

// woff, not woff2: satori cannot parse woff2 (checked in the spike). Each family needs latin, latin-ext and cyrillic.
const FONT_FILES: Array<{ name: string; file: string; weight: FontWeight }> = [
  ...['latin', 'latin-ext', 'cyrillic'].map((subset) => ({
    name: 'Oswald',
    file: `node_modules/@fontsource/oswald/files/oswald-${subset}-600-normal.woff`,
    weight: 600 as const,
  })),
  ...['latin', 'latin-ext', 'cyrillic'].map((subset) => ({
    name: 'Golos Text',
    file: `node_modules/@fontsource/golos-text/files/golos-text-${subset}-500-normal.woff`,
    weight: 500 as const,
  })),
];

let cachedFonts: ShareCardFont[] | null = null;

/** Read once per warm instance; on Vercel the files come in through `includeFiles` in vercel.json. */
function loadFonts(root = process.cwd()): ShareCardFont[] {
  cachedFonts ??= FONT_FILES.map(({ name, file, weight }) => ({
    name,
    data: readFileSync(join(root, file)),
    weight,
    style: 'normal',
  }));
  return cachedFonts;
}

function flagDataUri(country: string, root = process.cwd()): string | null {
  try {
    const svg = readFileSync(join(root, 'public/flags', `${country.toLowerCase()}.svg`));
    return `data:image/svg+xml;base64,${svg.toString('base64')}`;
  } catch {
    return null;
  }
}

const CHECK_ICON =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  ).toString('base64');

function formatScore(score: string, locale: ShareCardLocale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(score));
}

function el(type: string, style: CSSProperties, ...children: Array<ReactElement | string | null>): ReactElement {
  return createElement(type, { style }, ...children);
}

function img(src: string, size: number): ReactElement {
  return createElement('img', { src, width: size, height: size, style: { width: size, height: size } });
}

export type ShareCardRenderOptions = {
  botUsername: string;
  /** Test-only extra line (glyph coverage samples); never reachable from the URL. */
  extraLine?: string;
};

export function shareCardElement(values: ShareCardValues, options: ShareCardRenderOptions): ReactElement {
  const text = copy[values.locale];
  const countryName = getCountryDisplayName(values.country, values.locale) ?? values.country;
  const flag = flagDataUri(values.country);

  return el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '200px 80px 160px',
      background: 'linear-gradient(180deg, #0f1b3d 0%, #172554 55%, #1e3a8a 100%)',
      color: '#f8fafc',
      fontFamily: 'Golos Text',
    },
    el(
      'div',
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56 },
      el(
        'div',
        { display: 'flex', alignItems: 'center', gap: 32, fontSize: 64, fontWeight: 500 },
        flag ? img(flag, 112) : null,
        el('div', { display: 'flex', maxWidth: 760, textAlign: 'center' }, countryName),
      ),
      el(
        'div',
        { display: 'flex', fontFamily: 'Oswald', fontWeight: 600, fontSize: 380, lineHeight: 1, letterSpacing: -6 },
        formatScore(values.score, values.locale),
      ),
      el(
        'div',
        { display: 'flex', alignItems: 'center', gap: 20, fontSize: 60, fontWeight: 500, color: '#bbf7d0' },
        img(CHECK_ICON, 64),
        el('div', { display: 'flex' }, text.status),
      ),
      options.extraLine
        ? el('div', { display: 'flex', fontSize: 56, color: '#e2e8f0', textAlign: 'center' }, options.extraLine)
        : null,
      options.extraLine
        ? el('div', { display: 'flex', fontFamily: 'Oswald', fontWeight: 600, fontSize: 56 }, options.extraLine)
        : null,
    ),
    el(
      'div',
      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, fontWeight: 500 },
      el('div', { display: 'flex', fontSize: 48, color: '#cbd5e1' }, `NAWAmeter · ${text.unofficial}`),
      el('div', { display: 'flex', fontSize: 52, color: '#f8fafc' }, `@${options.botUsername}`),
    ),
  );
}

export async function renderShareCardPng(values: ShareCardValues, options: ShareCardRenderOptions): Promise<Buffer> {
  const image = new ImageResponse(shareCardElement(values, options), {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    fonts: loadFonts(),
  });
  return Buffer.from(await image.arrayBuffer());
}

export type ShareCardHandlerDependencies = {
  getSecret: () => string | null;
  botUsername: () => string;
  render: typeof renderShareCardPng;
};

const defaultDependencies: ShareCardHandlerDependencies = {
  getSecret: () => loadShareCardSecret(),
  botUsername: () => process.env.VITE_TELEGRAM_BOT_USERNAME || 'nawa_tracker_bot',
  render: renderShareCardPng,
};

export function createShareCardHandler(overrides: Partial<ShareCardHandlerDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function shareCardHandler(request: ShareCardRequest, response: ShareCardResponse): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      assertMethod(request, response, 'GET');
      const secret = dependencies.getSecret();
      if (!secret) throw new HttpError(503, 'SHARE_CARD_DISABLED', 'Share cards are not configured.');

      const values = verifyShareCard(request.query ?? {}, secret);
      if (!values) throw new HttpError(403, 'INVALID_SIGNATURE', 'The share card link is not valid.');
      if (!response.send) throw new Error('Response cannot send binary data');

      const png = await dependencies.render(values, { botUsername: dependencies.botUsername() });
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Content-Length', String(png.length));
      response.setHeader('Cache-Control', SHARE_CARD_CACHE_CONTROL);
      response.status(200);
      response.send(png);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createShareCardHandler();
