import type { CreateResponseResult, UpdateResponseResult } from '../shared/contracts.js';
import {
  createResponseRequestSchema,
  createResponseResultSchema,
  updateResponseRequestSchema,
  updateResponseResultSchema,
} from '../shared/validation.js';
import { profileExists } from './_lib/errors.js';
import {
  assertMethod,
  parseJsonBody,
  sendError,
  type HttpResponse,
} from './_lib/http.js';
import { assertSameOrigin } from './_lib/origin.js';
import {
  assertRpcSucceeded,
  normalizeQuestionnaire,
  parseCreateMutationResult,
  parseUpdateMutationResult,
  type RpcClient,
} from './_lib/questionnaire.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type ResponsesRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

export type ResponsesHandlerDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: ResponsesRequest) => void;
  requireTelegramIdentity: (request: ResponsesRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: ResponsesHandlerDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  requireTelegramIdentity,
};

function isProfileExistsError(error: { message: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.message === 'profile_exists') return true;
  if (error.code === '23505') return true;
  return /duplicate key|unique constraint/i.test(error.message);
}

function assertCreateSucceeded(error: { message: string; code?: string } | null): void {
  if (isProfileExistsError(error)) {
    throw profileExists();
  }
  assertRpcSucceeded(error);
}

export function createResponsesHandler(overrides: Partial<ResponsesHandlerDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function responsesHandler(request: ResponsesRequest, response: HttpResponse): Promise<void> {
    try {
      if (request.method === 'POST') {
        dependencies.assertSameOrigin(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const input = parseJsonBody(request, createResponseRequestSchema);
        const client = dependencies.getClient();
        const createResult = await client.rpc('create_response_for_telegram_user', {
          p_telegram_user_id: identity.user.id,
          p_telegram_username: identity.user.username ?? null,
          ...normalizeQuestionnaire(input.response),
        });
        assertCreateSucceeded(createResult.error);
        const mutation = parseCreateMutationResult(createResult.data);
        const result: CreateResponseResult = createResponseResultSchema.parse({
          created: true,
          statistics: mutation.statistics,
        });
        response.status(201).json(result);
        return;
      }

      if (request.method === 'PUT') {
        dependencies.assertSameOrigin(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const input = parseJsonBody(request, updateResponseRequestSchema);
        const client = dependencies.getClient();
        const updateResult = await client.rpc('update_current_response', {
          p_telegram_user_id: identity.user.id,
          p_telegram_username: identity.user.username ?? null,
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
