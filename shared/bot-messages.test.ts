import { describe, expect, it } from 'vitest';
import { botLocales, botMessages, resolveBotLocale } from './bot-messages';

describe('bot messages', () => {
  it.each(botLocales)('%s has every message, with the commands intact', (locale) => {
    const messages = botMessages[locale];
    expect(messages.welcome).toContain('/subscribe');
    expect(messages.welcome).toContain('/stop');
    expect(messages.help).toContain('/start');
    expect(messages.help).toContain('/subscribe');
    expect(messages.help).toContain('/stop');
    expect(messages.welcomeCountry('UA')).toContain('UA');
    expect(messages.reminders.results_out('2026')).toContain('2026');
    expect(messages.reminders.results_soon('2026')).toContain('2026');
    expect(messages.reminders.intake_open('2027')).toContain('2027');
    expect(messages.subscribed).toContain('/stop');
  });

  it('is honest about storing the Telegram ID', () => {
    for (const locale of botLocales) {
      expect(botMessages[locale].subscribed).toMatch(/Telegram ID/);
    }
  });

  it('resolves Telegram language codes and falls back to Polish', () => {
    expect(resolveBotLocale('uk')).toBe('uk');
    expect(resolveBotLocale('be-BY')).toBe('be');
    expect(resolveBotLocale('ru')).toBe('ru');
    expect(resolveBotLocale('en-US')).toBe('en');
    expect(resolveBotLocale('de')).toBe('pl');
    expect(resolveBotLocale(undefined)).toBe('pl');
  });
});
