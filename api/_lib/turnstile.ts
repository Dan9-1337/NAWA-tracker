import { loadServerEnv } from './env.js';
import { HttpError } from './errors.js';
import { z } from 'zod';

type TurnstileOptions = {
  secret?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

const turnstileResultSchema = z
  .object({
    success: z.boolean(),
    hostname: z.string().optional(),
    'error-codes': z.array(z.string()).optional(),
  })
  .passthrough();

function providerUnavailable(): HttpError {
  return new HttpError(503, 'TURNSTILE_UNAVAILABLE', 'Weryfikacja jest chwilowo niedostępna.');
}

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
  options: TurnstileOptions = {},
): Promise<void> {
  if (!token.trim()) {
    throw new HttpError(400, 'TURNSTILE_REQUIRED', 'Potwierdź, że nie jesteś robotem.');
  }

  const env = loadServerEnv();
  const body = new URLSearchParams({
    secret: options.secret ?? env.turnstileSecretKey,
    response: token,
  });
  if (remoteIp) body.set('remoteip', remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  let result: z.infer<typeof turnstileResultSchema>;

  try {
    const response = await (options.fetch ?? fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });

    if (!response.ok) throw providerUnavailable();

    const parsed = turnstileResultSchema.safeParse(await response.json());
    if (!parsed.success) throw providerUnavailable();
    result = parsed.data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw providerUnavailable();
  } finally {
    clearTimeout(timeout);
  }

  if (
    !result.success ||
    !result.hostname ||
    result.hostname.toLowerCase() !== env.appHostname.toLowerCase()
  ) {
    throw new HttpError(400, 'TURNSTILE_FAILED', 'Nie udało się potwierdzić weryfikacji.');
  }
}
