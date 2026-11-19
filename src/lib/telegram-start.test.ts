import { afterEach, describe, expect, it } from 'vitest';
import { getTelegramStartCountry } from './telegram';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('getTelegramStartCountry', () => {
  it('reads the country the bot put in the URL', () => {
    window.history.replaceState(null, '', '/?c=ua');
    expect(getTelegramStartCountry()).toBe('UA');
  });

  it('ignores unknown or missing values', () => {
    window.history.replaceState(null, '', '/?c=ZZZ');
    expect(getTelegramStartCountry()).toBeNull();
    window.history.replaceState(null, '', '/');
    expect(getTelegramStartCountry()).toBeNull();
  });
});
