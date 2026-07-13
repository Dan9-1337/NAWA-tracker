import {
  rotateRecoveryRequestSchema,
  rotateRecoveryResultSchema,
} from '../../shared/validation.js';
import { loadServerEnv } from '../_lib/env.js';
import { unauthorized } from '../_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import { assertSameOrigin } from '../_lib/origin.js';
import { assertRpcSucceeded, type RpcClient } from '../_lib/questionnaire.js';
import { requireSession, type AuthenticatedSession } from '../_lib/session.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';
import { buildRecoveryUrl, generateOpaqueToken, hashRecoveryToken } from '../_lib/tokens.js';

type RotateRecoveryRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

export type RotateRecoveryDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: RotateRecoveryRequest) => void;
  requireSession: (
    request: RotateRecoveryRequest,
    client: RpcClient,
  ) => Promise<AuthenticatedSession>;
  generateOpaqueToken: () => string;
  hashRecoveryToken: (token: string) => string;
  loadServerEnv: () => { appPublicUrl: string };
};

const defaultDependencies: RotateRecoveryDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  requireSession,
  generateOpaqueToken,
  hashRecoveryToken,
  loadServerEnv,
};

export function createRotateRecoveryHandler(overrides: Partial<RotateRecoveryDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function rotateRecoveryHandler(
    request: RotateRecoveryRequest,
    response: HttpResponse,
  ): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      parseJsonBody(request, rotateRecoveryRequestSchema);
      const client = dependencies.getClient();
      const session = await dependencies.requireSession(request, client);
      const recoveryToken = dependencies.generateOpaqueToken();
      const rotationResult = await client.rpc('rotate_recovery_token', {
        p_session_token_hash: session.sessionTokenHash,
        p_new_recovery_token_hash: dependencies.hashRecoveryToken(recoveryToken),
      });
      assertRpcSucceeded(rotationResult.error);
      if (rotationResult.data !== true) {
        if (rotationResult.data === false) throw unauthorized();
        throw new Error('Invalid RPC result');
      }

      const result = rotateRecoveryResultSchema.parse({
        recoveryToken,
        recoveryUrl: buildRecoveryUrl(dependencies.loadServerEnv().appPublicUrl, recoveryToken),
      });
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createRotateRecoveryHandler();
