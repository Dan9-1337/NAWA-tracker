import { describe, expect, it } from 'vitest';
import {
  applyTelegramTheme,
  DARK_SEMANTIC,
  DARK_THEME,
  isDarkBackground,
  LIGHT_SEMANTIC,
  LIGHT_THEME,
  parseHexColor,
} from './theme';

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

describe('THEME_PALETTES', () => {
  it('keeps canonical light palette in sync with index.css FOUC defaults', () => {
    expect(LIGHT_THEME.bg_color).toBe('#eff1f5');
    expect(LIGHT_THEME.text_color).toBe('#4c4f69');
    expect(LIGHT_THEME.button_color).toBe('#04a5e5');
    expect(LIGHT_SEMANTIC.accent).toBe('#04a5e5');
    expect(LIGHT_SEMANTIC.median).toBe('#8839ef');
    expect(LIGHT_SEMANTIC.positive).toBe('#5a8f5c');
  });

  it('keeps canonical dark palette in sync with index.css FOUC defaults', () => {
    expect(DARK_THEME.bg_color).toBe('#1e1e2e');
    expect(DARK_THEME.text_color).toBe('#cdd6f4');
    expect(DARK_THEME.button_color).toBe('#89dceb');
    expect(DARK_SEMANTIC.accent).toBe('#89dceb');
    expect(DARK_SEMANTIC.median).toBe('#cba6f7');
    expect(DARK_SEMANTIC.positive).toBe('#94b894');
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

    expect(document.documentElement.style.getPropertyValue('--text-secondary').trim()).toBe('#bac2de');
    expect(document.documentElement.style.getPropertyValue('--tg-theme-subtitle-text-color').trim()).toBe('#bac2de');
    expect(document.documentElement.style.getPropertyValue('--color-accent').trim()).toBe('#89dceb');
    expect(document.documentElement.style.getPropertyValue('--color-median').trim()).toBe('#cba6f7');
  });

  it('uses light typography for Telegram light backgrounds', () => {
    applyTelegramTheme({
      bg_color: '#ffffff',
      text_color: '#000000',
      subtitle_text_color: '#999999',
      hint_color: '#999999',
    });

    expect(document.documentElement.style.getPropertyValue('--text-secondary').trim()).toBe('#5c5f77');
    expect(document.documentElement.style.getPropertyValue('--tg-theme-subtitle-text-color').trim()).toBe('#5c5f77');
    expect(document.documentElement.style.getPropertyValue('--color-accent').trim()).toBe('#04a5e5');
  });
});
