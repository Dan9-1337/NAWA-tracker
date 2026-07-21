import { z } from 'zod';
import {
  applicationStatuses,
  comparisonGroups,
  polishSchoolLevels,
  scholarshipTracks,
  studyRoutes,
  type ApiError,
  type ApplicationStatus,
  type CreateResponseRequest,
  type CreateResponseResult,
  type CurrentResponseResult,
  type PublicStatisticsRequest,
  type PublicStatisticsResult,
  type StatisticsResult,
  type StatusCounts,
  type UpdateResponseRequest,
  type UpdateResponseResult,
} from './contracts';

const baseFormSchema = z
  .object({
    hasPolishCitizenship: z.boolean(),
    rankingCountry: z.string().trim().min(1).max(100),
    schoolCountry: z.string().trim().min(1).max(100),
    scholarshipTrack: z.enum(scholarshipTracks),
    studyRoute: z.enum(studyRoutes),
    averageGrade: z.number().min(0).max(1000),
    maximumGrade: z.number().positive().max(1000),
    polishSchoolLevel: z.enum(polishSchoolLevels).optional(),
    currentStatus: z.enum(applicationStatuses),
    statusChangedAt: z.string().date(),
  })
  .strict()
  .superRefine((value, ctx) => {
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

    if (value.scholarshipTrack === 'health_minister' && value.studyRoute !== 'preparatory_course') {
      ctx.addIssue({
        code: 'custom',
        path: ['studyRoute'],
        message: 'health_minister currently supports only the preparatory course route',
      });
    }
  });

export const responseFormInputSchema = baseFormSchema;

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

const statusCountsShape = Object.fromEntries(
  applicationStatuses.map((status) => [status, z.number().int().nonnegative()]),
) as Record<ApplicationStatus, z.ZodNumber>;

export const statusCountsSchema = z.object(statusCountsShape).strict() satisfies z.ZodType<StatusCounts>;

export const statisticsResultSchema = z
  .object({
    detailsAvailable: z.boolean(),
    group: z.enum(comparisonGroups).nullable(),
    totalValidResponses: z.number().int().nonnegative(),
    sameTrackCount: z.number().int().nonnegative(),
    sameCountryCount: z.number().int().min(10).nullable(),
    groupResponseCount: z.number().int().nonnegative(),
    medianScore: z.number().min(0).nullable(),
    lowerScorePercentage: z.number().min(0).max(100).nullable(),
    statusCounts: statusCountsSchema.nullable(),
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
        value.group === null ||
        value.groupResponseCount < 10 ||
        value.medianScore === null ||
        value.lowerScorePercentage === null ||
        value.statusCounts === null
      ) {
        ctx.addIssue({ code: 'custom', path: ['detailsAvailable'], message: 'detailed statistics require every detailed field' });
        return;
      }
      const total = Object.values(value.statusCounts).reduce((sum, count) => sum + count, 0);
      if (total !== value.groupResponseCount) {
        ctx.addIssue({ code: 'custom', path: ['statusCounts'], message: 'statusCounts must sum to groupResponseCount' });
      }
    } else if (
      value.group !== null ||
      value.groupResponseCount !== 0 ||
      value.medianScore !== null ||
      value.lowerScorePercentage !== null ||
      value.statusCounts !== null
    ) {
      ctx.addIssue({ code: 'custom', path: ['detailsAvailable'], message: 'suppressed statistics cannot retain detailed fields' });
    }
  }) satisfies z.ZodType<StatisticsResult>;

export const publicStatisticsRequestSchema = z
  .object({
    scholarshipTrack: z.enum(scholarshipTracks),
    rankingCountry: z.string().trim().min(1).max(100),
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
    response: responseFormInputSchema,
  })
  .strict() satisfies z.ZodType<CurrentResponseResult>;

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
