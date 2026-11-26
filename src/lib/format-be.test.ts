import { describe, expect, it } from 'vitest';
import { formatBelarusianDate, formatScore } from './format';

describe('Belarusian formatting without browser locale data', () => {
  it('writes dates with Belarusian month names', () => {
    expect(formatBelarusianDate(new Date(2026, 10, 19))).toBe('19 лістапада 2026 г.');
    expect(formatBelarusianDate(new Date(2026, 4, 1))).toBe('1 мая 2026 г.');
  });

  it('keeps the decimal comma', () => {
    expect(formatScore(78.75, 'be')).toBe('78,8');
  });
});
