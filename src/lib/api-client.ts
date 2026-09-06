import type {
  ApiError,
  CreateResponseRequest,
  CreateResponseResult,
  CurrentResponseResult,
  DeleteResponseResult,
  PublicStatisticsRequest,
  PublicStatisticsResult,
  StatisticsResult,
  UpdateResponseRequest,
  UpdateResponseResult,
} from '../../shared/contracts';
import {
  apiErrorSchema,
  createResponseResultSchema,
  currentResponseResultSchema,
  deleteResponseResultSchema,
  publicStatisticsResultSchema,
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

async function request<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body: unknown, schema: ZodType<T>): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: authHeaders(),
    body: method === 'DELETE' ? undefined : JSON.stringify(body),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    if (parsedError.success) {
      const apiError: ApiError = parsedError.data;
      throw new ApiClientError(response.status, apiError.error.code, apiError.error.message);
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

export function deleteResponse(): Promise<DeleteResponseResult> {
  return request('/api/responses', 'DELETE', {}, deleteResponseResultSchema);
}

export function getPublicStatistics(input: PublicStatisticsRequest): Promise<PublicStatisticsResult> {
  return request('/api/statistics/public', 'POST', input, publicStatisticsResultSchema);
}
