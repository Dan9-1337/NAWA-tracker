import { statisticsRequestSchema, statisticsResultSchema } from '../shared/validation.js';
import { unauthorized } from './_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { assertSameOrigin } from './_lib/origin.js';
import { assertRpcSucceeded, parseStatistics, readActiveIntakeYear, type RpcClient } from './_lib/questionnaire.js';
import { hashIdentity } from './_lib/identity.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type StatisticsRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type StatisticsDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: StatisticsRequest) => void;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  requireTelegramIdentity: (request: StatisticsRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: StatisticsDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  hashIdentity,
  assertSameOrigin,
  requireTelegramIdentity,
};

export function createStatisticsHandler(overrides: Partial<StatisticsDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function statisticsHandler(request: StatisticsRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      parseJsonBody(request, statisticsRequestSchema);
      const identity = dependencies.requireTelegramIdentity(request);
      const client = dependencies.getClient();
      const statisticsResult = await client.rpc('get_current_statistics', {
        p_identity_hash: dependencies.hashIdentity(identity),
        p_intake_year: await readActiveIntakeYear(client),
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
