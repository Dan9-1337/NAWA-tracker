import type { z } from 'zod';
import { Buffer } from 'node:buffer';

import { HttpError, normalizeError } from './errors.js';

export type HttpRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

export type HttpResponse = {
  status(statusCode: number): HttpResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string | string[]): unknown;
};

export function assertMethod(
  request: HttpRequest,
  response: Pick<HttpResponse, 'setHeader'>,
  allowedMethods: string | readonly string[],
): void {
  const methods = typeof allowedMethods === 'string' ? [allowedMethods] : allowedMethods;
  if (!request.method || !methods.includes(request.method)) {
    response.setHeader('Allow', methods.join(', '));
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Metoda żądania nie jest obsługiwana.');
  }
}

export const MAX_JSON_BODY_BYTES = 16 * 1024;

export function parseJsonBody<T>(request: HttpRequest, schema: z.ZodType<T>): T {
  let body = request.body;
  const contentLength = request.headers?.['content-length'];

  if (typeof contentLength === 'string') {
    if (!/^\d+$/.test(contentLength)) {
      throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
    }
    if (Number(contentLength) > MAX_JSON_BODY_BYTES) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dane żądania są zbyt duże.');
    }
  } else if (contentLength !== undefined) {
    throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
  }

  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_JSON_BODY_BYTES) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dane żądania są zbyt duże.');
    }
    try {
      body = JSON.parse(body) as unknown;
    } catch {
      throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
    }
  } else {
    try {
      if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_JSON_BODY_BYTES) {
        throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dane żądania są zbyt duże.');
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
    }
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'INVALID_REQUEST', 'Nieprawidłowe dane żądania.');
  }
  return result.data;
}

export function sendError(response: HttpResponse, error: unknown): void {
  const normalized = normalizeError(error);
  response.status(normalized.status).json(normalized.body);
}
