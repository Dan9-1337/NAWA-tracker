import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { HttpResponse } from '../api/_lib/http.js';
import { createShareCardHandler } from '../api/share-card.js';
import { createResponsesHandler } from '../api/responses.js';
import { createCurrentResponseHandler } from '../api/responses/current.js';
import { createStatisticsHandler } from '../api/statistics.js';
import { createPublicStatisticsHandler } from '../api/statistics/public.js';

type ApiHandler = (request: ApiRequest, response: HttpResponse & { send?(body: Buffer): void }) => Promise<unknown> | unknown;

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

const API_PORT = Number(process.env.LOCAL_API_PORT ?? 3001);

const routes: Array<{ method: string; path: string; handler: ApiHandler }> = [
  { method: 'POST', path: '/api/responses', handler: createResponsesHandler() },
  { method: 'PUT', path: '/api/responses', handler: createResponsesHandler() },
  { method: 'DELETE', path: '/api/responses', handler: createResponsesHandler() },
  { method: 'POST', path: '/api/responses/current', handler: createCurrentResponseHandler() },
  { method: 'POST', path: '/api/statistics', handler: createStatisticsHandler() },
  { method: 'POST', path: '/api/statistics/public', handler: createPublicStatisticsHandler() },
  { method: 'GET', path: '/api/share-card', handler: createShareCardHandler() as ApiHandler },
];

function adaptResponse(res: ServerResponse): HttpResponse & { send(body: Buffer): void } {
  let statusCode = 200;
  const pendingHeaders = new Map<string, string | string[]>();
  let finished = false;

  const response: HttpResponse & { send(body: Buffer): void } = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    setHeader(name: string, value: string | string[]) {
      pendingHeaders.set(name, value);
      return response;
    },
    json(body: unknown) {
      if (finished) return response;
      finished = true;
      for (const [name, value] of pendingHeaders) {
        res.setHeader(name, value);
      }
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
      return response;
    },
    send(body: Buffer) {
      if (finished) return;
      finished = true;
      for (const [name, value] of pendingHeaders) {
        res.setHeader(name, value);
      }
      res.statusCode = statusCode;
      res.end(body);
    },
  };

  return response;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16 * 1024) {
      throw Object.assign(new Error('Payload too large'), { statusCode: 413 });
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 });
  }
}

function normalizeHeaders(req: IncomingMessage): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    headers[name] = value;
  }
  return headers;
}

const server = createServer(async (req, res) => {
  const method = req.method?.toUpperCase() ?? 'GET';
  const path = (req.url ?? '/').split('?')[0] ?? '/';
  const route = routes.find((entry) => entry.method === method && entry.path === path);

  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Not found.' }));
    return;
  }

  const response = adaptResponse(res);

  try {
    const body = method === 'GET' || method === 'HEAD' ? undefined : await readJsonBody(req);
    const requestUrl = req.url ?? '/';
    const request: ApiRequest = {
      method,
      body,
      headers: normalizeHeaders(req),
      socket: { remoteAddress: req.socket.remoteAddress },
      url: requestUrl,
      query: Object.fromEntries(new URL(requestUrl, 'http://127.0.0.1').searchParams.entries()),
    };
    await route.handler(request, response);
  } catch (error) {
    if (res.headersSent || res.writableEnded) return;
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_REQUEST',
        message: statusCode === 413 ? 'Dane żądania są zbyt duże.' : 'Nieprawidłowe dane żądania.',
      }),
    );
  }
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${API_PORT} is already in use. Stop the other process (lsof -nP -iTCP:${API_PORT} -sTCP:LISTEN) and retry.`,
    );
    process.exit(1);
  }
  throw error;
});

server.listen(API_PORT, '127.0.0.1', () => {
  console.log(`Local API listening on http://127.0.0.1:${API_PORT}`);
});
