import { describe, expect, it, vi } from 'vitest';
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
    expect(LIGHT_THEME.bg_color).toBe('#f2f3f0');
    expect(LIGHT_THEME.text_color).toBe('#14161a');
    expect(LIGHT_THEME.button_color).toBe('#14161a');
    expect(LIGHT_THEME.button_text_color).toBe('#ffc72c');
    expect(LIGHT_SEMANTIC.accent).toBe('#ffc72c');
    expect(LIGHT_SEMANTIC.accentInk).toBe('#14161a');
    expect(LIGHT_SEMANTIC.median).toBe('#14161a');
    expect(LIGHT_SEMANTIC.positive).toBe('#1e7a3c');
    expect(LIGHT_SEMANTIC.warning).toBe('#8a5a00');
  });

  it('keeps canonical dark palette in sync with index.css FOUC defaults', () => {
    expect(DARK_THEME.bg_color).toBe('#121316');
    expect(DARK_THEME.text_color).toBe('#f2f3f0');
    expect(DARK_THEME.button_color).toBe('#ffc72c');
    expect(DARK_THEME.button_text_color).toBe('#14161a');
    expect(DARK_SEMANTIC.accent).toBe('#ffc72c');
    expect(DARK_SEMANTIC.accentInk).toBe('#ffc72c');
    expect(DARK_SEMANTIC.median).toBe('#f2f3f0');
    expect(DARK_SEMANTIC.positive).toBe('#7ed957');
    expect(DARK_SEMANTIC.warning).toBe('#ffc72c');
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

    expect(document.documentElement.style.getPropertyValue('--text-secondary').trim()).toBe('#b4b9c2');
    expect(document.documentElement.style.getPropertyValue('--tg-theme-subtitle-text-color').trim()).toBe('#b4b9c2');
    expect(document.documentElement.style.getPropertyValue('--color-accent').trim()).toBe('#ffc72c');
    expect(document.documentElement.style.getPropertyValue('--color-accent-ink').trim()).toBe('#ffc72c');
    expect(document.documentElement.style.getPropertyValue('--color-median').trim()).toBe('#f2f3f0');
    expect(document.documentElement.style.getPropertyValue('--color-warning').trim()).toBe('#ffc72c');
  });

  it('keeps brand button colours and only takes background and text from Telegram', () => {
    applyTelegramTheme({
      bg_color: '#17212b',
      text_color: '#f5f5f5',
      button_color: '#2ea6ff',
      link_color: '#6ab3f3',
    });

    const read = (name: string) => document.documentElement.style.getPropertyValue(name).trim();
    expect(read('--tg-theme-bg-color')).toBe('#17212b');
    expect(read('--tg-theme-text-color')).toBe('#f5f5f5');
    expect(read('--tg-theme-button-color')).toBe('#ffc72c');
    expect(read('--tg-theme-link-color')).toBe('#ffc72c');
  });

  it('uses light typography for Telegram light backgrounds', () => {
    applyTelegramTheme({
      bg_color: '#ffffff',
      text_color: '#000000',
      subtitle_text_color: '#999999',
      hint_color: '#999999',
    });

    expect(document.documentElement.style.getPropertyValue('--text-secondary').trim()).toBe('#555a64');
    expect(document.documentElement.style.getPropertyValue('--tg-theme-subtitle-text-color').trim()).toBe('#555a64');
    expect(document.documentElement.style.getPropertyValue('--color-accent').trim()).toBe('#ffc72c');
    expect(document.documentElement.style.getPropertyValue('--color-accent-ink').trim()).toBe('#14161a');
    expect(document.documentElement.style.getPropertyValue('--color-warning').trim()).toBe('#8a5a00');
  });
});

describe('native Telegram chrome', () => {
  it('paints the main button yellow with ink text and matches the bar to the page', async () => {
    const telegram = await import('./telegram');
    const applyChromeColors = vi.fn();
    vi.spyOn(telegram, 'getTelegramWebApp').mockReturnValue({ applyChromeColors } as never);

    applyTelegramTheme({ bg_color: '#ffffff', text_color: '#000000' });

    expect(applyChromeColors).toHaveBeenCalledWith({
      background: '#ffffff',
      header: LIGHT_THEME.header_bg_color ?? '#ffffff',
      bottomBar: '#ffffff',
      mainButton: '#ffc72c',
      mainButtonText: '#14161a',
    });
    vi.restoreAllMocks();
  });
});
