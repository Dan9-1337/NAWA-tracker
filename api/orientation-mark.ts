import { z } from 'zod';

import type { OrientationMarkResult } from '../shared/contracts.js';
import { scholarshipReportIntakeYear } from '../shared/scholarship-report.js';
import { orientationMarkResultSchema } from '../shared/validation.js';
import { profileNotFound } from './_lib/errors.js';
import { assertMethod, sendError, type HttpResponse } from './_lib/http.js';
import { hashIdentity } from './_lib/identity.js';
import { assertSameOriginWhenPresent } from './_lib/origin.js';
import { assertRpcSucceeded, type RpcClient } from './_lib/questionnaire.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';

type OrientationMarkRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

export type OrientationMarkHandlerDependencies = {
  getClient: () => RpcClient;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  /** GET requests from the same origin normally carry no Origin header; only a present, different one is refused. */
  assertSameOriginWhenPresent: (request: OrientationMarkRequest) => void;
  requireTelegramIdentity: (request: OrientationMarkRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: OrientationMarkHandlerDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  hashIdentity,
  assertSameOriginWhenPresent,
  requireTelegramIdentity,
};

/** The RPC shape before the public contract removes the null score list. */
const orientationMarkRpcSchema = z
  .object({
    mark: z.number().nullable(),
    n: z.number().int().nonnegative(),
    scores: z.array(z.number()).nullable(),
  })
  .strict();

function queryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * `GET /api/orientation-mark`: the caller's country mark (ADR 0017). The holder score list is asked for only
 * with `?distribution=1`, so it travels only together with the full distribution.
 */
export function createOrientationMarkHandler(
  overrides: Partial<OrientationMarkHandlerDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function orientationMarkHandler(
    request: OrientationMarkRequest,
    response: HttpResponse,
  ): Promise<void> {
    try {
      assertMethod(request, response, 'GET');
      dependencies.assertSameOriginWhenPresent(request);
      const identity = dependencies.requireTelegramIdentity(request);
      const includeScores = queryValue(request.query?.distribution) === '1';
      const client = dependencies.getClient();

      const markResult = await client.rpc('get_orientation_mark', {
        p_identity_hash: dependencies.hashIdentity(identity),
        p_intake_year: scholarshipReportIntakeYear,
        p_include_scores: includeScores,
      });
      assertRpcSucceeded(markResult.error);
      if (markResult.data === null) throw profileNotFound();

      const rpc = orientationMarkRpcSchema.parse(markResult.data);
      // The score list belongs to the full-distribution request only; never forward it otherwise.
      const scores = includeScores ? rpc.scores : null;
      const result: OrientationMarkResult = {
        mark: rpc.mark,
        n: rpc.n,
        ...(scores ? { scores } : {}),
      };
      response.status(200).json(orientationMarkResultSchema.parse(result));
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createOrientationMarkHandler();
