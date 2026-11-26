import { describe, expect, it } from 'vitest';
import { plural } from './plural';

const ru = { one: 'балл', few: 'балла', many: 'баллов', other: 'балла' };
const pl = { one: 'punkt', few: 'punkty', many: 'punktów', other: 'punktu' };
const en = { one: 'participant', other: 'participants' };

describe('plural', () => {
  it.each([
    [1, 'балл'],
    [2, 'балла'],
    [5, 'баллов'],
    [11, 'баллов'],
    [21, 'балл'],
    [22, 'балла'],
    [25, 'баллов'],
    ['82,4', 'балла'],
    ['6,0', 'балла'],
  ] as const)('picks the Russian form for %s', (count, form) => {
    expect(plural('ru', count, ru)).toBe(form);
  });

  it.each([
    [1, 'punkt'],
    [3, 'punkty'],
    [5, 'punktów'],
    [12, 'punktów'],
    [22, 'punkty'],
    ['82,4', 'punktu'],
  ] as const)('picks the Polish form for %s', (count, form) => {
    expect(plural('pl', count, pl)).toBe(form);
  });

  it('picks the English form', () => {
    expect(plural('en', 1, en)).toBe('participant');
    expect(plural('en', 0, en)).toBe('participants');
    expect(plural('en', '12', en)).toBe('participants');
  });

  it('falls back to other when a form is missing or the count is not a number', () => {
    expect(plural('ru', 5, { one: 'a', other: 'b' })).toBe('b');
    expect(plural('uk', 'n/a', { one: 'a', other: 'b' })).toBe('b');
  });

  it.each(['uk', 'be'] as const)('knows few and many in %s', (locale) => {
    const forms = { one: '1', few: '2', many: '5', other: 'x' };
    expect(plural(locale, 1, forms)).toBe('1');
    expect(plural(locale, 3, forms)).toBe('2');
    expect(plural(locale, 11, forms)).toBe('5');
  });
});
