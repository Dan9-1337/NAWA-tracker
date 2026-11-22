import type { ApiError } from '../../shared/contracts.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** ISO 8601 UTC instant when a blocked action becomes possible again; only EDIT_LIMIT_REACHED. */
    readonly retryAt?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function unauthorized(): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', 'Session is invalid or has expired.');
}

export function forbiddenOrigin(): HttpError {
  return new HttpError(403, 'INVALID_ORIGIN', 'The request origin is not allowed.');
}

export function profileExists(): HttpError {
  return new HttpError(409, 'PROFILE_EXISTS', 'This Telegram account already has a survey.');
}

export function invalidIntakeYear(): HttpError {
  return new HttpError(400, 'INVALID_INTAKE_YEAR', 'Invalid intake year.');
}

export function profileNotFound(): HttpError {
  return new HttpError(404, 'PROFILE_NOT_FOUND', 'No survey was found for this Telegram account.');
}

export function editLimitReached(retryAt?: string | null): HttpError {
  return new HttpError(
    429,
    'EDIT_LIMIT_REACHED',
    'Too many score changes in the last 24 hours. Try again later.',
    retryAt ?? undefined,
  );
}

export function normalizeError(error: unknown): { status: number; body: ApiError } {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.retryAt ? { retryAt: error.retryAt } : {}),
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    },
  };
}
