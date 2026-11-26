import { render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countries as packageFlagCodes } from 'react-circle-flags';
import { describe, expect, it } from 'vitest';
import { countryCodes } from '../../shared/countries';
import { CountryFlag } from './CountryFlag';

const root = join(__dirname, '..', '..');

function flagImages(container: HTMLElement) {
  return Array.from(container.querySelectorAll('img'));
}

describe('CountryFlag', () => {
  it.each(['UA', 'BY', 'KZ', 'RU'])('serves the %s flag from the app origin (A1)', (code) => {
    const { container } = render(<CountryFlag code={code} />);
    const [img] = flagImages(container);
    expect(img.getAttribute('src')).toBe(`/flags/${code.toLowerCase()}.svg`);
  });

  it('keeps size and aria-hidden on the flag wrapper', () => {
    const { container } = render(<CountryFlag code="UA" size={22} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.style.width).toBe('22px');
    expect(flagImages(container)[0].getAttribute('width')).toBe('22');
  });

  it('has a file in public/flags for every picker country and the package knows the code (A2)', () => {
    for (const code of countryCodes) {
      const lower = code.toLowerCase();
      expect(existsSync(join(root, 'public', 'flags', `${lower}.svg`)), `public/flags/${lower}.svg`).toBe(true);
      expect(packageFlagCodes[lower], `react-circle-flags knows ${lower}`).toBe(true);
    }
  });

  it('ships the circle-flags licence next to the files (A2)', () => {
    expect(readFileSync(join(root, 'public', 'flags', 'LICENSE.md'), 'utf8')).toContain('MIT License');
  });

  it.each(['ZZ', 'PL', ''])('renders the globe and requests nothing for %j (A3)', (code) => {
    const { container } = render(<CountryFlag code={code} />);
    expect(flagImages(container)).toHaveLength(0);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('never points an image at a remote host for any picker country (A4)', () => {
    for (const code of countryCodes) {
      const { container, unmount } = render(<CountryFlag code={code} />);
      for (const img of flagImages(container)) {
        expect(img.getAttribute('src')).toMatch(/^\/flags\/[a-z]{2}\.svg$/);
      }
      unmount();
    }
  });
});
