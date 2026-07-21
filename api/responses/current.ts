import { currentResponseRequestSchema, currentResponseResultSchema } from '../../shared/validation.js';
import { unauthorized } from '../_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import {
  assertRpcSucceeded,
  parseCurrentResponse,
  type RpcClient,
} from '../_lib/questionnaire.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from '../_lib/telegram-auth.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

type CurrentRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type CurrentDependencies = {
  getClient: () => RpcClient;
  requireTelegramIdentity: (request: CurrentRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: CurrentDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  requireTelegramIdentity,
};

export function createCurrentResponseHandler(overrides: Partial<CurrentDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function currentResponseHandler(request: CurrentRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      parseJsonBody(request, currentResponseRequestSchema);
      const identity = dependencies.requireTelegramIdentity(request);
      const client = dependencies.getClient();
      const currentResult = await client.rpc('get_current_response', {
        p_telegram_user_id: identity.user.id,
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
