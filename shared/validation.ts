import { z } from 'zod';
import {
  applicationStatuses,
  choicePriorities,
  scholarshipTracks,
  studyRoutes,
  studyTypes,
  type ApiError,
  type CreateResponseRequest,
  type CreateResponseResult,
  type CurrentResponseResult,
  type LogoutSessionResult,
  type RecoveryCredential,
  type RestoreSessionRequest,
  type StatisticsResult,
  type UpdateResponseRequest,
  type UpdateResponseResult,
} from './contracts';
import { universities } from './universities';

const baseFormSchema = z
  .object({
    scholarshipTrack: z.enum(scholarshipTracks),
    studyRoute: z.enum(studyRoutes),
    studyType: z.enum(studyTypes),
    country: z.string().trim().min(1).max(100),
    gradeScale: z.union([z.literal(5), z.literal(10), z.literal(12), z.literal(20), z.literal(100), z.literal('custom')]),
    customGradeScale: z.number().int().min(1).max(1000).optional(),
    gradeValue: z.number().min(0),
    university: z.enum(universities),
    studyField: z.string().trim().min(1).max(200),
    choicePriority: z.enum(choicePriorities),
    applicationStatus: z.enum(applicationStatuses),
    decisionDate: z.string().date().nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.gradeScale === 'custom') {
      if (value.customGradeScale === undefined) {
        ctx.addIssue({ code: 'custom', path: ['customGradeScale'], message: 'customGradeScale is required for custom scales' });
      }
    } else if (value.customGradeScale !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['customGradeScale'], message: 'customGradeScale is only allowed for custom scales' });
    }

    if (value.gradeScale !== 'custom' && value.gradeValue > value.gradeScale) {
      ctx.addIssue({ code: 'custom', path: ['gradeValue'], message: 'gradeValue must not exceed the selected scale' });
    }

    if (
      value.gradeScale === 'custom' &&
      value.customGradeScale !== undefined &&
      value.gradeValue > value.customGradeScale
    ) {
      ctx.addIssue({ code: 'custom', path: ['gradeValue'], message: 'gradeValue must not exceed the selected scale' });
    }

    const finalStatuses = new Set(['positive_decision', 'negative_decision']);
    if (!finalStatuses.has(value.applicationStatus) && value.decisionDate != null) {
      ctx.addIssue({ code: 'custom', path: ['decisionDate'], message: 'decisionDate is only allowed for final decisions' });
    }
  });

export const responseFormInputSchema = baseFormSchema;

export const canonicalOpaqueTokenPattern = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
export const canonicalOpaqueTokenSchema = z.string().regex(canonicalOpaqueTokenPattern);

const turnstileTokenSchema = z.string().min(1);
const emptyRequestSchema = z.object({}).strict();

export const createResponseRequestSchema = z
  .object({
    response: responseFormInputSchema,
    turnstileToken: turnstileTokenSchema,
  })
  .strict() satisfies z.ZodType<CreateResponseRequest>;

export const updateResponseRequestSchema = z
  .object({
    response: responseFormInputSchema,
  })
  .strict() satisfies z.ZodType<UpdateResponseRequest>;

export const restoreSessionRequestSchema = z
  .object({
    recoveryToken: z.string().max(16 * 1024),
    turnstileToken: turnstileTokenSchema,
  })
  .strict() satisfies z.ZodType<RestoreSessionRequest>;

export const currentResponseRequestSchema = emptyRequestSchema;
export const statisticsRequestSchema = emptyRequestSchema;
export const logoutSessionRequestSchema = emptyRequestSchema;
export const rotateRecoveryRequestSchema = emptyRequestSchema;

export const statisticsResultSchema = z
  .object({
    detailsAvailable: z.boolean(),
    group: z
      .enum(['track-route-type-university-field', 'track-route-type-university', 'track-route-type'])
      .nullable(),
    totalValidResponses: z.number().int().nonnegative(),
    sameTrackCount: z.number().int().nonnegative(),
    sameUniversityCount: z.number().int().min(10).nullable(),
    sameUniversityAndFieldCount: z.number().int().min(10).nullable(),
    groupResponseCount: z.number().int().nonnegative(),
    medianGradePercentage: z.number().min(0).max(100).nullable(),
    lowerGradePercentage: z.number().min(0).max(100).nullable(),
    waitingForDecisionCount: z.number().int().nonnegative().nullable(),
    positiveDecisionCount: z.number().int().nonnegative().nullable(),
    negativeDecisionCount: z.number().int().nonnegative().nullable(),
  })
  .strict() satisfies z.ZodType<StatisticsResult>;

export const recoveryCredentialSchema = z
  .object({
    recoveryToken: canonicalOpaqueTokenSchema,
    recoveryUrl: z.string().url(),
  })
  .strict() satisfies z.ZodType<RecoveryCredential>;

export const createResponseResultSchema = recoveryCredentialSchema
  .extend({
    created: z.literal(true),
    statistics: statisticsResultSchema,
  })
  .strict() satisfies z.ZodType<CreateResponseResult>;

export const updateResponseResultSchema = z
  .object({
    updated: z.literal(true),
    statistics: statisticsResultSchema,
  })
  .strict() satisfies z.ZodType<UpdateResponseResult>;

export const currentResponseResultSchema = z
  .object({
    response: responseFormInputSchema,
  })
  .strict() satisfies z.ZodType<CurrentResponseResult>;

export const restoreSessionResultSchema = currentResponseResultSchema;
export const rotateRecoveryResultSchema = recoveryCredentialSchema;

export const logoutSessionResultSchema = z
  .object({
    loggedOut: z.literal(true),
  })
  .strict() satisfies z.ZodType<LogoutSessionResult>;

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<ApiError>;
