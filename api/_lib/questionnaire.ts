import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { ResponseFormInput } from '../../shared/contracts.js';
import {
  responseFormInputSchema,
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
  'scholarshipTrack',
  'studyRoute',
  'studyType',
  'country',
  'gradeScale',
  'customGradeScale',
  'gradeValue',
  'university',
  'studyField',
  'choicePriority',
  'applicationStatus',
  'decisionDate',
] as const;

const statisticsFields = [
  'detailsAvailable',
  'group',
  'totalValidResponses',
  'sameTrackCount',
  'sameUniversityCount',
  'sameUniversityAndFieldCount',
  'groupResponseCount',
  'medianGradePercentage',
  'lowerGradePercentage',
  'waitingForDecisionCount',
  'positiveDecisionCount',
  'negativeDecisionCount',
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
  const gradeScale = response.gradeScale === 'custom' ? response.customGradeScale : response.gradeScale;
  if (gradeScale === undefined) throw new Error('Invalid normalized grade scale');

  return {
    p_scholarship_track: response.scholarshipTrack,
    p_study_route: response.studyRoute,
    p_study_type: response.studyType,
    p_country: response.country,
    p_grade_scale: gradeScale,
    p_grade_value: response.gradeValue,
    p_university: response.university,
    p_study_field: response.studyField,
    p_choice_priority: response.choicePriority,
    p_application_status: response.applicationStatus,
    p_decision_date: response.decisionDate ?? null,
  };
}

export function fingerprintQuestionnaire(response: ResponseFormInput): string {
  return createHash('sha256').update(JSON.stringify(normalizeQuestionnaire(response)), 'utf8').digest('hex');
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

export function assertRpcSucceeded(error: RpcError | null): void {
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd.');
}
