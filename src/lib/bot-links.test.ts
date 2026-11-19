import { describe, expect, it } from 'vitest';
import { botCountryLink, botSubscribeLink, telegramShareLink } from './bot-links';

describe('bot links', () => {
  it('builds the subscribe and country deep links', () => {
    expect(botSubscribeLink()).toBe('https://t.me/nawa_tracker_bot?start=subscribe');
    expect(botCountryLink('ua')).toBe('https://t.me/nawa_tracker_bot?startapp=c_UA');
  });

  it('encodes the share link and text', () => {
    expect(telegramShareLink('https://t.me/b?startapp=c_UA', 'Hi & bye')).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Ft.me%2Fb%3Fstartapp%3Dc_UA&text=Hi%20%26%20bye',
    );
  });
});
