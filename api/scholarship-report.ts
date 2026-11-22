import { z } from 'zod';

import { scholarshipReportIntakeYear } from '../shared/scholarship-report.js';
import type {
  ScholarshipReport,
  ScholarshipReportInput,
  ScholarshipReportSummary,
  ScholarshipReportSummaryField,
} from '../shared/contracts.js';
import { isCountryCode } from '../shared/countries.js';
import { broadGroups } from '../shared/study-fields.js';
import { studyProgrammes } from '../shared/study-programmes.js';
import {
  createScholarshipReportRequestSchema,
  deleteScholarshipReportResultSchema,
  scholarshipReportMutationResultSchema,
  scholarshipReportResultSchema,
  scholarshipReportSchema,
  scholarshipReportSummarySchema,
  updateScholarshipReportRequestSchema,
} from '../shared/validation.js';
import {
  HttpError,
  profileNotFound,
  scholarshipReportExists,
  scholarshipReportNotFound,
  scholarshipScoreBelowThreshold,
} from './_lib/errors.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { hashIdentity } from './_lib/identity.js';
import { assertSameOrigin, assertSameOriginWhenPresent } from './_lib/origin.js';
import type { RpcClient, RpcError } from './_lib/questionnaire.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';

type ScholarshipReportRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

export type ScholarshipReportHandlerDependencies = {
  getClient: () => RpcClient;
  hashIdentity: (identity: VerifiedTelegramIdentity) => string;
  assertSameOrigin: (request: ScholarshipReportRequest) => void;
  /** GET requests from the same origin normally carry no Origin header; only a present, different one is refused. */
  assertSameOriginWhenPresent: (request: ScholarshipReportRequest) => void;
  requireTelegramIdentity: (request: ScholarshipReportRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: ScholarshipReportHandlerDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  hashIdentity,
  assertSameOrigin,
  assertSameOriginWhenPresent,
  requireTelegramIdentity,
};

const programmesById = new Map(studyProgrammes.map((programme) => [programme.id, programme]));

/** The shared schema checks the structure; the server adds membership in the 2026 programme catalogue. */
function refineKnownProgramme(
  value: { report: ScholarshipReportInput },
  ctx: z.RefinementCtx,
): void {
  const programmeId = value.report.programmeId;
  if (programmeId !== undefined && !programmesById.has(programmeId)) {
    ctx.addIssue({ code: 'custom', path: ['report', 'programmeId'], message: 'unknown programme id' });
  }
}

const createScholarshipReportCatalogueSchema =
  createScholarshipReportRequestSchema.superRefine(refineKnownProgramme);
const updateScholarshipReportCatalogueSchema =
  updateScholarshipReportRequestSchema.superRefine(refineKnownProgramme);

const summaryRpcSchema = z
  .object({
    total: z.number().int().nonnegative(),
    countries: z.array(z.object({ country: z.string(), count: z.number().int().positive() }).strict()),
    paths: z
      .array(
        z
          .object({ route: z.enum(['preparatory_course', 'direct_studies']), count: z.number().int().nonnegative() })
          .strict(),
      )
      .length(2),
    centres: z.array(z.object({ centreId: z.string().min(1), count: z.number().int().positive() }).strict()),
    fields: z.array(
      z
        .object({
          group: z.string().min(1),
          count: z.number().int().positive(),
          programmes: z.array(
            z
              .object({ programmeId: z.string().min(1), count: z.number().int().positive() })
              .strict(),
          ),
        })
        .strict(),
    ),
    typedProgrammeCount: z.number().int().nonnegative(),
    universities: z.array(
      z.object({ universityId: z.string().min(1), count: z.number().int().positive() }).strict(),
    ),
  })
  .strict();

function queryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Maps the database's exception messages onto the English API error codes (ADR 0010). */
function assertReportRpcSucceeded(error: RpcError | null): void {
  if (!error) return;

  if (error.message === 'profile_not_found') throw profileNotFound();
  if (error.message === 'report_exists') throw scholarshipReportExists();
  if (error.message === 'report_not_found') throw scholarshipReportNotFound();
  if (error.message === 'score_below_threshold') throw scholarshipScoreBelowThreshold();
  if (error.code === '23505') throw scholarshipReportExists();
  throw new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}

/** The catalogue name is resolved by the server; the typed kierunek has none. */
function toPublicReport(value: unknown): ScholarshipReport {
  const report = scholarshipReportSchema.parse(value);
  const programmeName = report.programmeId ? programmesById.get(report.programmeId)?.name : undefined;

  return scholarshipReportSchema.parse({
    ...report,
    ...(programmeName ? { programmeName } : {}),
  });
}

/**
 * The stored summary groups programmes by their two-digit ISCED-F code. A code outside `broadGroups` becomes
 * "other", so every catalogue kierunek has a group; a merge is needed because several codes can map to "other".
 */
function toPublicSummary(value: unknown): ScholarshipReportSummary {
  const summary = summaryRpcSchema.parse(value);
  const groups = new Map<string, ScholarshipReportSummaryField>();

  for (const field of summary.fields) {
    const group = Object.prototype.hasOwnProperty.call(broadGroups, field.group) ? field.group : 'other';
    const bucket = groups.get(group) ?? { group, count: 0, programmes: [] };

    bucket.count += field.count;
    for (const programme of field.programmes) {
      const existing = bucket.programmes.find((entry) => entry.programmeId === programme.programmeId);
      if (existing) {
        existing.count += programme.count;
      } else {
        bucket.programmes.push({
          programmeId: programme.programmeId,
          programmeName: programmesById.get(programme.programmeId)?.name ?? programme.programmeId,
          count: programme.count,
        });
      }
    }

    groups.set(group, bucket);
  }

  return scholarshipReportSummarySchema.parse({
    total: summary.total,
    countries: summary.countries,
    paths: summary.paths,
    centres: summary.centres,
    fields: [...groups.values()],
    typedProgrammeCount: summary.typedProgrammeCount,
    universities: summary.universities,
  });
}

/** The programme ISCED code comes from the server catalogue, never from the client. */
function programmeIsced(report: ScholarshipReportInput): string | null {
  if (report.programmeId === undefined) return null;

  const programme = programmesById.get(report.programmeId);
  if (!programme) throw new HttpError(400, 'INVALID_REQUEST', 'Invalid request data.');
  return programme.isced;
}

function reportParameters(
  identityHash: string,
  report: ScholarshipReportInput,
): Record<string, unknown> {
  return {
    p_identity_hash: identityHash,
    p_intake_year: scholarshipReportIntakeYear,
    p_study_route: report.studyRoute,
    p_prep_centre_id: report.prepCentreId ?? null,
    p_programme_id: report.programmeId ?? null,
    p_programme_isced: programmeIsced(report),
    p_custom_programme: report.customProgramme ?? null,
    p_university_id: report.universityId,
  };
}

export function createScholarshipReportHandler(
  overrides: Partial<ScholarshipReportHandlerDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function scholarshipReportHandler(
    request: ScholarshipReportRequest,
    response: HttpResponse,
  ): Promise<void> {
    try {
      if (request.method === 'GET') {
        dependencies.assertSameOriginWhenPresent(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const identityHash = dependencies.hashIdentity(identity);

        if (queryValue(request.query?.summary) === '1') {
          const country = queryValue(request.query?.country);
          if (country !== undefined && !isCountryCode(country)) {
            throw new HttpError(400, 'INVALID_REQUEST', 'Invalid request data.');
          }

          const client = dependencies.getClient();
          const summaryResult = await client.rpc('get_scholarship_report_summary', {
            p_identity_hash: identityHash,
            p_intake_year: scholarshipReportIntakeYear,
            p_ranking_country: country ?? null,
          });
          assertReportRpcSucceeded(summaryResult.error);
          if (summaryResult.data === null) throw scholarshipReportNotFound();

          response.status(200).json(toPublicSummary(summaryResult.data));
          return;
        }

        const client = dependencies.getClient();
        const reportResult = await client.rpc('get_scholarship_report', {
          p_identity_hash: identityHash,
          p_intake_year: scholarshipReportIntakeYear,
        });
        assertReportRpcSucceeded(reportResult.error);

        const result = scholarshipReportResultSchema.parse({
          report: reportResult.data === null ? null : toPublicReport(reportResult.data),
        });
        response.status(200).json(result);
        return;
      }

      if (request.method === 'POST') {
        dependencies.assertSameOrigin(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const input = parseJsonBody(request, createScholarshipReportCatalogueSchema);
        const parameters = reportParameters(dependencies.hashIdentity(identity), input.report);
        const client = dependencies.getClient();

        const createResult = await client.rpc('create_scholarship_report', parameters);
        assertReportRpcSucceeded(createResult.error);
        if (createResult.data === null) {
          throw new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
        }

        const result = scholarshipReportMutationResultSchema.parse({
          report: toPublicReport(createResult.data),
        });
        response.status(201).json(result);
        return;
      }

      if (request.method === 'PUT') {
        dependencies.assertSameOrigin(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const input = parseJsonBody(request, updateScholarshipReportCatalogueSchema);
        const parameters = reportParameters(dependencies.hashIdentity(identity), input.report);
        const client = dependencies.getClient();

        const updateResult = await client.rpc('update_scholarship_report', parameters);
        assertReportRpcSucceeded(updateResult.error);
        if (updateResult.data === null) {
          throw new HttpError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
        }

        const result = scholarshipReportMutationResultSchema.parse({
          report: toPublicReport(updateResult.data),
        });
        response.status(200).json(result);
        return;
      }

      if (request.method === 'DELETE') {
        dependencies.assertSameOrigin(request);
        const identity = dependencies.requireTelegramIdentity(request);
        const client = dependencies.getClient();

        const deleteResult = await client.rpc('delete_scholarship_report', {
          p_identity_hash: dependencies.hashIdentity(identity),
          p_intake_year: scholarshipReportIntakeYear,
        });
        assertReportRpcSucceeded(deleteResult.error);

        const result = deleteScholarshipReportResultSchema.parse(deleteResult.data);
        response.status(200).json(result);
        return;
      }

      assertMethod(request, response, ['GET', 'POST', 'PUT', 'DELETE']);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createScholarshipReportHandler();
