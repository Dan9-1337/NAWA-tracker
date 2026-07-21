import type { PublicStatisticsResult } from '../../shared/contracts.js';
import { publicStatisticsRequestSchema, publicStatisticsResultSchema } from '../../shared/validation.js';
import { HttpError } from '../_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import { getClientIp, hashIp } from '../_lib/ip.js';
import { assertSameOrigin } from '../_lib/origin.js';
import { assertRpcSucceeded, parseStatistics, type RpcClient } from '../_lib/questionnaire.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from '../_lib/telegram-auth.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

type PublicStatisticsRequestShape = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

export type PublicStatisticsDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: PublicStatisticsRequestShape) => void;
  requireTelegramIdentity: (request: PublicStatisticsRequestShape) => VerifiedTelegramIdentity;
  getClientIp: (request: PublicStatisticsRequestShape) => string;
  hashIp: (ip: string) => string;
};

const defaultDependencies: PublicStatisticsDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  requireTelegramIdentity,
  getClientIp,
  hashIp,
};

function assertPublicStatisticsSucceeded(error: { message: string } | null): void {
  if (error?.message === 'public_stats_rate_limited') {
    throw new HttpError(429, 'PUBLIC_STATS_RATE_LIMITED', 'Przekroczono limit zapytań o statystyki. Spróbuj ponownie później.');
  }
  assertRpcSucceeded(error);
}

export function createPublicStatisticsHandler(overrides: Partial<PublicStatisticsDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function publicStatisticsHandler(
    request: PublicStatisticsRequestShape,
    response: HttpResponse,
  ): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      dependencies.requireTelegramIdentity(request);
      const input = parseJsonBody(request, publicStatisticsRequestSchema);
      const clientIp = dependencies.getClientIp(request);
      const client = dependencies.getClient();
      const statisticsResult = await client.rpc('get_public_statistics', {
        p_scholarship_track: input.scholarshipTrack,
        p_ranking_country: input.rankingCountry,
        p_average_grade: input.averageGrade,
        p_maximum_grade: input.maximumGrade,
        p_polish_school_level: input.polishSchoolLevel ?? null,
        p_ip_hash: dependencies.hashIp(clientIp),
      });
      assertPublicStatisticsSucceeded(statisticsResult.error);

      const result: PublicStatisticsResult = publicStatisticsResultSchema.parse(
        parseStatistics(statisticsResult.data),
      );
      response.status(200).json(result);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createPublicStatisticsHandler();
