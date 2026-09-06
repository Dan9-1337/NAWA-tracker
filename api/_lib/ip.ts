import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

import { loadServerEnv } from './env.js';
import { HttpError } from './errors.js';

type IpRequest = {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | undefined };
};

function canonicalizeIp(value: string): string {
  if (value !== value.trim()) throw new Error('Invalid client IP');

  const version = isIP(value);
  if (version === 4) return value;
  if (version !== 6) throw new Error('Invalid client IP');

  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1);
  } catch {
    throw new Error('Invalid client IP');
  }
}

export function getClientIp(request: IpRequest): string {
  const env = loadServerEnv();
  let ip: string | undefined;

  if (env.isVercel) {
    const forwardedFor = request.headers['x-vercel-forwarded-for'];
    if (typeof forwardedFor !== 'string' || forwardedFor.includes(',')) {
      throw new HttpError(400, 'CLIENT_IP_UNAVAILABLE', 'Nie można zweryfikować adresu klienta.');
    }
    ip = forwardedFor;
  } else if (env.isLocalDevelopment) {
    ip = request.socket?.remoteAddress;
  }

  if (!ip) {
    throw new HttpError(400, 'CLIENT_IP_UNAVAILABLE', 'Nie można zweryfikować adresu klienta.');
  }

  try {
    return canonicalizeIp(ip);
  } catch {
    throw new HttpError(400, 'CLIENT_IP_UNAVAILABLE', 'Nie można zweryfikować adresu klienta.');
  }
}

export function hashIp(ip: string): string {
  const canonicalIp = canonicalizeIp(ip);
  return createHmac('sha256', loadServerEnv().ipHashSalt)
    .update(`ip\0${canonicalIp}`, 'utf8')
    .digest('hex');
}
