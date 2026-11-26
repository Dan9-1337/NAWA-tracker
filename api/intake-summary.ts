import { intakeSummaryRequestSchema, intakeSummaryResultSchema } from '../shared/validation.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { assertSameOrigin } from './_lib/origin.js';
import { assertRpcSucceeded, type RpcClient } from './_lib/questionnaire.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type IntakeSummaryRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type IntakeSummaryDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: IntakeSummaryRequest) => void;
  requireTelegramIdentity: (request: IntakeSummaryRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: IntakeSummaryDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  requireTelegramIdentity,
};

/**
 * The landing counter. It needs a verified Telegram identity but no saved profile: the start screen renders
 * before the visitor has a response. The RPC exposes only the active intake year and a count above the floor.
 */
export function createIntakeSummaryHandler(overrides: Partial<IntakeSummaryDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function intakeSummaryHandler(
    request: IntakeSummaryRequest,
    response: HttpResponse,
  ): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      parseJsonBody(request, intakeSummaryRequestSchema);
      dependencies.requireTelegramIdentity(request);
      const client = dependencies.getClient();
      const summaryResult = await client.rpc('get_intake_summary', {});
      assertRpcSucceeded(summaryResult.error);
      const result = intakeSummaryResultSchema.parse(summaryResult.data);
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createIntakeSummaryHandler();
