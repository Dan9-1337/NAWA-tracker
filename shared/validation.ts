import { z } from 'zod';
import { isCountryCode } from './countries';
import {
  applicationStatuses,
  polishSchoolLevels,
  scholarshipTracks,
  studyRoutes,
  type ApiError,
  type CreateResponseRequest,
  type CreateResponseResult,
  type CurrentResponseResult,
  type DeleteResponseResult,
  type PublicStatisticsRequest,
  type PublicStatisticsResult,
  type StatisticsResult,
  type UpdateResponseRequest,
  type UpdateResponseResult,
} from './contracts';
import { isUniversityAllowedForTrack } from './universities';

const countryCodeSchema = z.string().trim().refine(isCountryCode, { message: 'invalid country code' });

const responseFormObjectSchema = z
  .object({
    hasPolishCitizenship: z.boolean(),
    rankingCountry: countryCodeSchema,
    schoolCountry: countryCodeSchema,
    scholarshipTrack: z.enum(scholarshipTracks),
    studyRoute: z.enum(studyRoutes),
    targetUniversity: z.string().trim().min(1).max(64).optional(),
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

  if (value.targetUniversity !== undefined) {
    if (value.studyRoute !== 'direct_studies') {
      ctx.addIssue({
        code: 'custom',
        path: ['targetUniversity'],
        message: 'targetUniversity is only allowed for direct_studies',
      });
    } else if (!isUniversityAllowedForTrack(value.targetUniversity, value.scholarshipTrack)) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetUniversity'],
        message: 'targetUniversity must be a partner university for the selected scholarship track',
      });
    }
  }
}

/** Profiles loaded from storage may predate targetUniversity; writes still require it. */
export const responseFormStoredSchema = responseFormObjectSchema.superRefine((value, ctx) => {
  refineSharedQuestionnaireRules(value, ctx);
});

export const responseFormInputSchema = responseFormObjectSchema.superRefine((value, ctx) => {
  refineSharedQuestionnaireRules(value, ctx);

  if (value.studyRoute === 'direct_studies') {
    if (value.targetUniversity === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetUniversity'],
        message: 'targetUniversity is required for direct_studies',
      });
    }
  }
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

export const statisticsGrowth7dSchema = z
  .object({
    newResponsesTotal: z.number().int().nonnegative(),
    newResponsesInGroup: z.number().int().nonnegative(),
    medianThen: z.number().min(0).nullable(),
    medianNow: z.number().min(0).nullable(),
    percentileThen: z.number().min(0).max(100).nullable(),
    percentileNow: z.number().min(0).max(100).nullable(),
    trackNewResponses: z.number().int().nonnegative(),
    trackMedianThen: z.number().min(0).nullable(),
    trackMedianNow: z.number().min(0).nullable(),
    statusUpdatesInGroup: z.number().int().nonnegative(),
  })
  .strict();

export const globalBenchmarkSchema = z
  .object({
    sampleSize: z.number().int().min(10).nullable(),
    representedCountryCount: z.number().int().positive().nullable(),
    median: z.number().min(0).nullable(),
    scoreDelta: z.number().nullable(),
    lowerScorePercentage: z.number().min(0).max(100).nullable(),
    scoreBuckets: z.array(z.number().int().nonnegative()).length(16).nullable(),
    detailedCountriesCount: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.sampleSize != null && value.scoreBuckets != null) {
      const bucketTotal = value.scoreBuckets.reduce((sum, count) => sum + count, 0);
      if (bucketTotal !== value.sampleSize) {
        ctx.addIssue({
          code: 'custom',
          path: ['scoreBuckets'],
          message: 'global scoreBuckets must sum to sampleSize',
        });
      }
    }
  });

export const countryContextStatsSchema = z
  .object({
    countryMedian: z.number().min(0).nullable(),
    countrySampleSize: z.number().int().nonnegative(),
    countryShareOfTrack: z.number().min(0).max(1).nullable(),
    medianDeltaVsGlobal: z.number().nullable(),
    distributionStable: z.boolean().nullable(),
    nearbyScoreCount: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const statisticsHistoryPointSchema = z
  .object({
    recordedAt: z.string().min(1),
    lowerScorePercentage: z.number().min(0).max(100).nullable(),
    groupResponseCount: z.number().int().nonnegative(),
    rankPosition: z.number().int().positive().nullable(),
  })
  .strict();

export const groupProgressSchema = z
  .object({
    submitted: z.number().int().nonnegative(),
    formalPositive: z.number().int().nonnegative(),
    meritPositive: z.number().int().nonnegative(),
    scholarshipAwarded: z.number().int().nonnegative(),
  })
  .strict();

export const reportedMeritOutcomeStatsSchema = z
  .object({
    positiveCount: z.number().int().nonnegative(),
    negativeCount: z.number().int().nonnegative(),
    lowestReportedPositiveScore: z.number().min(0).nullable(),
    highestReportedNegativeScore: z.number().min(0).nullable(),
    boundaryState: z.enum(['insufficient_data', 'positive_only', 'interval', 'overlapping_results']),
  })
  .strict();

export const statisticsResultSchema = z
  .object({
    detailsAvailable: z.boolean(),
    totalValidResponses: z.number().int().nonnegative(),
    sameTrackCount: z.number().int().nonnegative(),
    sameCountryCount: z.number().int().min(10).nullable(),
    groupResponseCount: z.number().int().nonnegative(),
    medianScore: z.number().min(0).nullable(),
    lowerScorePercentage: z.number().min(0).max(100).nullable(),
    rankPosition: z.number().int().positive().nullable(),
    rankTotal: z.number().int().positive().nullable(),
    gradesScore: z.number().min(0).nullable(),
    polishSchoolBonus: z.number().min(0).nullable(),
    trackWideMedian: z.number().min(0).nullable(),
    scoreBuckets: z.array(z.number().int().nonnegative()).length(16).nullable(),
    cohortScores: z.array(z.number().min(0)).nullable(),
    growth7d: statisticsGrowth7dSchema.nullable(),
    history: z.array(statisticsHistoryPointSchema),
    groupProgress: groupProgressSchema.nullable(),
    reportedMeritOutcomes: reportedMeritOutcomeStatsSchema.nullable(),
    globalBenchmark: globalBenchmarkSchema,
    countryContext: countryContextStatsSchema,
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
        value.groupResponseCount < 10 ||
        value.medianScore === null ||
        value.lowerScorePercentage === null ||
        value.scoreBuckets === null
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
      value.scoreBuckets !== null
    ) {
      ctx.addIssue({ code: 'custom', path: ['detailsAvailable'], message: 'suppressed statistics cannot retain detailed fields' });
    }
  }) satisfies z.ZodType<StatisticsResult>;

export const publicStatisticsRequestSchema = z
  .object({
    scholarshipTrack: z.enum(scholarshipTracks),
    rankingCountry: countryCodeSchema,
    averageGrade: z.number().min(0).max(1000),
    maximumGrade: z.number().positive().max(1000),
    polishSchoolLevel: z.enum(polishSchoolLevels).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.averageGrade > value.maximumGrade) {
      ctx.addIssue({ code: 'custom', path: ['averageGrade'], message: 'averageGrade must not exceed maximumGrade' });
    }
    if (value.scholarshipTrack === 'nawa_director') {
      if (value.polishSchoolLevel === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['polishSchoolLevel'],
          message: 'polishSchoolLevel is required for nawa_director',
        });
      }
    } else if (value.polishSchoolLevel !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['polishSchoolLevel'],
        message: 'polishSchoolLevel is only allowed for nawa_director',
      });
    }
  }) satisfies z.ZodType<PublicStatisticsRequest>;

export const publicStatisticsResultSchema = statisticsResultSchema satisfies z.ZodType<PublicStatisticsResult>;

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
    response: responseFormStoredSchema,
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
  'status_updated',
  'dashboard_revisit',
  'university_search_no_results',
  'university_search_selected',
  'university_search_abandoned',
] as const;

export const productEventRequestSchema = z
  .object({
    eventName: z.enum(productEventNames),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const productEventResultSchema = z
  .object({
    logged: z.literal(true),
  })
  .strict();
