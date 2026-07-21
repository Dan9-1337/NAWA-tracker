import { isIP } from 'node:net';

import { z } from 'zod';

const nonEmptySecret = z.string().min(32);

const serverEnvironmentSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: nonEmptySecret,
  TELEGRAM_BOT_TOKEN: nonEmptySecret,
  IP_HASH_SALT: nonEmptySecret,
  APP_PUBLIC_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL: z.literal('1').optional(),
});

export type ServerEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  telegramBotToken: string;
  ipHashSalt: string;
  appPublicUrl: string;
  appOrigin: string;
  appHostname: string;
  isVercel: boolean;
  isProduction: boolean;
  isLocalDevelopment: boolean;
};

function isValidHostname(hostname: string): boolean {
  const address = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  if (isIP(address) !== 0 || hostname === 'localhost') return true;
  if (hostname.length > 253) return false;

  return hostname.split('.').every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

export function loadServerEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ServerEnv {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    throw new Error('Invalid server environment');
  }

  const publicUrl = new URL(result.data.APP_PUBLIC_URL);
  const supabaseUrl = new URL(result.data.SUPABASE_URL);
  const isVercel = result.data.VERCEL === '1' || result.data.VERCEL_ENV !== undefined;
  const isProduction = result.data.VERCEL_ENV
    ? result.data.VERCEL_ENV === 'production'
    : result.data.NODE_ENV === 'production';

  if (
    result.data.APP_PUBLIC_URL.includes('?') ||
    result.data.APP_PUBLIC_URL.includes('#') ||
    !['http:', 'https:'].includes(publicUrl.protocol) ||
    !['http:', 'https:'].includes(supabaseUrl.protocol) ||
    !isValidHostname(publicUrl.hostname) ||
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.search ||
    publicUrl.hash ||
    supabaseUrl.username ||
    supabaseUrl.password ||
    (isProduction && (publicUrl.protocol !== 'https:' || supabaseUrl.protocol !== 'https:'))
  ) {
    throw new Error('Invalid server environment');
  }

  return {
    supabaseUrl: supabaseUrl.toString().replace(/\/$/, ''),
    supabaseServiceRoleKey: result.data.SUPABASE_SERVICE_ROLE_KEY,
    telegramBotToken: result.data.TELEGRAM_BOT_TOKEN,
    ipHashSalt: result.data.IP_HASH_SALT,
    appPublicUrl: publicUrl.toString().replace(/\/$/, ''),
    appOrigin: publicUrl.origin,
    appHostname: publicUrl.hostname,
    isVercel,
    isProduction,
    isLocalDevelopment: !isVercel && result.data.NODE_ENV !== 'production',
  };
}
