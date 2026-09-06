import { HttpError } from '../_lib/errors.js';
import { assertMethod, sendError, type HttpResponse } from '../_lib/http.js';
import { assertRpcSucceeded } from '../_lib/questionnaire.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

type KeepAliveRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type KeepAliveDependencies = {
  getClient: () => ReturnType<typeof getSupabaseAdmin>;
  getCronSecret: () => string | undefined;
};

function assertCronAuthorized(
  request: KeepAliveRequest,
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

const defaultDependencies: KeepAliveDependencies = {
  getClient: getSupabaseAdmin,
  getCronSecret: () => process.env.CRON_SECRET,
};

export function createKeepAliveHandler(overrides: Partial<KeepAliveDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function keepAliveHandler(
    request: KeepAliveRequest,
    response: HttpResponse,
  ): Promise<void> {
    try {
      assertMethod(request, response, 'GET');
      assertCronAuthorized(request, dependencies.getCronSecret);
      const client = dependencies.getClient();
      const result = await client.from('responses').select('id').limit(1);
      assertRpcSucceeded(result.error);
      response.status(200).json({ ok: true });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createKeepAliveHandler();
