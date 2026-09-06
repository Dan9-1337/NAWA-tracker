import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { ResponseFormInput } from '../../shared/contracts.js';
import {
  responseFormInputSchema,
  responseFormStoredSchema,
  statisticsResultSchema,
} from '../../shared/validation.js';
import { HttpError, unauthorized } from './errors.js';

type RpcError = { message: string };

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
  'hasPolishCitizenship',
  'rankingCountry',
  'schoolCountry',
  'scholarshipTrack',
  'studyRoute',
  'targetUniversity',
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
  'gradesScore',
  'polishSchoolBonus',
  'trackWideMedian',
  'scoreBuckets',
  'cohortScores',
  'growth7d',
  'history',
  'groupProgress',
  'reportedMeritOutcomes',
  'globalBenchmark',
  'countryContext',
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
    p_has_polish_citizenship: response.hasPolishCitizenship,
    p_ranking_country: response.rankingCountry,
    p_school_country: response.schoolCountry,
    p_scholarship_track: response.scholarshipTrack,
    p_study_route: response.studyRoute,
    p_target_university: response.targetUniversity ?? null,
    p_average_grade: response.averageGrade,
    p_maximum_grade: response.maximumGrade,
    p_polish_school_level: response.polishSchoolLevel ?? null,
    p_current_status: response.currentStatus,
    p_status_changed_at: response.statusChangedAt,
  };
}

export function fingerprintQuestionnaire(response: ResponseFormInput): string {
  return createHash('sha256').update(JSON.stringify(normalizeQuestionnaire(response)), 'utf8').digest('hex');
}

export function parseCurrentResponse(value: unknown): ResponseFormInput {
  return responseFormStoredSchema.parse(projectFields(value, responseFields));
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

export function assertRpcSucceeded(error: RpcError | null): void {
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd.');
}
