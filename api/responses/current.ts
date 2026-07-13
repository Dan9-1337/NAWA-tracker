import { currentResponseRequestSchema, currentResponseResultSchema } from '../../shared/validation.js';
import { unauthorized } from '../_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import {
  assertRpcSucceeded,
  parseCurrentResponse,
  type RpcClient,
} from '../_lib/questionnaire.js';
import { requireSession, type AuthenticatedSession } from '../_lib/session.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

type CurrentRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type CurrentDependencies = {
  getClient: () => RpcClient;
  requireSession: (request: CurrentRequest, client: RpcClient) => Promise<AuthenticatedSession>;
};

const defaultDependencies: CurrentDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  requireSession,
};

export function createCurrentResponseHandler(overrides: Partial<CurrentDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function currentResponseHandler(request: CurrentRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      parseJsonBody(request, currentResponseRequestSchema);
      const client = dependencies.getClient();
      const session = await dependencies.requireSession(request, client);
      const currentResult = await client.rpc('get_current_response', {
        p_session_token_hash: session.sessionTokenHash,
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
