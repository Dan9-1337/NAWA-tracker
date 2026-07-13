import { createHmac, randomBytes } from 'node:crypto';

import { canonicalOpaqueTokenPattern } from '../../shared/validation.js';
import { loadServerEnv } from './env.js';

const MAX_RECOVERY_ATTEMPT_TOKEN_LENGTH = 16 * 1024;

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function assertCanonicalToken(token: string): void {
  if (!canonicalOpaqueTokenPattern.test(token)) {
    throw new Error('Invalid credential format');
  }

  const decoded = Buffer.from(token, 'base64url');
  if (decoded.length !== 32 || decoded.toString('base64url') !== token) {
    throw new Error('Invalid credential format');
  }
}

function hashCredentialValue(token: string, secret: string, domain: string): string {
  return createHmac('sha256', secret).update(`${domain}\0${token}`, 'utf8').digest('hex');
}

export function hashRecoveryToken(token: string): string {
  assertCanonicalToken(token);
  return hashCredentialValue(token, loadServerEnv().recoveryHmacSecret, 'recovery');
}

export function hashRecoveryAttemptToken(token: string): string {
  if (token.length > MAX_RECOVERY_ATTEMPT_TOKEN_LENGTH) {
    throw new Error('Invalid recovery attempt value');
  }
  return hashCredentialValue(token, loadServerEnv().recoveryHmacSecret, 'recovery');
}

export function hashSessionToken(token: string): string {
  assertCanonicalToken(token);
  return hashCredentialValue(token, loadServerEnv().sessionHmacSecret, 'session');
}

export function buildRecoveryUrl(appPublicUrl: string, token: string): string {
  assertCanonicalToken(token);
  const recoveryUrl = new URL(appPublicUrl);
  recoveryUrl.pathname = `${recoveryUrl.pathname.replace(/\/+$/, '')}/`;
  recoveryUrl.hash = `restore=${token}`;
  return recoveryUrl.toString();
}
