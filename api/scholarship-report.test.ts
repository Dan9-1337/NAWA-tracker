import { describe, expect, it, vi } from 'vitest';

import { apiErrorSchema, scholarshipReportSummarySchema } from '../shared/validation';
import { HttpError, unauthorized } from './_lib/errors';
import { assertSameOriginWhenPresent } from './_lib/origin';
import { requireTelegramIdentity, signTelegramInitData } from './_lib/telegram-auth';
import {
  createScholarshipReportHandler,
  type ScholarshipReportHandlerDependencies,
} from './scholarship-report';

const BOT_TOKEN = 'test-bot-token-that-is-at-least-32-characters';
const IDENTITY_HASH = 'a'.repeat(64);
const USER_ID = 515151515;

const preparatoryAnswers = {
  studyRoute: 'preparatory_course',
  prepCentreId: 'umcs-lublin',
  programmeId: 'prawo',
  universityId: 'science-078',
} as const;

const typedAnswers = {
  studyRoute: 'direct_studies',
  customProgramme: 'Moje studia',
  universityId: 'science-096',
} as const;

const storedReport = {
  studyRoute: 'preparatory_course',
  prepCentreId: 'umcs-lublin',
  programmeId: 'prawo',
  universityId: 'science-078',
  scoreSnapshot: 72,
} as const;

const summaryRpc = {
  total: 4,
  countries: [
    { country: 'UA', count: 3 },
    { country: 'BY', count: 1 },
  ],
  paths: [
    { route: 'preparatory_course', count: 2 },
    { route: 'direct_studies', count: 2 },
  ],
  centres: [{ centreId: 'umcs-lublin', count: 2 }],
  fields: [
    {
      group: '06',
      count: 2,
      programmes: [
        { programmeId: 'informatyka', count: 2 },
        { programmeId: 'psychologia', count: 0 },
      ].filter((programme) => programme.count > 0),
    },
  ],
  typedProgrammeCount: 2,
  universities: [
    { universityId: 'science-096', count: 2 },
    { universityId: 'science-078', count: 1 },
    { universityId: 'science-071', count: 1 },
  ],
} as const;

type Request = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

function initDataHeader(userId = USER_ID) {
  const initData = signTelegramInitData(
    { user: JSON.stringify({ id: userId, username: 'tester' }) },
    BOT_TOKEN,
    1_700_000_000,
  );
  return { authorization: `tma ${initData}` };
}

function createResponseDouble() {
  const state: { status?: number; body?: unknown; headers: Map<string, string | string[]> } = {
    headers: new Map(),
  };
  const response = {
    status(status: number) {
      state.status = status;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    setHeader(name: string, value: string | string[]) {
      state.headers.set(name, value);
      return response;
    },
  };
  return { response, state };
}

function request(method: string, body: unknown = {}, extra: Partial<Request> = {}): Request {
  return {
    method,
    body,
    headers: { origin: 'https://tracker.example', ...initDataHeader() },
    ...extra,
  };
}

type RpcResult = { data: unknown; error: { message: string; code?: string; details?: string | null } | null };

function reportFromParameters(parameters: Record<string, unknown>, scoreSnapshot: number) {
  return {
    studyRoute: parameters.p_study_route,
    ...(parameters.p_prep_centre_id ? { prepCentreId: parameters.p_prep_centre_id } : {}),
    ...(parameters.p_programme_id ? { programmeId: parameters.p_programme_id } : {}),
    ...(parameters.p_custom_programme ? { customProgramme: parameters.p_custom_programme } : {}),
    universityId: parameters.p_university_id,
    scoreSnapshot,
  };
}

function dependencies(
  implementation: (name: string, parameters: Record<string, unknown>) => RpcResult = () => ({
    data: storedReport,
    error: null,
  }),
  overrides: Partial<ScholarshipReportHandlerDependencies> = {},
): ScholarshipReportHandlerDependencies {
  return {
    getClient: vi.fn(() => ({
      rpc: vi.fn((name, parameters) => Promise.resolve(implementation(name, parameters))),
    })),
    hashIdentity: vi.fn(() => IDENTITY_HASH),
    assertSameOrigin: vi.fn(),
    assertSameOriginWhenPresent: vi.fn(),
    requireTelegramIdentity: vi.fn(() => ({
      user: { id: USER_ID, username: 'tester' },
      authDate: 1_700_000_000,
    })),
    ...overrides,
  };
}

function rpcCalls(deps: ScholarshipReportHandlerDependencies) {
  const getClient = deps.getClient as unknown as {
    mock: {
      results: Array<{
        value: { rpc: { mock: { calls: Array<[string, Record<string, unknown>]> } } };
      }>;
    };
  };
  return getClient.mock.results.flatMap((result) => result.value.rpc.mock.calls);
}

describe('POST /api/scholarship-report', () => {
  it('rejects unsupported methods before doing work', async () => {
    const deps = dependencies();
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('PATCH'), response);

    expect(state.status).toBe(405);
    expect(state.headers.get('Allow')).toBe('GET, POST, PUT, DELETE');
    expect(deps.getClient).not.toHaveBeenCalled();
  });

  it('requires the configured Origin before writing', async () => {
    const deps = dependencies(undefined, {
      assertSameOrigin: vi.fn(() => {
        throw new HttpError(403, 'INVALID_ORIGIN', 'The request origin is not allowed.');
      }),
    });
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', { report: preparatoryAnswers }),
      response,
    );

    expect(state.status).toBe(403);
  });

  it('requires verified Telegram initData', async () => {
    const deps = dependencies(undefined, {
      requireTelegramIdentity: (incoming) =>
        requireTelegramIdentity(incoming, { botToken: BOT_TOKEN, nowSeconds: 1_700_000_100 }),
    });
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      { method: 'POST', body: { report: preparatoryAnswers }, headers: { origin: 'https://tracker.example' } },
      response,
    );

    expect(state.status).toBe(401);
    expect(state.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Session is invalid or has expired.' },
    });
  });

  it('creates the report with the score and ISCED code chosen by the server', async () => {
    const deps = dependencies((_name, parameters) => ({
      data: reportFromParameters(parameters, 72),
      error: null,
    }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', { report: preparatoryAnswers }),
      response,
    );

    const [name, parameters] = rpcCalls(deps)[0]!;
    expect(name).toBe('create_scholarship_report');
    expect(parameters).toMatchObject({
      p_identity_hash: IDENTITY_HASH,
      p_intake_year: 2026,
      p_study_route: 'preparatory_course',
      p_prep_centre_id: 'umcs-lublin',
      p_programme_id: 'prawo',
      p_programme_isced: '0421',
      p_custom_programme: null,
      p_university_id: 'science-078',
    });
    expect(JSON.stringify(parameters)).not.toContain(String(USER_ID));
    expect(JSON.stringify(parameters)).not.toContain('tester');
    expect(state.status).toBe(201);
    expect(state.body).toEqual({
      report: { ...storedReport, programmeName: 'Prawo' },
    });
  });

  it('sends a typed kierunek trimmed and without an ISCED code', async () => {
    const deps = dependencies((_name, parameters) => ({
      data: reportFromParameters(parameters, 66),
      error: null,
    }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', {
        report: { ...typedAnswers, customProgramme: '  Moje studia  ' },
      }),
      response,
    );

    const [, parameters] = rpcCalls(deps)[0]!;
    expect(parameters).toMatchObject({
      p_programme_id: null,
      p_programme_isced: null,
      p_custom_programme: 'Moje studia',
    });
    expect(state.status).toBe(201);
    expect(state.body).toEqual({
      report: { ...typedAnswers, scoreSnapshot: 66 },
    });
  });

  it('returns 409 REPORT_EXISTS on a second report', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'report_exists' } }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', { report: preparatoryAnswers }),
      response,
    );

    expect(state.status).toBe(409);
    expect(state.body).toEqual({
      error: { code: 'REPORT_EXISTS', message: 'This account already has a scholarship-holder report.' },
    });
    expect(apiErrorSchema.parse(state.body)).toEqual(state.body);
  });

  it('returns 409 SCORE_BELOW_THRESHOLD and stores nothing', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'score_below_threshold' } }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', { report: preparatoryAnswers }),
      response,
    );

    expect(state.status).toBe(409);
    expect(state.body).toEqual({
      error: {
        code: 'SCORE_BELOW_THRESHOLD',
        message: 'A score of at least 60 is required for the scholarship-holder survey.',
      },
    });
    expect(state.body).not.toHaveProperty('report');
  });

  it('returns 404 PROFILE_NOT_FOUND without a 2026 Director survey', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'profile_not_found' } }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', { report: preparatoryAnswers }),
      response,
    );

    expect(state.status).toBe(404);
    expect(state.body).toEqual({
      error: { code: 'PROFILE_NOT_FOUND', message: 'No survey was found for this Telegram account.' },
    });
  });

  it('rejects an unknown programme id before calling the database', async () => {
    const deps = dependencies();
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('POST', {
        report: { ...preparatoryAnswers, programmeId: 'not-a-programme' },
      }),
      response,
    );

    expect(state.status).toBe(400);
    expect(state.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'Invalid request data.' },
    });
    expect(deps.getClient).not.toHaveBeenCalled();
  });

  it.each([
    ['a centre on the direct path', { ...typedAnswers, prepCentreId: 'umcs-lublin' }],
    ['a missing preparatory centre', { ...preparatoryAnswers, prepCentreId: undefined }],
    ['both a programme and typed text', { ...typedAnswers, programmeId: 'prawo' }],
    ['neither a programme nor typed text', { ...typedAnswers, customProgramme: undefined }],
    ['an unknown preparatory centre', { ...preparatoryAnswers, prepCentreId: 'unknown-centre' }],
    ['a university outside the Director track', { ...typedAnswers, universityId: 'culture-013' }],
    ['typed text longer than 80 characters', { ...typedAnswers, customProgramme: 'a'.repeat(81) }],
    ['typed text with a line break', { ...typedAnswers, customProgramme: 'one\ntwo' }],
  ])('rejects %s with 400 and nothing stored', async (_label, report) => {
    const deps = dependencies();
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('POST', { report }), response);

    expect(state.status).toBe(400);
    expect(deps.getClient).not.toHaveBeenCalled();
  });
});

describe('PUT /api/scholarship-report', () => {
  it('replaces the report and returns the refreshed snapshot', async () => {
    const deps = dependencies((_name, parameters) => ({
      data: reportFromParameters(parameters, 75),
      error: null,
    }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('PUT', { report: typedAnswers }),
      response,
    );

    const [name, parameters] = rpcCalls(deps)[0]!;
    expect(name).toBe('update_scholarship_report');
    expect(parameters).toMatchObject({ p_identity_hash: IDENTITY_HASH, p_intake_year: 2026 });
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ report: { ...typedAnswers, scoreSnapshot: 75 } });
  });

  it('answers 409 SCORE_BELOW_THRESHOLD when the survey now scores below 60', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'score_below_threshold' } }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('PUT', { report: typedAnswers }),
      response,
    );

    expect(state.status).toBe(409);
    expect(state.body).toEqual({
      error: {
        code: 'SCORE_BELOW_THRESHOLD',
        message: 'A score of at least 60 is required for the scholarship-holder survey.',
      },
    });
  });

  it('answers 404 REPORT_NOT_FOUND without a report', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'report_not_found' } }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('PUT', { report: typedAnswers }),
      response,
    );

    expect(state.status).toBe(404);
    expect(state.body).toEqual({
      error: { code: 'REPORT_NOT_FOUND', message: 'No scholarship-holder report was found for this account.' },
    });
  });
});

describe('GET /api/scholarship-report', () => {
  it('allows a same-origin GET without an Origin header but refuses a cross-origin one', async () => {
    const deps = dependencies(() => ({ data: null, error: null }), {
      assertSameOriginWhenPresent: (incoming) =>
        assertSameOriginWhenPresent(incoming, 'https://tracker.example'),
    });
    const handler = createScholarshipReportHandler(deps);

    const sameOrigin = createResponseDouble();
    await handler({ method: 'GET', headers: initDataHeader() }, sameOrigin.response);
    expect(sameOrigin.state.status).toBe(200);

    const crossOrigin = createResponseDouble();
    await handler({ method: 'GET', headers: { origin: 'https://evil.example', ...initDataHeader() } }, crossOrigin.response);
    expect(crossOrigin.state.status).toBe(403);
  });

  it('answers { report: null } without a report', async () => {
    const deps = dependencies(() => ({ data: null, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('GET'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ report: null });
  });

  it('returns the owned report with its catalogue name', async () => {
    const deps = dependencies(() => ({ data: storedReport, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('GET'), response);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({ report: { ...storedReport, programmeName: 'Prawo' } });
  });

  it('returns the summary with names resolved from the catalogue', async () => {
    const deps = dependencies(() => ({ data: summaryRpc, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('GET', {}, { query: { summary: '1' } }),
      response,
    );

    const [, parameters] = rpcCalls(deps)[0]!;
    expect(parameters).toEqual({
      p_identity_hash: IDENTITY_HASH,
      p_intake_year: 2026,
      p_ranking_country: null,
    });
    expect(state.status).toBe(200);
    expect(state.body).toMatchObject({
      total: 4,
      fields: [
        {
          group: '06',
          count: 2,
          programmes: [{ programmeId: 'informatyka', programmeName: 'Informatyka', count: 2 }],
        },
      ],
    });
    expect(scholarshipReportSummarySchema.parse(state.body)).toEqual(state.body);
  });

  it('passes a validated country filter to the summary', async () => {
    const deps = dependencies(() => ({ data: summaryRpc, error: null }));
    const { response } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('GET', {}, { query: { summary: '1', country: 'BY' } }),
      response,
    );

    const [, parameters] = rpcCalls(deps)[0]!;
    expect(parameters.p_ranking_country).toBe('BY');
  });

  it('keeps the complete country filter list on a filtered summary', async () => {
    const filteredSummary = {
      ...summaryRpc,
      total: 1,
      countries: [
        { country: 'UA', count: 3 },
        { country: 'BY', count: 1 },
      ],
      paths: [
        { route: 'preparatory_course', count: 1 },
        { route: 'direct_studies', count: 0 },
      ],
      centres: [{ centreId: 'umcs-lublin', count: 1 }],
      fields: [
        {
          group: '04',
          count: 1,
          programmes: [{ programmeId: 'prawo', count: 1 }],
        },
      ],
      typedProgrammeCount: 0,
      universities: [{ universityId: 'science-078', count: 1 }],
    };
    const deps = dependencies(() => ({ data: filteredSummary, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('GET', {}, { query: { summary: '1', country: 'BY' } }),
      response,
    );

    expect(state.status).toBe(200);
    expect(state.body).toMatchObject({
      total: 1,
      countries: [
        { country: 'UA', count: 3 },
        { country: 'BY', count: 1 },
      ],
      fields: [
        {
          group: '04',
          count: 1,
          programmes: [{ programmeId: 'prawo', programmeName: 'Prawo', count: 1 }],
        },
      ],
    });
    expect(scholarshipReportSummarySchema.parse(state.body)).toEqual(state.body);
  });

  it('rejects an invalid country filter with 400', async () => {
    const deps = dependencies();
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('GET', {}, { query: { summary: '1', country: 'Ukraine' } }),
      response,
    );

    expect(state.status).toBe(400);
    expect(deps.getClient).not.toHaveBeenCalled();
  });

  it('answers 404 REPORT_NOT_FOUND for the summary without a report', async () => {
    const deps = dependencies(() => ({ data: null, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('GET', {}, { query: { summary: '1' } }),
      response,
    );

    expect(state.status).toBe(404);
    expect(state.body).toEqual({
      error: { code: 'REPORT_NOT_FOUND', message: 'No scholarship-holder report was found for this account.' },
    });
  });

  it('never puts typed kierunek text into a summary', async () => {
    const deps = dependencies(() => ({ data: summaryRpc, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(
      request('GET', {}, { query: { summary: '1' } }),
      response,
    );

    expect(JSON.stringify(state.body)).not.toContain('Tajne studia');
    expect(state.body).not.toHaveProperty('customProgramme');
  });
});

describe('DELETE /api/scholarship-report', () => {
  it('deletes the owned report and keeps the survey untouched', async () => {
    const deps = dependencies(() => ({ data: { deleted: true }, error: null }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('DELETE'), response);

    const [name, parameters] = rpcCalls(deps)[0]!;
    expect(name).toBe('delete_scholarship_report');
    expect(parameters).toEqual({ p_identity_hash: IDENTITY_HASH, p_intake_year: 2026 });
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ deleted: true });
  });

  it('answers 404 REPORT_NOT_FOUND without a report', async () => {
    const deps = dependencies(() => ({ data: null, error: { message: 'report_not_found' } }));
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('DELETE'), response);

    expect(state.status).toBe(404);
  });

  it('surfaces a missing Telegram session as 401 even for DELETE', async () => {
    const deps = dependencies(undefined, {
      requireTelegramIdentity: vi.fn(() => {
        throw unauthorized();
      }),
    });
    const { response, state } = createResponseDouble();

    await createScholarshipReportHandler(deps)(request('DELETE'), response);

    expect(state.status).toBe(401);
    expect(deps.getClient).not.toHaveBeenCalled();
  });
});
