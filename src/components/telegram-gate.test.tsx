import { render, screen } from '@testing-library/react';
import { generate } from 'lean-qr';
import { toSvgPath } from 'lean-qr/extras/svg';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/context';
import { pl } from '../i18n/pl';
import { TelegramGate } from './TelegramGate';

function renderGate(botUsername: string) {
  return render(
    <I18nProvider>
      <TelegramGate botUsername={botUsername} />
    </I18nProvider>,
  );
}

function qrPath(container: HTMLElement) {
  return container.querySelector('svg path')?.getAttribute('d');
}

describe('TelegramGate QR code', () => {
  it('renders the QR as inline SVG without any external image', () => {
    const { container } = renderGate('nawa_tracker_bot');

    const qr = screen.getByRole('img');
    expect(qr.tagName.toLowerCase()).toBe('svg');
    expect(qr).toHaveAccessibleName(pl.telegram.qrAlt);
    expect(qr).toHaveAttribute('width', '180');
    expect(qr).toHaveAttribute('height', '180');
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.innerHTML).not.toContain('https://api.');
    expect(container.querySelectorAll('[src], image')).toHaveLength(0);
    expect(container.querySelector('svg rect')).toHaveAttribute('fill', '#ffffff');
    expect(container.querySelector('svg path')).toHaveAttribute('fill', '#000000');
  });

  it('encodes https://t.me/<bot username>', () => {
    const { container } = renderGate('nawa_tracker_bot');
    const expected = toSvgPath(generate('https://t.me/nawa_tracker_bot'));

    expect(expected.length).toBeGreaterThan(0);
    expect(qrPath(container)).toBe(expected);
    expect(qrPath(container)).not.toBe(toSvgPath(generate('https://t.me/other_bot')));
  });

  it('strips a leading @ from the bot username before encoding', () => {
    const { container } = renderGate('@nawa_tracker_bot');

    expect(qrPath(container)).toBe(toSvgPath(generate('https://t.me/nawa_tracker_bot')));
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://t.me/nawa_tracker_bot');
  });
});
