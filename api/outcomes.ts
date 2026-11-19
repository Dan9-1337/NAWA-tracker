import { currentIntakeYear } from '../shared/season.js';
import { cohortOutcomesRequestSchema } from '../shared/validation.js';
import { unauthorized } from './_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { assertSameOrigin } from './_lib/origin.js';
import { assertRpcSucceeded, parseCohortOutcomes, type RpcClient } from './_lib/questionnaire.js';
import { hashIdentity } from './_lib/identity.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type OutcomesRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type OutcomesDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: OutcomesRequest) => void;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  requireTelegramIdentity: (request: OutcomesRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: OutcomesDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  hashIdentity,
  assertSameOrigin,
  requireTelegramIdentity,
};

export function createCohortOutcomesHandler(overrides: Partial<OutcomesDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function cohortOutcomesHandler(request: OutcomesRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      parseJsonBody(request, cohortOutcomesRequestSchema);
      const identity = dependencies.requireTelegramIdentity(request);
      const client = dependencies.getClient();
      const outcomesResult = await client.rpc('get_cohort_outcomes', {
        p_identity_hash: dependencies.hashIdentity(identity),
        p_intake_year: currentIntakeYear,
      });
      assertRpcSucceeded(outcomesResult.error);
      if (outcomesResult.data === null) throw unauthorized();
      response.status(200).json(parseCohortOutcomes(outcomesResult.data));
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createCohortOutcomesHandler();
