import { describe, expect, it } from 'vitest';
import { assertCanonicalToken, generateOpaqueToken } from '../api/_lib/tokens';
import {
  apiErrorSchema,
  canonicalOpaqueTokenSchema,
  createResponseRequestSchema,
  createResponseResultSchema,
  currentResponseRequestSchema,
  currentResponseResultSchema,
  logoutSessionRequestSchema,
  logoutSessionResultSchema,
  publicStatisticsRequestSchema,
  publicStatisticsResultSchema,
  restoreSessionRequestSchema,
  restoreSessionResultSchema,
  rotateRecoveryRequestSchema,
  rotateRecoveryResultSchema,
  statisticsRequestSchema,
  statisticsResultSchema,
  updateResponseRequestSchema,
  updateResponseResultSchema,
} from './validation';

const validForm = {
  hasPolishCitizenship: false,
  rankingCountry: 'Ukraina',
  schoolCountry: 'Ukraina',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  averageGrade: 85,
  maximumGrade: 100,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-07-13',
} as const;

const validStatusCounts = {
  submitted: 2,
  formal_review_in_progress: 2,
  correction_requested: 0,
  formal_review_completed: 2,
  merit_review_in_progress: 1,
  merit_review_positive: 1,
  merit_review_negative: 0,
  awaiting_decision: 1,
  scholarship_awarded: 1,
  scholarship_not_awarded: 0,
} as const;

const validStatistics = {
  detailsAvailable: true,
  group: 'track-country',
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 10,
  groupResponseCount: 10,
  medianScore: 82.5,
  lowerScorePercentage: 40,
  statusCounts: validStatusCounts,
} as const;

const recoveryToken = 'A'.repeat(43);
const recoveryCredential = {
  recoveryToken,
  recoveryUrl: `https://app.example/#restore=${recoveryToken}`,
};
const base64urlAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const validFinalCharacters = 'AEIMQUYcgkosw048';

describe('API request contracts', () => {
  it('accepts only questionnaire data and Turnstile proof for create', () => {
    const request = { response: validForm, turnstileToken: 'turnstile-proof' };

    expect(createResponseRequestSchema.parse(request)).toEqual(request);
    expect(() => createResponseRequestSchema.parse({ ...request, anonymousToken: crypto.randomUUID() })).toThrow();
    expect(() => createResponseRequestSchema.parse({ ...request, responseId: crypto.randomUUID() })).toThrow();
    expect(() => createResponseRequestSchema.parse({ ...request, recoveryToken })).toThrow();
    expect(() => createResponseRequestSchema.parse({ ...request, sessionToken: recoveryToken })).toThrow();
  });

  it('accepts only questionnaire data for update', () => {
    expect(updateResponseRequestSchema.parse({ response: validForm })).toEqual({ response: validForm });
    expect(() =>
      updateResponseRequestSchema.parse({ response: validForm, turnstileToken: 'turnstile-proof' }),
    ).toThrow();
  });

  it.each([
    ['current', currentResponseRequestSchema],
    ['statistics', statisticsRequestSchema],
    ['logout', logoutSessionRequestSchema],
    ['rotate', rotateRecoveryRequestSchema],
  ])('accepts an empty strict body for %s', (_name, schema) => {
    expect(schema.parse({})).toEqual({});
    expect(() => schema.parse({ responseId: crypto.randomUUID() })).toThrow();
  });

  it('accepts bounded string recovery values and only the required restore fields', () => {
    const request = { recoveryToken, turnstileToken: 'turnstile-proof' };

    expect(restoreSessionRequestSchema.parse(request)).toEqual(request);
    expect(
      restoreSessionRequestSchema.parse({ recoveryToken: 'short', turnstileToken: 'turnstile-proof' }),
    ).toEqual({ recoveryToken: 'short', turnstileToken: 'turnstile-proof' });
    expect(() => restoreSessionRequestSchema.parse({ ...request, responseId: crypto.randomUUID() })).toThrow();
  });

  it.each([
    undefined,
    null,
    42,
    {},
    'A'.repeat(16 * 1024 + 1),
  ])('rejects a missing, non-string, or oversized recovery value: %j', (invalidToken) => {
    expect(
      restoreSessionRequestSchema.safeParse({ recoveryToken: invalidToken, turnstileToken: 'turnstile-proof' }).success,
    ).toBe(false);
  });

  it('keeps returned recovery credentials strictly canonical', () => {
    const noncanonicalToken = `${'A'.repeat(42)}B`;

    expect(
      rotateRecoveryResultSchema.safeParse({
        recoveryToken: noncanonicalToken,
        recoveryUrl: `https://app.example/#restore=${noncanonicalToken}`,
      }).success,
    ).toBe(false);
  });

  it.each([
    ['anonymousToken', crypto.randomUUID()],
    ['responseId', crypto.randomUUID()],
    ['recoveryToken', recoveryToken],
    ['sessionToken', recoveryToken],
  ])('rejects authenticated identity field %s from every authenticated body', (field, value) => {
    const authenticatedRequests = [
      [updateResponseRequestSchema, { response: validForm }],
      [currentResponseRequestSchema, {}],
      [statisticsRequestSchema, {}],
      [logoutSessionRequestSchema, {}],
      [rotateRecoveryRequestSchema, {}],
    ] as const;

    for (const [schema, body] of authenticatedRequests) {
      expect(() => schema.parse({ ...body, [field]: value })).toThrow();
    }
  });

  it('validates the public statistics request shape', () => {
    const request = {
      scholarshipTrack: 'nawa_director',
      rankingCountry: 'Białoruś',
      averageGrade: 90,
      maximumGrade: 100,
      polishSchoolLevel: 'secondary',
    };

    expect(publicStatisticsRequestSchema.parse(request)).toEqual(request);
    expect(
      publicStatisticsRequestSchema.safeParse({ ...request, scholarshipTrack: 'health_minister' }).success,
    ).toBe(false);
    expect(
      publicStatisticsRequestSchema.safeParse({ ...request, polishSchoolLevel: undefined }).success,
    ).toBe(false);
  });
});

describe('API response contracts', () => {
  it('accepts every valid final character for an unpadded 32-byte base64url token', () => {
    for (const finalCharacter of validFinalCharacters) {
      const token = `${'A'.repeat(42)}${finalCharacter}`;

      expect(canonicalOpaqueTokenSchema.safeParse(token).success).toBe(true);
      expect(() => assertCanonicalToken(token)).not.toThrow();
    }
  });

  it('rejects every invalid base64url final character in a 43-character token', () => {
    for (const finalCharacter of base64urlAlphabet) {
      if (validFinalCharacters.includes(finalCharacter)) continue;
      const token = `${'A'.repeat(42)}${finalCharacter}`;

      expect(canonicalOpaqueTokenSchema.safeParse(token).success).toBe(false);
      expect(() => assertCanonicalToken(token)).toThrow('Invalid credential format');
    }
  });

  it('accepts high-volume generated credentials through create and rotate response schemas', () => {
    for (let index = 0; index < 4096; index += 1) {
      const token = generateOpaqueToken();
      const credential = {
        recoveryToken: token,
        recoveryUrl: `https://app.example/#restore=${token}`,
      };

      expect(
        createResponseResultSchema.safeParse({
          created: true,
          ...credential,
          statistics: validStatistics,
        }).success,
      ).toBe(true);
      expect(rotateRecoveryResultSchema.safeParse(credential).success).toBe(true);
    }
  });

  it('validates every strict success payload', () => {
    expect(
      createResponseResultSchema.parse({ created: true, ...recoveryCredential, statistics: validStatistics }),
    ).toEqual({ created: true, ...recoveryCredential, statistics: validStatistics });
    expect(updateResponseResultSchema.parse({ updated: true, statistics: validStatistics })).toEqual({
      updated: true,
      statistics: validStatistics,
    });
    expect(currentResponseResultSchema.parse({ response: validForm })).toEqual({ response: validForm });
    expect(statisticsResultSchema.parse(validStatistics)).toEqual(validStatistics);
    expect(publicStatisticsResultSchema.parse(validStatistics)).toEqual(validStatistics);
    expect(restoreSessionResultSchema.parse({ response: validForm })).toEqual({ response: validForm });
    expect(rotateRecoveryResultSchema.parse(recoveryCredential)).toEqual(recoveryCredential);
    expect(logoutSessionResultSchema.parse({ loggedOut: true })).toEqual({ loggedOut: true });
  });

  it('accepts null for the country count suppressed below ten', () => {
    const suppressedStatistics = {
      ...validStatistics,
      sameCountryCount: null,
    };

    expect(statisticsResultSchema.parse(suppressedStatistics)).toEqual(suppressedStatistics);
  });

  it('rejects an exact country count below ten', () => {
    expect(
      statisticsResultSchema.safeParse({
        ...validStatistics,
        sameCountryCount: 9,
      }).success,
    ).toBe(false);
  });

  it('rejects statusCounts that do not sum to groupResponseCount', () => {
    expect(
      statisticsResultSchema.safeParse({
        ...validStatistics,
        statusCounts: { ...validStatusCounts, submitted: 99 },
      }).success,
    ).toBe(false);
  });

  it('rejects unknown fields from success and error payloads', () => {
    expect(
      currentResponseResultSchema.safeParse({ response: validForm, responseId: crypto.randomUUID() }).success,
    ).toBe(false);
    expect(
      apiErrorSchema.safeParse({
        error: { code: 'INVALID_REQUEST', message: 'Invalid request' },
        details: 'secret',
      }).success,
    ).toBe(false);
  });

  it('validates a stable API error payload', () => {
    const error = { error: { code: 'INVALID_REQUEST', message: 'Invalid request' } };

    expect(apiErrorSchema.parse(error)).toEqual(error);
  });
});
