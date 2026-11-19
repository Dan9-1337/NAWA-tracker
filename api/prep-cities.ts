import { currentIntakeYear } from '../shared/season.js';
import { prepCityRequestSchema } from '../shared/validation.js';
import { unauthorized } from './_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { hashIdentity } from './_lib/identity.js';
import { assertSameOrigin } from './_lib/origin.js';
import { assertRpcSucceeded, parsePrepCityDistribution, type RpcClient } from './_lib/questionnaire.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type PrepCitiesRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type PrepCitiesDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: PrepCitiesRequest) => void;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  requireTelegramIdentity: (request: PrepCitiesRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: PrepCitiesDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  hashIdentity,
  requireTelegramIdentity,
};

/** Where reporters in the caller's study field were sent for the preparatory course (docs/adr/0007). */
export function createPrepCitiesHandler(overrides: Partial<PrepCitiesDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function prepCitiesHandler(request: PrepCitiesRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      parseJsonBody(request, prepCityRequestSchema);
      const identity = dependencies.requireTelegramIdentity(request);
      const client = dependencies.getClient();
      const result = await client.rpc('get_prep_city_distribution', {
        p_identity_hash: dependencies.hashIdentity(identity),
        p_intake_year: currentIntakeYear,
      });
      assertRpcSucceeded(result.error);
      if (result.data === null) throw unauthorized();
      response.status(200).json(parsePrepCityDistribution(result.data));
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createPrepCitiesHandler();
