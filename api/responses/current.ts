import { currentResponseRequestSchema, currentResponseResultSchema } from '../../shared/validation.js';
import { unauthorized } from '../_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import { assertSameOrigin } from '../_lib/origin.js';
import {
  assertRpcSucceeded,
  parseCurrentResponse,
  readActiveIntakeYear,
  type RpcClient,
} from '../_lib/questionnaire.js';
import { hashIdentity } from '../_lib/identity.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from '../_lib/telegram-auth.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

type CurrentRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type CurrentDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: CurrentRequest) => void;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  requireTelegramIdentity: (request: CurrentRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: CurrentDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  hashIdentity,
  assertSameOrigin,
  requireTelegramIdentity,
};

export function createCurrentResponseHandler(overrides: Partial<CurrentDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function currentResponseHandler(request: CurrentRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      parseJsonBody(request, currentResponseRequestSchema);
      const identity = dependencies.requireTelegramIdentity(request);
      const client = dependencies.getClient();
      const currentResult = await client.rpc('get_current_response', {
        p_identity_hash: dependencies.hashIdentity(identity),
        p_intake_year: await readActiveIntakeYear(client),
      });
      assertRpcSucceeded(currentResult.error);
      if (currentResult.data === null) throw unauthorized();
      const result = currentResponseResultSchema.parse({
        response: parseCurrentResponse(currentResult.data),
      });
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createCurrentResponseHandler();
