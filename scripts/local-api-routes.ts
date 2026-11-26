import type { HttpResponse } from '../api/_lib/http.js';
import { createBotHandler } from '../api/bot.js';
import { createKeepAliveHandler } from '../api/cron/keep-alive.js';
import { createRemindersHandler } from '../api/cron/reminders.js';
import { createIntakeSummaryHandler } from '../api/intake-summary.js';
import { createOrientationMarkHandler } from '../api/orientation-mark.js';
import { createProductEventsHandler } from '../api/product-events.js';
import { createResponsesHandler } from '../api/responses.js';
import { createCurrentResponseHandler } from '../api/responses/current.js';
import { createScholarshipReportHandler } from '../api/scholarship-report.js';
import { createStatisticsHandler } from '../api/statistics.js';

export type ApiRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

export type ApiHandler = (request: ApiRequest, response: HttpResponse & { send?(body: Buffer): void }) => Promise<unknown> | unknown;

// Vercel serves every file in api/ on its own; each handler file needs a route here (scripts/local-api-routes.test.ts checks).
export const routes: Array<{ method: string; path: string; handler: ApiHandler }> = [
  { method: 'POST', path: '/api/responses', handler: createResponsesHandler() },
  { method: 'PUT', path: '/api/responses', handler: createResponsesHandler() },
  { method: 'DELETE', path: '/api/responses', handler: createResponsesHandler() },
  { method: 'POST', path: '/api/responses/current', handler: createCurrentResponseHandler() },
  { method: 'POST', path: '/api/statistics', handler: createStatisticsHandler() },
  { method: 'POST', path: '/api/intake-summary', handler: createIntakeSummaryHandler() },
  { method: 'POST', path: '/api/product-events', handler: createProductEventsHandler() },
  { method: 'GET', path: '/api/scholarship-report', handler: createScholarshipReportHandler() },
  { method: 'POST', path: '/api/scholarship-report', handler: createScholarshipReportHandler() },
  { method: 'PUT', path: '/api/scholarship-report', handler: createScholarshipReportHandler() },
  { method: 'DELETE', path: '/api/scholarship-report', handler: createScholarshipReportHandler() },
  { method: 'POST', path: '/api/bot', handler: createBotHandler() },
  { method: 'GET', path: '/api/cron/reminders', handler: createRemindersHandler() },
  { method: 'GET', path: '/api/cron/keep-alive', handler: createKeepAliveHandler() },
  { method: 'GET', path: '/api/orientation-mark', handler: createOrientationMarkHandler() },
];
