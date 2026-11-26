import type {
  ApiError,
  CreateResponseRequest,
  CreateResponseResult,
  CreateScholarshipReportRequest,
  CurrentResponseResult,
  DeleteResponseResult,
  DeleteScholarshipReportResult,
  IntakeSummaryResult,
  OrientationMarkResult,
  ScholarshipReportMutationResult,
  ScholarshipReportResult,
  ScholarshipReportSummary,
  StatisticsResult,
  UpdateResponseRequest,
  UpdateResponseResult,
  UpdateScholarshipReportRequest,
} from '../../shared/contracts';
import {
  apiErrorSchema,
  createResponseResultSchema,
  currentResponseResultSchema,
  deleteResponseResultSchema,
  deleteScholarshipReportResultSchema,
  intakeSummaryResultSchema,
  orientationMarkResultSchema,
  scholarshipReportMutationResultSchema,
  scholarshipReportResultSchema,
  scholarshipReportSummarySchema,
  statisticsResultSchema,
  updateResponseResultSchema,
} from '../../shared/validation';
import type { ZodType } from 'zod';
import { getMessages } from '../i18n';
import { getTelegramInitData } from './telegram';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** ISO 8601 UTC instant when the action becomes possible again; only EDIT_LIMIT_REACHED. */
    public readonly retryAt?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function authHeaders(): Record<string, string> {
  const initData = getTelegramInitData();
  if (!initData) {
    throw new ApiClientError(401, 'UNAUTHORIZED', getMessages().telegram.missingInitData);
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `tma ${initData}`,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', getMessages().api.invalidResponse);
  }
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body: unknown,
  schema: ZodType<T>,
): Promise<T> {
  const hasBody = method === 'POST' || method === 'PUT';
  const response = await fetch(path, {
    method,
    headers: authHeaders(),
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    if (parsedError.success) {
      const apiError: ApiError = parsedError.data;
      throw new ApiClientError(
        response.status,
        apiError.error.code,
        apiError.error.message,
        apiError.error.retryAt,
      );
    }
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', getMessages().api.invalidResponse);
  }

  const parsedResult = schema.safeParse(payload);
  if (!parsedResult.success) {
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', getMessages().api.invalidResponse);
  }
  return parsedResult.data;
}

export function createResponse(input: CreateResponseRequest): Promise<CreateResponseResult> {
  return request('/api/responses', 'POST', input, createResponseResultSchema);
}

export function updateResponse(input: UpdateResponseRequest): Promise<UpdateResponseResult> {
  return request('/api/responses', 'PUT', input, updateResponseResultSchema);
}

export function getCurrentResponse(): Promise<CurrentResponseResult> {
  return request('/api/responses/current', 'POST', {}, currentResponseResultSchema);
}

export function getStatistics(): Promise<StatisticsResult> {
  return request('/api/statistics', 'POST', {}, statisticsResultSchema);
}

let intakeSummaryInFlight: Promise<IntakeSummaryResult> | null = null;

/**
 * The active intake year and the landing counter. The start screen and the create flow both ask for it when they
 * mount (the flow needs the year for the save, ADR 0018), so concurrent callers share one request. Nothing is
 * cached once it settles: the count is read fresh the next time the start screen opens.
 */
export function getIntakeSummary(): Promise<IntakeSummaryResult> {
  if (!intakeSummaryInFlight) {
    const pending: Promise<IntakeSummaryResult> = request(
      '/api/intake-summary',
      'POST',
      {},
      intakeSummaryResultSchema,
    ).finally(() => {
      if (intakeSummaryInFlight === pending) intakeSummaryInFlight = null;
    });
    intakeSummaryInFlight = pending;
  }
  return intakeSummaryInFlight;
}

/**
 * The country mark (ADR 0017). The holder score list is requested only with the full distribution, for the dots.
 */
export function getOrientationMark(includeScores = false): Promise<OrientationMarkResult> {
  const query = includeScores ? '?distribution=1' : '';
  return request(`/api/orientation-mark${query}`, 'GET', undefined, orientationMarkResultSchema);
}

export function deleteResponse(): Promise<DeleteResponseResult> {
  return request('/api/responses', 'DELETE', {}, deleteResponseResultSchema);
}

export function getScholarshipReport(): Promise<ScholarshipReportResult> {
  return request('/api/scholarship-report', 'GET', undefined, scholarshipReportResultSchema);
}

export function getScholarshipReportSummary(country?: string): Promise<ScholarshipReportSummary> {
  const query = new URLSearchParams({ summary: '1' });
  if (country) query.set('country', country);
  return request(`/api/scholarship-report?${query.toString()}`, 'GET', undefined, scholarshipReportSummarySchema);
}

export function createScholarshipReport(
  input: CreateScholarshipReportRequest,
): Promise<ScholarshipReportMutationResult> {
  return request('/api/scholarship-report', 'POST', input, scholarshipReportMutationResultSchema);
}

export function updateScholarshipReport(
  input: UpdateScholarshipReportRequest,
): Promise<ScholarshipReportMutationResult> {
  return request('/api/scholarship-report', 'PUT', input, scholarshipReportMutationResultSchema);
}

export function deleteScholarshipReport(): Promise<DeleteScholarshipReportResult> {
  return request('/api/scholarship-report', 'DELETE', {}, deleteScholarshipReportResultSchema);
}
