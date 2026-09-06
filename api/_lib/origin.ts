import { loadServerEnv } from './env.js';
import { forbiddenOrigin } from './errors.js';

type OriginRequest = {
  headers: Record<string, string | string[] | undefined>;
};

export function assertSameOrigin(request: OriginRequest, expectedOrigin = loadServerEnv().appOrigin): void {
  const header = request.headers.origin;

  if (typeof header !== 'string' || header !== expectedOrigin) {
    throw forbiddenOrigin();
  }
}
