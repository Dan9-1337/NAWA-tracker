import { z } from 'zod';

import {
  restoreSessionRequestSchema,
  restoreSessionResultSchema,
} from '../../shared/validation.js';
import { setSessionCookie } from '../_lib/cookies.js';
import { loadServerEnv } from '../_lib/env.js';
import { HttpError } from '../_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import { getClientIp, hashIp } from '../_lib/ip.js';
import { assertSameOrigin } from '../_lib/origin.js';
import {
  assertRpcSucceeded,
  parseCurrentResponse,
  type RpcClient,
} from '../_lib/questionnaire.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';
import {
  generateOpaqueToken,
  hashRecoveryAttemptToken,
  hashSessionToken,
} from '../_lib/tokens.js';
import { verifyTurnstile } from '../_lib/turnstile.js';

type RestoreRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

export type RestoreDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: RestoreRequest) => void;
  verifyTurnstile: (token: string, remoteIp?: string) => Promise<void>;
  getClientIp: (request: RestoreRequest) => string;
  hashIp: (ip: string) => string;
  generateOpaqueToken: () => string;
  hashRecoveryAttemptToken: (token: string) => string;
  hashSessionToken: (token: string) => string;
  setSessionCookie: (response: HttpResponse, token: string) => void;
  loadServerEnv: () => { sessionMaxAgeDays: number };
  now: () => Date;
};

const defaultDependencies: RestoreDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  verifyTurnstile,
  getClientIp,
  hashIp,
  generateOpaqueToken,
  hashRecoveryAttemptToken,
  hashSessionToken,
  setSessionCookie,
  loadServerEnv,
  now: () => new Date(),
};

const restoreRpcResultSchema = z
  .object({
    restored: z.boolean(),
    rateLimited: z.boolean(),
  })
  .refine((value) => !(value.restored && value.rateLimited));

function parseRestoreRpcResult(value: unknown): z.infer<typeof restoreRpcResultSchema> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid RPC result');
  }
  const source = value as Record<string, unknown>;
  return restoreRpcResultSchema.parse({
    restored: source.restored,
    rateLimited: source.rateLimited,
  });
}

function sessionExpiry(now: Date, maxAgeDays: number): string {
  return new Date(now.getTime() + maxAgeDays * 86400 * 1000).toISOString();
}

function recoveryFailed(): HttpError {
  return new HttpError(
    400,
    'RECOVERY_FAILED',
    'Nie udało się odzyskać ankiety. Sprawdź kod i spróbuj ponownie.',
  );
}

export function createRestoreHandler(overrides: Partial<RestoreDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function restoreHandler(request: RestoreRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      const input = parseJsonBody(request, restoreSessionRequestSchema);
      const clientIp = dependencies.getClientIp(request);
      await dependencies.verifyTurnstile(input.turnstileToken, clientIp);

      const newSessionToken = dependencies.generateOpaqueToken();
      const newSessionTokenHash = dependencies.hashSessionToken(newSessionToken);
      const environment = dependencies.loadServerEnv();
      const client = dependencies.getClient();
      const restoreResult = await client.rpc('restore_anonymous_session', {
        p_recovery_token_hash: dependencies.hashRecoveryAttemptToken(input.recoveryToken),
        p_session_token_hash: newSessionTokenHash,
        p_session_expires_at: sessionExpiry(dependencies.now(), environment.sessionMaxAgeDays),
        p_ip_hash: dependencies.hashIp(clientIp),
      });
      assertRpcSucceeded(restoreResult.error);
      const restored = parseRestoreRpcResult(restoreResult.data);

      if (restored.rateLimited) {
        throw new HttpError(
          429,
          'RECOVERY_RATE_LIMITED',
          'Przekroczono limit prób odzyskiwania. Spróbuj ponownie później.',
        );
      }
      if (!restored.restored) throw recoveryFailed();

      const currentResult = await client.rpc('get_current_response', {
        p_session_token_hash: newSessionTokenHash,
      });
      assertRpcSucceeded(currentResult.error);
      if (currentResult.data === null) throw new Error('Invalid restored session');
      const result = restoreSessionResultSchema.parse({
        response: parseCurrentResponse(currentResult.data),
      });

      dependencies.setSessionCookie(response, newSessionToken);
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createRestoreHandler();
