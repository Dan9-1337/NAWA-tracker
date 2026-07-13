import { statisticsRequestSchema, statisticsResultSchema } from '../shared/validation.js';
import { unauthorized } from './_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { assertRpcSucceeded, parseStatistics, type RpcClient } from './_lib/questionnaire.js';
import { requireSession, type AuthenticatedSession } from './_lib/session.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type StatisticsRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type StatisticsDependencies = {
  getClient: () => RpcClient;
  requireSession: (request: StatisticsRequest, client: RpcClient) => Promise<AuthenticatedSession>;
};

const defaultDependencies: StatisticsDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  requireSession,
};

export function createStatisticsHandler(overrides: Partial<StatisticsDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function statisticsHandler(request: StatisticsRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      parseJsonBody(request, statisticsRequestSchema);
      const client = dependencies.getClient();
      const session = await dependencies.requireSession(request, client);
      const statisticsResult = await client.rpc('get_current_statistics', {
        p_session_token_hash: session.sessionTokenHash,
      });
      assertRpcSucceeded(statisticsResult.error);
      if (statisticsResult.data === null) throw unauthorized();
      const result = statisticsResultSchema.parse(parseStatistics(statisticsResult.data));
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createStatisticsHandler();
