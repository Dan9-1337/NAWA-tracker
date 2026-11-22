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

/**
 * Same-origin GET requests do not carry an Origin header in browsers. Accept a missing header and reject only a
 * header that is present and different, which is what a cross-origin fetch sends.
 */
export function assertSameOriginWhenPresent(
  request: OriginRequest,
  expectedOrigin = loadServerEnv().appOrigin,
): void {
  const header = request.headers.origin;
  if (header === undefined) return;

  if (typeof header !== 'string' || header !== expectedOrigin) {
    throw forbiddenOrigin();
  }
}
