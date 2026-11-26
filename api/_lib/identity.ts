import { createHmac } from 'node:crypto';

import { loadServerEnv } from './env.js';
import type { VerifiedTelegramIdentity } from './telegram-auth.js';

/**
 * Pseudonymous account key stored instead of the Telegram id: HMAC-SHA256(IDENTITY_PEPPER, id), hex.
 * The database never sees the id, so a database export alone cannot be resolved to Telegram accounts.
 * The operator holding the pepper can still recompute hashes, which is why the product says "pseudonymous".
 */
export function hashTelegramId(telegramUserId: number, pepper: string): string {
  return createHmac('sha256', pepper).update(String(telegramUserId), 'utf8').digest('hex');
}

export function hashIdentity(identity: VerifiedTelegramIdentity): string {
  return hashTelegramId(identity.user.id, loadServerEnv().identityPepper);
}
