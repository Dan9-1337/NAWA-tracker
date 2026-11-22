import type { CreateResponseResult, DeleteResponseResult, UpdateResponseResult } from '../shared/contracts.js';
import { currentIntakeYear } from '../shared/season.js';
import {
  createResponseRequestSchema,
  createResponseResultSchema,
  deleteResponseResultSchema,
  updateResponseRequestSchema,
  updateResponseResultSchema,
} from '../shared/validation.js';
import { invalidIntakeYear, profileExists, profileNotFound } from './_lib/errors.js';
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
  type RpcError,
} from './_lib/questionnaire.js';
import { hashIdentity } from './_lib/identity.js';
import { createSupabaseSubscriptionStore } from './_lib/subscriptions.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type ResponsesRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

export type ResponsesHandlerDependencies = {
  getClient: () => RpcClient;
  /** Removes every intake year of the profile, the user's product events and the opt-in bot subscription. */
  deleteProfile: (identityHash: string, telegramUserId: number) => Promise<number>;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  assertSameOrigin: (request: ResponsesRequest) => void;
  requireTelegramIdentity: (request: ResponsesRequest) => VerifiedTelegramIdentity;
};

/**
 * Deletes everything DELETE /api/responses owns for one caller. Events go first so a failed events delete
 * leaves the survey intact and the request can be retried.
 */
export function createDeleteProfile(getClient: () => ReturnType<typeof getSupabaseAdmin>) {
  return async function deleteProfile(identityHash: string, telegramUserId: number): Promise<number> {
    const client = getClient();

    const eventsResult = await client.from('product_events').delete().eq('identity_hash', identityHash);
    if (eventsResult.error) {
      throw eventsResult.error;
    }

    const deleteResult = await client.from('responses').delete().eq('identity_hash', identityHash).select('id');
    if (deleteResult.error) {
      throw deleteResult.error;
    }

    await createSupabaseSubscriptionStore(() => client).remove(telegramUserId);
    return deleteResult.data?.length ?? 0;
  };
}

const defaultDependencies: ResponsesHandlerDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  deleteProfile: createDeleteProfile(getSupabaseAdmin),
  hashIdentity,
  assertSameOrigin,
  requireTelegramIdentity,
};

function isProfileExistsError(error: RpcError | null): boolean {
  if (!error) return false;
  if (error.message === 'profile_exists') return true;
  if (error.code === '23505') return true;
  return /duplicate key|unique constraint/i.test(error.message);
}

function assertCreateSucceeded(error: RpcError | null): void {
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
        if (input.response.intakeYear !== currentIntakeYear) throw invalidIntakeYear();
        const client = dependencies.getClient();
        const createResult = await client.rpc('create_response_for_identity', {
          p_identity_hash: dependencies.hashIdentity(identity),
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
        if (input.response.intakeYear !== currentIntakeYear) throw invalidIntakeYear();
        const client = dependencies.getClient();
        const updateResult = await client.rpc('update_current_response', {
          p_identity_hash: dependencies.hashIdentity(identity),
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

      if (request.method === 'DELETE') {
        dependencies.assertSameOrigin(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const deletedCount = await dependencies.deleteProfile(dependencies.hashIdentity(identity), identity.user.id);
        if (deletedCount === 0) {
          throw profileNotFound();
        }
        const result: DeleteResponseResult = deleteResponseResultSchema.parse({ deleted: true });
        response.status(200).json(result);
        return;
      }

      assertMethod(request, response, ['POST', 'PUT', 'DELETE']);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createResponsesHandler();
