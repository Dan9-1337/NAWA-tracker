import { describe, expect, it } from 'vitest';
import { messages } from './index';

describe('start.responseCount plurals', () => {
  it('uses the Russian one / few / many forms', () => {
    expect(messages.ru.start.responseCount(312, 2026)).toBe('312 ответов в наборе 2026');
    expect(messages.ru.start.responseCount(1, 2026)).toBe('1 ответ в наборе 2026');
    expect(messages.ru.start.responseCount(3, 2026)).toBe('3 ответа в наборе 2026');
    expect(messages.ru.start.responseCount(25, 2026)).toBe('25 ответов в наборе 2026');
  });

  it('uses the Ukrainian one / few / many forms', () => {
    expect(messages.uk.start.responseCount(1, 2026)).toBe('1 відповідь у наборі 2026');
    expect(messages.uk.start.responseCount(3, 2026)).toBe('3 відповіді у наборі 2026');
    expect(messages.uk.start.responseCount(25, 2026)).toBe('25 відповідей у наборі 2026');
  });

  it('uses the Belarusian one / few / many forms', () => {
    expect(messages.be.start.responseCount(1, 2026)).toBe('1 адказ у наборы 2026');
    expect(messages.be.start.responseCount(3, 2026)).toBe('3 адказы у наборы 2026');
    expect(messages.be.start.responseCount(25, 2026)).toBe('25 адказаў у наборы 2026');
  });

  it('uses the Polish one / few / many forms', () => {
    expect(messages.pl.start.responseCount(1, 2026)).toBe('1 odpowiedź w naborze 2026');
    expect(messages.pl.start.responseCount(3, 2026)).toBe('3 odpowiedzi w naborze 2026');
    expect(messages.pl.start.responseCount(25, 2026)).toBe('25 odpowiedzi w naborze 2026');
  });

  it('keeps English singular and plural apart', () => {
    expect(messages.en.start.responseCount(1, 2026)).toBe('1 response in the 2026 intake');
    expect(messages.en.start.responseCount(312, 2026)).toBe('312 responses in the 2026 intake');
  });
});
