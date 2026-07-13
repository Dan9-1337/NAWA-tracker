import { readCookie } from './cookies.js';
import { loadServerEnv } from './env.js';
import { HttpError, unauthorized } from './errors.js';
import { getSupabaseAdmin } from './supabase-admin.js';
import { hashSessionToken } from './tokens.js';

type SessionRequest = {
  headers: Record<string, string | string[] | undefined>;
};

type RpcError = { message: string };

export type SessionRpcClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcError | null }>;
};

export type AuthenticatedSession = {
  responseId: string;
  sessionTokenHash: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function requireSession(
  request: SessionRequest,
  client: SessionRpcClient = getSupabaseAdmin(),
): Promise<AuthenticatedSession> {
  const cookieHeader = request.headers.cookie;
  const token = readCookie(cookieHeader, loadServerEnv().sessionCookieName);

  if (!token) throw unauthorized();

  let sessionTokenHash: string;
  try {
    sessionTokenHash = hashSessionToken(token);
  } catch {
    throw unauthorized();
  }

  const { data, error } = await client.rpc('resolve_anonymous_session', {
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    throw new HttpError(500, 'INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd.');
  }
  if (typeof data !== 'string' || !UUID_PATTERN.test(data)) {
    throw unauthorized();
  }

  return { responseId: data, sessionTokenHash };
}
