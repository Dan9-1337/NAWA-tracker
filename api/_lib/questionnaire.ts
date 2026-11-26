import { z } from 'zod';

import type { ResponseFormInput } from '../../shared/contracts.js';
import {
  responseFormInputSchema,
  statisticsResultSchema,
} from '../../shared/validation.js';
import { editLimitReached, HttpError, unauthorized } from './errors.js';

export type RpcError = { message: string; code?: string; details?: string | null };

export type RpcClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcError | null }>;
};

const createMutationResultSchema = z
  .object({ created: z.literal(true), statistics: statisticsResultSchema })
  .strict();
const updateMutationResultSchema = z
  .object({ updated: z.literal(true), statistics: statisticsResultSchema })
  .strict();

const responseFields = [
  'intakeYear',
  'hasPolishCitizenship',
  'rankingCountry',
  'schoolCountry',
  'scholarshipTrack',
  'studyRoute',
  'targetUniversity',
  'studyField',
  'prepCourseCity',
  'gradeBasis',
  'applicantKind',
  'averageGrade',
  'maximumGrade',
  'polishSchoolLevel',
  'currentStatus',
  'statusChangedAt',
] as const;

const statisticsFields = [
  'detailsAvailable',
  'totalValidResponses',
  'sameTrackCount',
  'sameCountryCount',
  'groupResponseCount',
  'medianScore',
  'lowerScorePercentage',
  'rankPosition',
  'rankTotal',
  'trackWideMedian',
  'scoreBuckets',
  'cohortScope',
  'cohortGroupId',
] as const;

function projectFields(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid RPC result');
  }

  const source = value as Record<string, unknown>;
  const projected: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) projected[field] = source[field];
  }
  return projected;
}

export function normalizeQuestionnaire(response: ResponseFormInput) {
  return {
    p_intake_year: response.intakeYear,
    p_has_polish_citizenship: response.hasPolishCitizenship,
    p_ranking_country: response.rankingCountry,
    p_school_country: response.schoolCountry,
    p_scholarship_track: response.scholarshipTrack,
    p_study_route: response.studyRoute,
    p_target_university: response.targetUniversity ?? null,
    p_study_field: response.studyField,
    p_prep_course_city: response.prepCourseCity ?? null,
    p_grade_basis: response.gradeBasis,
    p_applicant_kind: response.applicantKind,
    p_average_grade: response.averageGrade,
    p_maximum_grade: response.maximumGrade,
    p_polish_school_level: response.polishSchoolLevel ?? null,
    p_current_status: response.currentStatus,
    p_status_changed_at: response.statusChangedAt,
  };
}

export function parseCurrentResponse(value: unknown): ResponseFormInput {
  return responseFormInputSchema.parse(projectFields(value, responseFields));
}

export function parseStatistics(value: unknown) {
  return statisticsResultSchema.parse(projectFields(value, statisticsFields));
}

function parseMutationResult(value: unknown, successField: 'created' | 'updated') {
  if (value === null && successField === 'updated') throw unauthorized();
  const projected = projectFields(value, [successField, 'statistics']);
  projected.statistics = parseStatistics(projected.statistics);
  return successField === 'created'
    ? createMutationResultSchema.parse(projected)
    : updateMutationResultSchema.parse(projected);
}

export function parseCreateMutationResult(value: unknown) {
  return parseMutationResult(value, 'created') as z.infer<typeof createMutationResultSchema>;
}

export function parseUpdateMutationResult(value: unknown) {
  return parseMutationResult(value, 'updated') as z.infer<typeof updateMutationResultSchema>;
}

/**
 * The active intake year, read from `season_config` through the service-role-only RPC (ADR 0018). Every handler
 * that scopes by year calls this instead of carrying its own copy of the year.
 */
export async function readActiveIntakeYear(client: RpcClient): Promise<number> {
  const result = await client.rpc('get_active_intake_year', {});
  assertRpcSucceeded(result.error);
  const year = result.data;
  if (typeof year !== 'number' || !Number.isInteger(year)) {
    throw new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
  return year;
}

export function assertRpcSucceeded(error: RpcError | null): void {
  if (!error) return;
  // The database raises edit_limit_reached with the retry instant in the exception detail (ADR 0013).
  if (error.message === 'edit_limit_reached') throw editLimitReached(error.details);
  throw new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}
