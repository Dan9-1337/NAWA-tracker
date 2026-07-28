import { ImageResponse } from '@vercel/og';

import { statisticsResultSchema } from '../shared/validation.js';
import { loadServerEnv } from './_lib/env.js';
import { sendError } from './_lib/http.js';
import { assertRpcSucceeded, parseStatistics, type RpcClient } from './_lib/questionnaire.js';
import { verifyTelegramInitData } from './_lib/telegram-auth.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

type ShareCardRequest = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};

type ShareCardResponse = {
  status(code: number): ShareCardResponse;
  setHeader(name: string, value: string): ShareCardResponse;
  send(body: Buffer): void;
  json(body: unknown): void;
};

type ShareCardDependencies = {
  getClient: () => RpcClient;
  verifyInitData: typeof verifyTelegramInitData;
};

const defaultDependencies: ShareCardDependencies = {
  getClient: getSupabaseAdmin as () => RpcClient,
  verifyInitData: verifyTelegramInitData,
};

function readQueryParam(request: ShareCardRequest, name: string): string | null {
  const fromQuery = request.query?.[name];
  if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery;
  if (Array.isArray(fromQuery) && fromQuery[0]) return fromQuery[0];

  if (request.url) {
    const value = new URL(request.url, 'http://localhost').searchParams.get(name);
    if (value && value.length > 0) return value;
  }

  return null;
}

function percentileLabel(lowerScorePercentage: number): string {
  return `${Math.round(lowerScorePercentage)}%`;
}

export function createShareCardHandler(overrides: Partial<ShareCardDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function shareCardHandler(
    request: ShareCardRequest,
    response: ShareCardResponse,
  ): Promise<void> {
    try {
      if (request.method && request.method !== 'GET') {
        response.status(405).setHeader('Allow', 'GET').json({
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Metoda żądania nie jest obsługiwana.' },
        });
        return;
      }

      const initData = readQueryParam(request, 'initData');
      if (!initData) {
        response.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Sesja jest nieprawidłowa lub wygasła.' },
        });
        return;
      }

      const { telegramBotToken } = loadServerEnv();
      const identity = dependencies.verifyInitData(initData, telegramBotToken);
      const client = dependencies.getClient();
      const statisticsResult = await client.rpc('get_current_statistics', {
        p_telegram_user_id: identity.user.id,
      });
      assertRpcSucceeded(statisticsResult.error);
      if (statisticsResult.data === null) {
        response.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Nie znaleziono ankiety.' },
        });
        return;
      }

      const statistics = statisticsResultSchema.parse(parseStatistics(statisticsResult.data));
      const percentile =
        statistics.lowerScorePercentage != null
          ? percentileLabel(statistics.lowerScorePercentage)
          : '—';

      const image = new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #2563eb 100%)',
              color: '#f8fafc',
              padding: '48px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.04em' }}>NAWA Tracker</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 22, opacity: 0.85 }}>Your group position</div>
              <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>{percentile}</div>
              <div style={{ fontSize: 24, opacity: 0.9 }}>
                {statistics.detailsAvailable
                  ? `Group size: ${statistics.groupResponseCount}`
                  : 'Waiting for more responses'}
              </div>
            </div>
            <div style={{ fontSize: 18, opacity: 0.7 }}>Unofficial peer comparison</div>
          </div>
        ),
        { width: 1080, height: 1920 },
      );

      const buffer = Buffer.from(await image.arrayBuffer());
      response.status(200);
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Cache-Control', 'private, no-store');
      response.send(buffer);
    } catch (error) {
      sendError(response as Parameters<typeof sendError>[0], error);
    }
  };
}

export default createShareCardHandler();
