import { z } from 'zod';
import { isCountryCode } from './countries';
import {
  applicantKinds,
  applicationStatuses,
  cohortScopes,
  gradeBases,
  polishSchoolLevels,
  scholarshipTracks,
  studyRoutes,
  type ApiError,
  type CreateResponseRequest,
  type CreateResponseResult,
  type CurrentResponseResult,
  type DeleteResponseResult,
  type IntakeSummaryResult,
  type StatisticsResult,
  type UpdateResponseRequest,
  type UpdateResponseResult,
} from './contracts';
import { MIN_COHORT_SIZE } from './product-rules';
import { isPrepCourseCity } from './prep-course-cities';
import { isStudyFieldCode } from './study-fields';
import { isUniversityAllowedForTrack } from './universities';

const countryCodeSchema = z.string().trim().refine(isCountryCode, { message: 'invalid country code' });

const responseFormObjectSchema = z
  .object({
    intakeYear: z.number().int().min(2018).max(2100),
    hasPolishCitizenship: z.boolean(),
    rankingCountry: countryCodeSchema,
    schoolCountry: countryCodeSchema,
    scholarshipTrack: z.enum(scholarshipTracks),
    studyRoute: z.enum(studyRoutes),
    targetUniversity: z.string().trim().min(1).max(64).optional(),
    studyField: z.string().trim().refine(isStudyFieldCode, { message: 'unknown study field' }),
    prepCourseCity: z.string().trim().refine(isPrepCourseCity, { message: 'unknown city' }).optional(),
    gradeBasis: z.enum(gradeBases),
    applicantKind: z.enum(applicantKinds),
    averageGrade: z.number().min(0).max(1000),
    maximumGrade: z.number().positive().max(1000),
    polishSchoolLevel: z.enum(polishSchoolLevels).optional(),
    currentStatus: z.enum(applicationStatuses),
    statusChangedAt: z.string().date(),
  })
  .strict();

function refineSharedQuestionnaireRules(
  value: z.infer<typeof responseFormObjectSchema>,
  ctx: z.RefinementCtx,
): void {
  if (value.averageGrade > value.maximumGrade) {
    ctx.addIssue({ code: 'custom', path: ['averageGrade'], message: 'averageGrade must not exceed maximumGrade' });
  }

  if (value.hasPolishCitizenship && value.scholarshipTrack !== 'nawa_director') {
    ctx.addIssue({
      code: 'custom',
      path: ['scholarshipTrack'],
      message: 'dual Polish citizenship is limited to the nawa_director track',
    });
  }

  if (value.scholarshipTrack === 'nawa_director') {
    if (value.polishSchoolLevel === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['polishSchoolLevel'],
        message: 'polishSchoolLevel is required for nawa_director',
      });
    } else if (value.rankingCountry === 'BY' && value.polishSchoolLevel !== 'none') {
      ctx.addIssue({
        code: 'custom',
        path: ['polishSchoolLevel'],
        message: 'polishSchoolLevel bonus is not available for Belarus citizenship',
      });
    }
  } else if (value.polishSchoolLevel !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['polishSchoolLevel'],
      message: 'polishSchoolLevel is only allowed for nawa_director',
    });
  }

  if (value.scholarshipTrack !== 'nawa_director') {
    ctx.addIssue({
      code: 'custom',
      path: ['scholarshipTrack'],
      message: 'only nawa_director is available in the current release',
    });
  }

  if (value.scholarshipTrack === 'health_minister' && value.studyRoute !== 'preparatory_course') {
    ctx.addIssue({
      code: 'custom',
      path: ['studyRoute'],
      message: 'health_minister currently supports only the preparatory course route',
    });
  }

  if (
    value.prepCourseCity !== undefined &&
    (value.studyRoute !== 'preparatory_course' || value.currentStatus !== 'scholarship_awarded')
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['prepCourseCity'],
      message: 'prepCourseCity is only for awarded preparatory-course applicants',
    });
  }

  if (value.applicantKind === 'student_in_poland') {
    if (value.maximumGrade !== 5 || value.averageGrade < 4.75) {
      ctx.addIssue({
        code: 'custom',
        path: ['averageGrade'],
        message: 'students in Poland qualify with an average of at least 4.75 on the 2-5 scale',
      });
    }
  }

  if (
    value.targetUniversity !== undefined &&
    !isUniversityAllowedForTrack(value.targetUniversity, value.scholarshipTrack)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['targetUniversity'],
      message: 'targetUniversity must be a partner university for the selected scholarship track',
    });
  }
}

/** Reads and writes share the rules: the first screen no longer asks for a university, so it is optional. */
export const responseFormInputSchema = responseFormObjectSchema.superRefine((value, ctx) => {
  refineSharedQuestionnaireRules(value, ctx);
});

const emptyRequestSchema = z.object({}).strict();

export const createResponseRequestSchema = z
  .object({
    response: responseFormInputSchema,
  })
  .strict() satisfies z.ZodType<CreateResponseRequest>;

export const updateResponseRequestSchema = z
  .object({
    response: responseFormInputSchema,
  })
  .strict() satisfies z.ZodType<UpdateResponseRequest>;

export const currentResponseRequestSchema = emptyRequestSchema;
export const statisticsRequestSchema = emptyRequestSchema;
export const intakeSummaryRequestSchema = emptyRequestSchema;

export const intakeSummaryResultSchema = z
  .object({
    intakeYear: z.number().int().min(2018).max(2100),
    /** A disclosed count never sits below the cohort floor; the server sends null instead. */
    responseCount: z.number().int().min(MIN_COHORT_SIZE).nullable(),
  })
  .strict() satisfies z.ZodType<IntakeSummaryResult>;

export const statisticsResultSchema = z
  .object({
    detailsAvailable: z.boolean(),
    totalValidResponses: z.number().int().nonnegative(),
    sameTrackCount: z.number().int().nonnegative(),
    sameCountryCount: z.number().int().min(MIN_COHORT_SIZE).nullable(),
    groupResponseCount: z.number().int().nonnegative(),
    medianScore: z.number().min(0).nullable(),
    lowerScorePercentage: z.number().min(0).max(100).nullable(),
    rankPosition: z.number().int().positive().nullable(),
    rankTotal: z.number().int().positive().nullable(),
    trackWideMedian: z.number().min(0).nullable(),
    scoreBuckets: z.array(z.number().int().nonnegative()).length(16).nullable(),
    /** Legacy: servers built before it was removed still send every score of the cohort. Ignored, never read. */
    cohortScores: z.unknown().optional(),
    cohortScope: z.enum(cohortScopes).nullable(),
    cohortGroupId: z.string().min(2).max(32).nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.sameTrackCount > value.totalValidResponses) {
      ctx.addIssue({ code: 'custom', path: ['sameTrackCount'], message: 'sameTrackCount cannot exceed totalValidResponses' });
    }
    if (value.groupResponseCount > value.sameTrackCount) {
      ctx.addIssue({ code: 'custom', path: ['groupResponseCount'], message: 'groupResponseCount cannot exceed sameTrackCount' });
    }
    if (value.sameCountryCount !== null && value.sameCountryCount > value.sameTrackCount) {
      ctx.addIssue({ code: 'custom', path: ['sameCountryCount'], message: 'sameCountryCount cannot exceed sameTrackCount' });
    }

    if (value.detailsAvailable) {
      if (
        value.groupResponseCount < MIN_COHORT_SIZE ||
        value.medianScore === null ||
        value.lowerScorePercentage === null ||
        value.scoreBuckets === null ||
        value.cohortScope === null
      ) {
        ctx.addIssue({ code: 'custom', path: ['detailsAvailable'], message: 'detailed statistics require every detailed field' });
        return;
      }
      const bucketTotal = value.scoreBuckets.reduce((sum, count) => sum + count, 0);
      if (bucketTotal !== value.groupResponseCount) {
        ctx.addIssue({ code: 'custom', path: ['scoreBuckets'], message: 'scoreBuckets must sum to groupResponseCount' });
      }
    } else if (
      value.groupResponseCount !== 0 ||
      value.medianScore !== null ||
      value.lowerScorePercentage !== null ||
      value.scoreBuckets !== null ||
      value.cohortScope !== null ||
      value.cohortGroupId !== null
    ) {
      ctx.addIssue({ code: 'custom', path: ['detailsAvailable'], message: 'suppressed statistics cannot retain detailed fields' });
    }
  }) satisfies z.ZodType<StatisticsResult>;

export const createResponseResultSchema = z
  .object({
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

export const deleteResponseResultSchema = z
  .object({
    deleted: z.literal(true),
  })
  .strict() satisfies z.ZodType<DeleteResponseResult>;

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

export const productEventNames = [
  'wizard_started',
  'wizard_completed',
  'score_viewed',
  'position_or_fallback_viewed',
] as const;

/** Product analytics never carry free text or a payload: an event is just its name. */
export const productEventRequestSchema = z.object({ eventName: z.enum(productEventNames) }).strict();

export const productEventResultSchema = z
  .object({
    logged: z.literal(true),
  })
  .strict();
