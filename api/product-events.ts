import { productEventRequestSchema, productEventResultSchema } from '../shared/validation.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from './_lib/http.js';
import { assertSameOrigin } from './_lib/origin.js';
import { assertRpcSucceeded } from './_lib/questionnaire.js';
import { requireTelegramIdentity, type VerifiedTelegramIdentity } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type ProductEventsRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type ProductEventsDependencies = {
  getClient: () => ReturnType<typeof getSupabaseAdmin>;
  assertSameOrigin: (request: ProductEventsRequest) => void;
  requireTelegramIdentity: (request: ProductEventsRequest) => VerifiedTelegramIdentity;
};

const defaultDependencies: ProductEventsDependencies = {
  getClient: getSupabaseAdmin,
  assertSameOrigin,
  requireTelegramIdentity,
};

export function createProductEventsHandler(overrides: Partial<ProductEventsDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function productEventsHandler(
    request: ProductEventsRequest,
    response: HttpResponse,
  ): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      const identity = dependencies.requireTelegramIdentity(request);
      const input = parseJsonBody(request, productEventRequestSchema);
      const client = dependencies.getClient();
      const result = await client.from('product_events').insert({
        telegram_user_id: identity.user.id,
        event_name: input.eventName,
        payload: input.payload ?? {},
      });
      assertRpcSucceeded(result.error);
      response.status(200).json(productEventResultSchema.parse({ logged: true }));
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createProductEventsHandler();
