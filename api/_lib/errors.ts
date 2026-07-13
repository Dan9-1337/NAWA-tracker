import type { ApiError } from '../../shared/contracts.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function unauthorized(): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', 'Sesja jest nieprawidłowa lub wygasła.');
}

export function forbiddenOrigin(): HttpError {
  return new HttpError(403, 'INVALID_ORIGIN', 'Nieprawidłowe źródło żądania.');
}

export function normalizeError(error: unknown): { status: number; body: ApiError } {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Wystąpił nieoczekiwany błąd.',
      },
    },
  };
}
