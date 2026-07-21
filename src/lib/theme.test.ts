import { describe, expect, it } from 'vitest';
import { applyTelegramTheme, isDarkBackground, parseHexColor } from './theme';

describe('parseHexColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseHexColor('#18222d')).toEqual({ r: 24, g: 34, b: 45 });
  });

  it('parses 3-digit hex', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('isDarkBackground', () => {
  it('detects Telegram dark backgrounds', () => {
    expect(isDarkBackground('#18222d')).toBe(true);
    expect(isDarkBackground('#17212b')).toBe(true);
    expect(isDarkBackground('#1c1c1d')).toBe(true);
  });

  it('detects light backgrounds', () => {
    expect(isDarkBackground('#ffffff')).toBe(false);
    expect(isDarkBackground('#f4f4f5')).toBe(false);
  });
});

describe('applyTelegramTheme', () => {
  it('uses dark typography for Telegram dark backgrounds', () => {
    applyTelegramTheme({
      bg_color: '#17212b',
      text_color: '#ffffff',
      subtitle_text_color: '#708499',
      hint_color: '#708499',
    });

    expect(document.documentElement.style.getPropertyValue('--text-secondary').trim()).toBe('#e8eef4');
    expect(document.documentElement.style.getPropertyValue('--tg-theme-subtitle-text-color').trim()).toBe('#e8eef4');
  });

  it('uses light typography for Telegram light backgrounds', () => {
    applyTelegramTheme({
      bg_color: '#ffffff',
      text_color: '#000000',
      subtitle_text_color: '#999999',
      hint_color: '#999999',
    });

    expect(document.documentElement.style.getPropertyValue('--text-secondary').trim()).toBe('#2d3236');
    expect(document.documentElement.style.getPropertyValue('--tg-theme-subtitle-text-color').trim()).toBe('#2d3236');
  });
});
