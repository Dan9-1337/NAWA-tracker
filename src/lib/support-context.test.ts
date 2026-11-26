import { describe, expect, it } from 'vitest';
import { buildSupportMessage, buildSupportResponseId } from './support-context';

describe('support-context', () => {
  it('builds a short response id without exposing the raw user id', () => {
    expect(buildSupportResponseId('123456789')).toMatch(/^NW-[0-9A-F]{5}$/);
    expect(buildSupportResponseId(null)).toBe('NW-LOCAL');
  });

  it('includes screen, language, version and omits PII', () => {
    const message = buildSupportMessage({
      screen: 'Dashboard',
      locale: 'ru',
      rankingCountry: 'KZ',
      kind: 'help',
    });

    expect(message).toContain('Need help with NAWAmeter.');
    expect(message).toContain('Screen: Dashboard');
    expect(message).toContain('Country: KZ');
    expect(message).toContain('Language: RU');
    expect(message).toContain('Version:');
    expect(message).toContain('Response ID:');
    expect(message).not.toContain('email');
    expect(message).not.toContain('phone');
  });

  it('appends score breakdown for calculation errors', () => {
    const message = buildSupportMessage({
      screen: 'Dashboard',
      locale: 'en',
      kind: 'calculation_error',
      scoreBreakdown: { gradesScore: 81, polishSchoolBonus: 5, total: 86 },
      polishSchoolLevel: 'primary',
      formulaVersion: '2026.1',
    });

    expect(message).toContain('Possible calculation error');
    expect(message).toContain('gradesScore: 81');
    expect(message).toContain('polishSchoolBonus: 5');
    expect(message).toContain('formulaVersion: 2026.1');
  });
});
