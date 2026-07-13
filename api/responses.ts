import type { CreateResponseResult, UpdateResponseResult } from '../shared/contracts.js';
import {
  createResponseRequestSchema,
  createResponseResultSchema,
  updateResponseRequestSchema,
  updateResponseResultSchema,
} from '../shared/validation.js';
import { setSessionCookie } from './_lib/cookies.js';
import { loadServerEnv } from './_lib/env.js';
import { HttpError } from './_lib/errors.js';
import {
  assertMethod,
  parseJsonBody,
  sendError,
  type HttpResponse,
} from './_lib/http.js';
import { getClientIp, hashIp } from './_lib/ip.js';
import { assertSameOrigin } from './_lib/origin.js';
import {
  assertRpcSucceeded,
  fingerprintQuestionnaire,
  normalizeQuestionnaire,
  parseCreateMutationResult,
  parseUpdateMutationResult,
  type RpcClient,
} from './_lib/questionnaire.js';
import { requireSession, type AuthenticatedSession } from './_lib/session.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';
import {
  buildRecoveryUrl,
  generateOpaqueToken,
  hashRecoveryToken,
  hashSessionToken,
} from './_lib/tokens.js';
import { verifyTurnstile } from './_lib/turnstile.js';

type ResponsesRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

export type ResponsesHandlerDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: ResponsesRequest) => void;
  verifyTurnstile: (token: string, remoteIp?: string) => Promise<void>;
  getClientIp: (request: ResponsesRequest) => string;
  hashIp: (ip: string) => string;
  generateOpaqueToken: () => string;
  hashRecoveryToken: (token: string) => string;
  hashSessionToken: (token: string) => string;
  setSessionCookie: (response: HttpResponse, token: string) => void;
  requireSession: (request: ResponsesRequest, client: RpcClient) => Promise<AuthenticatedSession>;
  loadServerEnv: () => { appPublicUrl: string; sessionMaxAgeDays: number };
  now: () => Date;
};

const defaultDependencies: ResponsesHandlerDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  verifyTurnstile,
  getClientIp,
  hashIp,
  generateOpaqueToken,
  hashRecoveryToken,
  hashSessionToken,
  setSessionCookie,
  requireSession,
  loadServerEnv,
  now: () => new Date(),
};

function sessionExpiry(now: Date, maxAgeDays: number): string {
  return new Date(now.getTime() + maxAgeDays * 86400 * 1000).toISOString();
}

function assertCreateSucceeded(error: { message: string } | null): void {
  if (error?.message === 'create_rate_limited') {
    throw new HttpError(429, 'CREATE_RATE_LIMITED', 'Przekroczono limit nowych ankiet. Spróbuj ponownie później.');
  }
  assertRpcSucceeded(error);
}

export function createResponsesHandler(overrides: Partial<ResponsesHandlerDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function responsesHandler(request: ResponsesRequest, response: HttpResponse): Promise<void> {
    try {
      if (request.method === 'POST') {
        dependencies.assertSameOrigin(request);
        const input = parseJsonBody(request, createResponseRequestSchema);
        const clientIp = dependencies.getClientIp(request);
        await dependencies.verifyTurnstile(input.turnstileToken, clientIp);

        const recoveryToken = dependencies.generateOpaqueToken();
        const sessionToken = dependencies.generateOpaqueToken();
        const recoveryTokenHash = dependencies.hashRecoveryToken(recoveryToken);
        const sessionTokenHash = dependencies.hashSessionToken(sessionToken);
        const environment = dependencies.loadServerEnv();
        const client = dependencies.getClient();
        const createResult = await client.rpc('create_response_with_session', {
          p_recovery_token_hash: recoveryTokenHash,
          p_session_token_hash: sessionTokenHash,
          p_session_expires_at: sessionExpiry(dependencies.now(), environment.sessionMaxAgeDays),
          p_ip_hash: dependencies.hashIp(clientIp),
          p_response_fingerprint: fingerprintQuestionnaire(input.response),
          ...normalizeQuestionnaire(input.response),
        });
        assertCreateSucceeded(createResult.error);
        const mutation = parseCreateMutationResult(createResult.data);
        const result: CreateResponseResult = createResponseResultSchema.parse({
          created: true,
          recoveryToken,
          recoveryUrl: buildRecoveryUrl(environment.appPublicUrl, recoveryToken),
          statistics: mutation.statistics,
        });

        dependencies.setSessionCookie(response, sessionToken);
        response.status(201).json(result);
        return;
      }

      if (request.method === 'PUT') {
        dependencies.assertSameOrigin(request);
        const input = parseJsonBody(request, updateResponseRequestSchema);
        const client = dependencies.getClient();
        const session = await dependencies.requireSession(request, client);
        const updateResult = await client.rpc('update_current_response', {
          p_session_token_hash: session.sessionTokenHash,
          ...normalizeQuestionnaire(input.response),
        });
        assertRpcSucceeded(updateResult.error);
        const mutation = parseUpdateMutationResult(updateResult.data);
        const result: UpdateResponseResult = updateResponseResultSchema.parse({
          updated: true,
          statistics: mutation.statistics,
        });
        response.status(200).json(result);
        return;
      }

      assertMethod(request, response, ['POST', 'PUT']);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createResponsesHandler();
