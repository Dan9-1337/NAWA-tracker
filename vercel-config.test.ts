import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

type VercelHeader = { key: string; value: string };
type VercelConfig = { headers?: Array<{ source: string; headers: VercelHeader[] }> };

const config = JSON.parse(
  readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig;

function browserHeaders(): Map<string, string> {
  const rule = config.headers?.find(({ source }) => source === '/(.*)');
  return new Map(rule?.headers.map(({ key, value }) => [key.toLowerCase(), value]) ?? []);
}

describe('Vercel browser security headers', () => {
  it('sets a Vite and Cloudflare Turnstile compatible CSP', () => {
    const csp = browserHeaders().get('content-security-policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' https://challenges.cloudflare.com");
    expect(csp).toContain('frame-src https://challenges.cloudflare.com');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('sets MIME, referrer, and restrained browser capability policies', () => {
    const headers = browserHeaders();

    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('referrer-policy')).toBe('no-referrer');
    expect(headers.get('permissions-policy')).toContain('camera=()');
    expect(headers.get('permissions-policy')).toContain('microphone=()');
    expect(headers.get('permissions-policy')).toContain('geolocation=()');
    expect(headers.get('permissions-policy')).toContain('payment=()');
  });
});
