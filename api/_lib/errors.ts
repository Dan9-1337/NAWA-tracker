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

export function profileExists(): HttpError {
  return new HttpError(409, 'PROFILE_EXISTS', 'Ten profil Telegram ma już ankietę.');
}

export function profileNotFound(): HttpError {
  return new HttpError(404, 'PROFILE_NOT_FOUND', 'Nie znaleziono ankiety dla tego konta Telegram.');
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
