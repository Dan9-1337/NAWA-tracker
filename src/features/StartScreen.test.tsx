import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/context';
import { pl } from '../i18n/pl';
import { StartScreen } from './StartScreen';

function setup(overrides: Partial<Parameters<typeof StartScreen>[0]> = {}) {
  const handlers = { onStart: vi.fn(), onContinue: vi.fn(), onStartOver: vi.fn() };
  render(
    <I18nProvider>
      <StartScreen disabled={false} showResumePrompt={false} startCtaRef={createRef()} {...handlers} {...overrides} />
    </I18nProvider>,
  );
  return handlers;
}

describe('StartScreen', () => {
  it('starts the wizard from the main button, which is disabled while saving', async () => {
    const user = userEvent.setup();
    const { onStart } = setup();

    await user.click(screen.getByRole('button', { name: pl.start.cta }));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it('disables the start button when told to', () => {
    setup({ disabled: true });
    expect(screen.getByRole('button', { name: pl.start.cta })).toBeDisabled();
  });

  it('offers to resume or discard a saved draft only when one exists', async () => {
    const user = userEvent.setup();
    expect(screen.queryByText(pl.start.resumeTitle)).not.toBeInTheDocument();

    const { onContinue, onStartOver } = setup({ showResumePrompt: true });
    await user.click(screen.getByRole('button', { name: pl.start.resumeContinue }));
    await user.click(screen.getByRole('button', { name: pl.start.resumeStartOver }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onStartOver).toHaveBeenCalledOnce();
  });

  it('opens one FAQ answer at a time', async () => {
    const user = userEvent.setup();
    setup();
    const what = screen.getByRole('button', { name: pl.start.whatYouSee });
    const how = screen.getByRole('button', { name: pl.start.howItWorks });
    expect(what).toHaveAttribute('aria-expanded', 'false');

    await user.click(what);
    expect(what).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(pl.start.whatYouSeeBody)).toBeInTheDocument();

    await user.click(how);
    expect(how).toHaveAttribute('aria-expanded', 'true');
    expect(what).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(pl.start.whatYouSeeBody)).not.toBeInTheDocument();

    await user.click(how);
    expect(how).toHaveAttribute('aria-expanded', 'false');
  });
});
