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
  scholarshipTrack: 'nawa_mnisw',
  studyRoute: 'direct_studies',
  studyType: 'first_cycle',
  country: 'Polska',
  gradeScale: 5,
  gradeValue: 4,
  university: 'Uniwersytet Warszawski',
  studyField: 'Informatyka',
  choicePriority: 'first_choice',
  applicationStatus: 'submitted',
} as const;

const validStatistics = {
  detailsAvailable: true,
  group: 'track-route-type-university-field',
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameUniversityCount: 12,
  sameUniversityAndFieldCount: 10,
  groupResponseCount: 10,
  medianGradePercentage: 82.5,
  lowerGradePercentage: 40,
  waitingForDecisionCount: 4,
  positiveDecisionCount: 5,
  negativeDecisionCount: 1,
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
    expect(restoreSessionResultSchema.parse({ response: validForm })).toEqual({ response: validForm });
    expect(rotateRecoveryResultSchema.parse(recoveryCredential)).toEqual(recoveryCredential);
    expect(logoutSessionResultSchema.parse({ loggedOut: true })).toEqual({ loggedOut: true });
  });

  it('accepts null for university counts suppressed below ten', () => {
    const suppressedStatistics = {
      ...validStatistics,
      sameUniversityCount: null,
      sameUniversityAndFieldCount: null,
    };

    expect(statisticsResultSchema.parse(suppressedStatistics)).toEqual(suppressedStatistics);
  });

  it('rejects exact university counts below ten', () => {
    expect(
      statisticsResultSchema.safeParse({
        ...validStatistics,
        sameUniversityCount: 9,
      }).success,
    ).toBe(false);
    expect(
      statisticsResultSchema.safeParse({
        ...validStatistics,
        sameUniversityAndFieldCount: 9,
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
