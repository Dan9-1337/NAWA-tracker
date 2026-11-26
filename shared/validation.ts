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
  type CreateScholarshipReportRequest,
  type CurrentResponseResult,
  type DeleteResponseResult,
  type DeleteScholarshipReportResult,
  type IntakeSummaryResult,
  type OrientationMarkResult,
  type ScholarshipReport,
  type ScholarshipReportInput,
  type ScholarshipReportMutationResult,
  type ScholarshipReportResult,
  type ScholarshipReportSummary,
  type StatisticsResult,
  type UpdateResponseRequest,
  type UpdateResponseResult,
  type UpdateScholarshipReportRequest,
} from './contracts';
import { MIN_COHORT_SIZE } from './product-rules';
import { getPrepCourseCentres } from './prep-course-centres';
import { isPrepCourseCity } from './prep-course-cities';
import {
  scholarshipReportIntakeYear,
  scholarshipReportMaxCustomProgrammeLength,
  scholarshipReportMinimumScore,
} from './scholarship-report';
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
    /** The country cohort size, always reported and never floored (ADR 0015). */
    sameCountryCount: z.number().int().nonnegative(),
    /** The country cohort size when details are available, 0 otherwise. */
    groupResponseCount: z.number().int().nonnegative(),
    medianScore: z.number().min(0).nullable(),
    lowerScorePercentage: z.number().min(0).max(100).nullable(),
    rankPosition: z.number().int().positive().nullable(),
    rankTotal: z.number().int().positive().nullable(),
    /** Retired with the whole-track tier (ADR 0015): never sent. */
    trackWideMedian: z.null(),
    scoreBuckets: z.array(z.number().int().nonnegative()).length(16).nullable(),
    /** Legacy: servers built before it was removed still send every score of the cohort. Ignored, never read. */
    cohortScores: z.unknown().optional(),
    /** Only the country tier survives: group and track are never reported (ADR 0015). */
    cohortScope: z.enum(cohortScopes).nullable(),
    /** Retired with the pooled country groups (ADR 0015): never sent. */
    cohortGroupId: z.null(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.sameTrackCount > value.totalValidResponses) {
      ctx.addIssue({ code: 'custom', path: ['sameTrackCount'], message: 'sameTrackCount cannot exceed totalValidResponses' });
    }
    if (value.groupResponseCount > value.sameTrackCount) {
      ctx.addIssue({ code: 'custom', path: ['groupResponseCount'], message: 'groupResponseCount cannot exceed sameTrackCount' });
    }
    if (value.sameCountryCount > value.sameTrackCount) {
      ctx.addIssue({ code: 'custom', path: ['sameCountryCount'], message: 'sameCountryCount cannot exceed sameTrackCount' });
    }

    // Two surveys in the country are the smallest cohort that yields a rank and a median; there is no floor above that.
    const hasCountryCohort = value.sameCountryCount >= 2;
    if (value.detailsAvailable !== hasCountryCohort) {
      ctx.addIssue({
        code: 'custom',
        path: ['detailsAvailable'],
        message: 'details are available exactly from two surveys in the country',
      });
      return;
    }

    if (value.detailsAvailable) {
      if (
        value.groupResponseCount !== value.sameCountryCount ||
        value.rankTotal !== value.sameCountryCount ||
        value.cohortScope !== 'country' ||
        value.medianScore === null ||
        value.lowerScorePercentage === null ||
        value.scoreBuckets === null
      ) {
        ctx.addIssue({ code: 'custom', path: ['detailsAvailable'], message: 'detailed statistics require the country cohort fields' });
        return;
      }
      const bucketTotal = value.scoreBuckets.reduce((sum, count) => sum + count, 0);
      if (bucketTotal !== value.sameCountryCount) {
        ctx.addIssue({ code: 'custom', path: ['scoreBuckets'], message: 'scoreBuckets must sum to sameCountryCount' });
      }
    } else if (
      value.groupResponseCount !== 0 ||
      value.rankPosition !== null ||
      value.rankTotal !== null ||
      value.medianScore !== null ||
      value.lowerScorePercentage !== null ||
      value.scoreBuckets !== null ||
      value.cohortScope !== null
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

const prepCourseCentreIds = new Set(
  getPrepCourseCentres(scholarshipReportIntakeYear).map((centre) => centre.id),
);

const scholarshipReportAnswersObjectSchema = z
  .object({
    studyRoute: z.enum(studyRoutes),
    prepCentreId: z.string().trim().min(1).max(64).optional(),
    programmeId: z.string().trim().min(1).max(120).optional(),
    customProgramme: z
      .string()
      .trim()
      .min(1)
      .max(scholarshipReportMaxCustomProgrammeLength)
      .refine((value) => !/[\r\n]/.test(value), { message: 'customProgramme must be a single line' })
      .optional(),
    universityId: z.string().trim().min(1).max(64),
  })
  .strict();

type ScholarshipReportAnswers = z.infer<typeof scholarshipReportAnswersObjectSchema>;

/**
 * The structural rules shared by the request and the stored report: the centre exists exactly on the preparatory
 * path, and exactly one of the catalogue programme and the typed text is present.
 */
function refineScholarshipReportAnswers(value: ScholarshipReportAnswers, ctx: z.RefinementCtx): void {
  const preparatory = value.studyRoute === 'preparatory_course';

  if (preparatory && value.prepCentreId === undefined) {
    ctx.addIssue({ code: 'custom', path: ['prepCentreId'], message: 'a preparatory report needs a centre' });
  }
  if (!preparatory && value.prepCentreId !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['prepCentreId'], message: 'a direct-studies report has no centre' });
  }
  if ((value.programmeId === undefined) === (value.customProgramme === undefined)) {
    ctx.addIssue({
      code: 'custom',
      path: ['programmeId'],
      message: 'exactly one of programmeId and customProgramme is required',
    });
  }
}

/**
 * The answers the client sends. The centre and the Director-track university are checked here; the programme id is
 * checked against the catalogue by the API server, which also resolves its ISCED-F code.
 */
export const scholarshipReportInputSchema = scholarshipReportAnswersObjectSchema
  .superRefine((value, ctx) => {
    refineScholarshipReportAnswers(value, ctx);

    if (
      value.prepCentreId !== undefined &&
      value.studyRoute === 'preparatory_course' &&
      !prepCourseCentreIds.has(value.prepCentreId)
    ) {
      ctx.addIssue({ code: 'custom', path: ['prepCentreId'], message: 'unknown preparatory centre' });
    }

    if (!isUniversityAllowedForTrack(value.universityId, 'nawa_director')) {
      ctx.addIssue({
        code: 'custom',
        path: ['universityId'],
        message: 'universityId must be a partner university of the nawa_director track',
      });
    }
  }) satisfies z.ZodType<ScholarshipReportInput>;

export const createScholarshipReportRequestSchema = z
  .object({ report: scholarshipReportInputSchema })
  .strict() satisfies z.ZodType<CreateScholarshipReportRequest>;

export const updateScholarshipReportRequestSchema = z
  .object({ report: scholarshipReportInputSchema })
  .strict() satisfies z.ZodType<UpdateScholarshipReportRequest>;

/** The stored report as the server returns it: the same answers plus the catalogue name and the score snapshot. */
export const scholarshipReportSchema = scholarshipReportAnswersObjectSchema
  .extend({
    programmeName: z.string().trim().min(1).max(200).optional(),
    scoreSnapshot: z.number().min(scholarshipReportMinimumScore),
  })
  .superRefine((value, ctx) => {
    refineScholarshipReportAnswers(value, ctx);

    if (value.programmeName !== undefined && value.programmeId === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['programmeName'],
        message: 'programmeName requires a catalogue programmeId',
      });
    }
  }) satisfies z.ZodType<ScholarshipReport>;

export const scholarshipReportResultSchema = z
  .object({ report: scholarshipReportSchema.nullable() })
  .strict() satisfies z.ZodType<ScholarshipReportResult>;

export const scholarshipReportMutationResultSchema = z
  .object({ report: scholarshipReportSchema })
  .strict() satisfies z.ZodType<ScholarshipReportMutationResult>;

export const deleteScholarshipReportResultSchema = z
  .object({ deleted: z.literal(true) })
  .strict() satisfies z.ZodType<DeleteScholarshipReportResult>;

const summaryCountSchema = z.number().int().nonnegative();
const summaryCellCountSchema = z.number().int().positive();

const summaryCountrySchema = z
  .object({ country: countryCodeSchema, count: summaryCellCountSchema })
  .strict();
const summaryPathSchema = z.object({ route: z.enum(studyRoutes), count: summaryCountSchema }).strict();
const summaryCentreSchema = z.object({ centreId: z.string().min(1), count: summaryCellCountSchema }).strict();
const summaryProgrammeSchema = z
  .object({
    programmeId: z.string().min(1),
    programmeName: z.string().min(1),
    count: summaryCellCountSchema,
  })
  .strict();
const summaryFieldSchema = z
  .object({
    group: z.string().min(1),
    count: summaryCellCountSchema,
    programmes: z.array(summaryProgrammeSchema),
  })
  .strict();
const summaryUniversitySchema = z
  .object({ universityId: z.string().min(1), count: summaryCellCountSchema })
  .strict();

/**
 * The contributors-only summary. Every list is shown without a floor, so its cells hold at least one report;
 * the two path rows are always present (a route with no reports has count 0). The country list is not filtered.
 */
export const scholarshipReportSummarySchema = z
  .object({
    total: summaryCountSchema,
    countries: z.array(summaryCountrySchema),
    paths: z.array(summaryPathSchema).length(2),
    centres: z.array(summaryCentreSchema),
    fields: z.array(summaryFieldSchema),
    typedProgrammeCount: summaryCountSchema,
    universities: z.array(summaryUniversitySchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    const sum = (counts: readonly number[]) => counts.reduce((total, count) => total + count, 0);
    const pathCount = (route: string) => value.paths.find((path) => path.route === route)?.count ?? 0;
    const pathTotal = sum(value.paths.map((path) => path.count));
    const countryTotal = sum(value.countries.map((country) => country.count));
    const fieldTotal = sum(value.fields.map((field) => field.count));

    if (pathTotal !== value.total) {
      ctx.addIssue({ code: 'custom', path: ['paths'], message: 'the path counts must sum to total' });
    }
    // `countries` is the unfiltered filter list, so it can be larger than a filtered selection; it can never be
    // smaller, because every counted report has a country of citizenship.
    if (countryTotal < value.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['countries'],
        message: 'the country counts cannot be fewer than total',
      });
    }
    if (fieldTotal + value.typedProgrammeCount !== value.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'catalogue and typed programmes must sum to total',
      });
    }
    if (sum(value.centres.map((centre) => centre.count)) !== pathCount('preparatory_course')) {
      ctx.addIssue({
        code: 'custom',
        path: ['centres'],
        message: 'every preparatory-path report has exactly one centre',
      });
    }
    if (sum(value.universities.map((university) => university.count)) !== value.total) {
      ctx.addIssue({
        code: 'custom',
        path: ['universities'],
        message: 'every report has exactly one university',
      });
    }
    for (const field of value.fields) {
      if (sum(field.programmes.map((programme) => programme.count)) !== field.count) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields'],
          message: 'programme counts must sum to their group count',
        });
      }
    }
    if (new Set(value.paths.map((path) => path.route)).size !== 2) {
      ctx.addIssue({ code: 'custom', path: ['paths'], message: 'both study routes are required' });
    }
  }) satisfies z.ZodType<ScholarshipReportSummary>;

/**
 * The `ориентир 2026` payload (ADR 0017). It carries only numbers: the lowest counted holder snapshot, the number
 * of holders behind it, and — only together with the full distribution — their snapshots. Strict, so an identity
 * or any survey/report field cannot slip in.
 */
export const orientationMarkResultSchema = z
  .object({
    mark: z.number().min(scholarshipReportMinimumScore).nullable(),
    n: z.number().int().nonnegative(),
    scores: z.array(z.number().min(scholarshipReportMinimumScore)).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.mark === null) !== (value.n === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['mark'],
        message: 'the mark exists exactly when at least one holder is counted',
      });
      return;
    }

    if (value.scores === undefined) return;

    if (value.n === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['scores'],
        message: 'a country without holders has no holder scores',
      });
      return;
    }
    if (value.scores.length !== value.n) {
      ctx.addIssue({ code: 'custom', path: ['scores'], message: 'the holder score list matches n' });
      return;
    }
    if (value.mark === null || value.scores[0] !== value.mark) {
      ctx.addIssue({
        code: 'custom',
        path: ['scores'],
        message: 'the mark is the lowest holder score',
      });
    }
    for (let index = 1; index < value.scores.length; index += 1) {
      if (value.scores[index]! < value.scores[index - 1]!) {
        ctx.addIssue({ code: 'custom', path: ['scores'], message: 'the holder scores are ascending' });
        return;
      }
    }
  }) satisfies z.ZodType<OrientationMarkResult>;

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        retryAt: z.string().datetime().optional(),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<ApiError>;

export const productEventNames = [
  'landing_viewed',
  'wizard_started',
  'wizard_education_completed',
  'wizard_completed',
  'score_viewed',
  'position_or_fallback_viewed',
  'what_if_used',
  'survey_updated',
  'reminders_link_opened',
  'invite_link_opened',
  'invite_main_button_opened',
  'wizard_average_above_maximum_shown',
  'wizard_low_score_warning_shown',
  'wizard_save_failed',
] as const;

/** Product analytics never carry free text or a payload: an event is just its name. */
export const productEventRequestSchema = z.object({ eventName: z.enum(productEventNames) }).strict();

export const productEventResultSchema = z
  .object({
    logged: z.literal(true),
  })
  .strict();
