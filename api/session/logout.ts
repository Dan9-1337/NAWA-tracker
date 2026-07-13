import { logoutSessionRequestSchema, logoutSessionResultSchema } from '../../shared/validation.js';
import { clearSessionCookie, readCookie } from '../_lib/cookies.js';
import { loadServerEnv } from '../_lib/env.js';
import { assertMethod, parseJsonBody, sendError, type HttpResponse } from '../_lib/http.js';
import { assertSameOrigin } from '../_lib/origin.js';
import { assertRpcSucceeded, type RpcClient } from '../_lib/questionnaire.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';
import { hashSessionToken } from '../_lib/tokens.js';

type LogoutRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

export type LogoutDependencies = {
  getClient: () => RpcClient;
  assertSameOrigin: (request: LogoutRequest) => void;
  clearSessionCookie: (response: HttpResponse) => void;
  readCookie: (cookieHeader: string | string[] | undefined, name: string) => string | null;
  hashSessionToken: (token: string) => string;
  loadServerEnv: () => { sessionCookieName: string };
};

const defaultDependencies: LogoutDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  assertSameOrigin,
  clearSessionCookie,
  readCookie,
  hashSessionToken,
  loadServerEnv,
};

export function createLogoutHandler(overrides: Partial<LogoutDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function logoutHandler(request: LogoutRequest, response: HttpResponse): Promise<void> {
    try {
      assertMethod(request, response, 'POST');
      dependencies.assertSameOrigin(request);
      dependencies.clearSessionCookie(response);
      parseJsonBody(request, logoutSessionRequestSchema);

      const token = dependencies.readCookie(
        request.headers.cookie,
        dependencies.loadServerEnv().sessionCookieName,
      );
      if (token) {
        let sessionTokenHash: string | null = null;
        try {
          sessionTokenHash = dependencies.hashSessionToken(token);
        } catch {
          sessionTokenHash = null;
        }

        if (sessionTokenHash) {
          const revokeResult = await dependencies.getClient().rpc('revoke_anonymous_session', {
            p_session_token_hash: sessionTokenHash,
          });
          assertRpcSucceeded(revokeResult.error);
          if (typeof revokeResult.data !== 'boolean') throw new Error('Invalid RPC result');
        }
      }

      response.status(200).json(logoutSessionResultSchema.parse({ loggedOut: true }));
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default createLogoutHandler();
