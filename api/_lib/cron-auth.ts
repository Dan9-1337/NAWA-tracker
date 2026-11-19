import { HttpError } from './errors.js';

type CronRequest = {
  headers: Record<string, string | string[] | undefined>;
};

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; anything else is rejected. */
export function assertCronAuthorized(
  request: CronRequest,
  getCronSecret: () => string | undefined,
): void {
  const cronSecret = getCronSecret();
  if (!cronSecret || cronSecret.length < 32) {
    throw new HttpError(500, 'INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd.');
  }

  const rawHeader = request.headers.authorization ?? request.headers.Authorization;
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const expected = `Bearer ${cronSecret}`;
  if (!header || header !== expected) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Sesja jest nieprawidłowa lub wygasła.');
  }
}
