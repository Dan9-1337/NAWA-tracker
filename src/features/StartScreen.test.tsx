import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/context';
import { pl } from '../i18n/pl';
import { getIntakeSummary } from '../lib/api-client';
import { trackProductEvent } from '../lib/product-events';
import { StartScreen } from './StartScreen';

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getIntakeSummary: vi.fn(),
}));

vi.mock('../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

const mockedGetIntakeSummary = vi.mocked(getIntakeSummary);
const mockedTrackProductEvent = vi.mocked(trackProductEvent);

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetIntakeSummary.mockReset();
    mockedGetIntakeSummary.mockResolvedValue({ intakeYear: 2026, responseCount: null });
  });

  it('records landing_viewed once per mount of the start screen', () => {
    const props = {
      disabled: false,
      showResumePrompt: false,
      startCtaRef: createRef<HTMLButtonElement>(),
      onStart: vi.fn(),
      onContinue: vi.fn(),
      onStartOver: vi.fn(),
    };
    const { rerender, unmount } = render(
      <I18nProvider>
        <StartScreen {...props} />
      </I18nProvider>,
    );

    expect(mockedTrackProductEvent).toHaveBeenCalledTimes(1);
    expect(mockedTrackProductEvent).toHaveBeenCalledWith({ name: 'landing_viewed' });

    rerender(
      <I18nProvider>
        <StartScreen {...props} disabled />
      </I18nProvider>,
    );
    rerender(
      <I18nProvider>
        <StartScreen {...props} />
      </I18nProvider>,
    );
    expect(mockedTrackProductEvent).toHaveBeenCalledTimes(1);

    unmount();
    render(
      <I18nProvider>
        <StartScreen {...props} />
      </I18nProvider>,
    );
    expect(mockedTrackProductEvent).toHaveBeenCalledTimes(2);
  });

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

  it('lets a visitor drag the sample ruler and see the position change', async () => {
    const user = userEvent.setup();
    setup();
    const score = screen.getByTestId('preview-score');
    const median = screen.getByTestId('preview-median');
    const before = score.textContent;

    screen.getByRole('slider').focus();
    await user.keyboard('{ArrowRight}');
    expect(Number(score.textContent?.replace(',', '.'))).toBeGreaterThan(Number(before?.replace(',', '.')));

    await user.keyboard('{PageDown}{PageDown}{PageDown}{PageDown}{PageDown}{PageDown}');
    expect(median).toHaveTextContent('Poniżej mediany');
    expect(screen.getByTestId('preview-percentile')).toHaveTextContent(pl.start.previewPercentileLabel);
  });

  it('shows the real response count outside the sample card, above the start button', async () => {
    mockedGetIntakeSummary.mockResolvedValue({ intakeYear: 2026, responseCount: 312 });
    setup();

    const line = await screen.findByTestId('intake-response-count');
    expect(line).toHaveTextContent(pl.start.responseCount(312, 2026));
    expect(line).toHaveTextContent('312 odpowiedzi w naborze 2026');

    const card = screen.getByTestId('preview-score').closest('section');
    const button = screen.getByRole('button', { name: pl.start.cta });
    expect(card).not.toBeNull();
    expect(card).not.toContainElement(line);
    expect(card!.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mockedGetIntakeSummary).toHaveBeenCalledTimes(1);
  });

  it('renders no count line when the intake is below the cohort floor', async () => {
    mockedGetIntakeSummary.mockResolvedValue({ intakeYear: 2026, responseCount: null });
    setup();

    await waitFor(() => expect(mockedGetIntakeSummary).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('intake-response-count')).not.toBeInTheDocument();
    expect(screen.queryByText(/w naborze/)).not.toBeInTheDocument();
  });

  it('renders no count line and keeps the start button usable while the request is pending', async () => {
    const user = userEvent.setup();
    mockedGetIntakeSummary.mockReturnValue(new Promise(() => {}));
    const { onStart } = setup();

    await waitFor(() => expect(mockedGetIntakeSummary).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('intake-response-count')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: pl.start.cta });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('renders no count line and no error when the request fails', async () => {
    const user = userEvent.setup();
    mockedGetIntakeSummary.mockRejectedValue(new Error('offline'));
    const { onStart } = setup();

    await waitFor(() => expect(mockedGetIntakeSummary).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('intake-response-count')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: pl.start.cta });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('no longer prints the hard-coded "48 responses this week" figure', async () => {
    mockedGetIntakeSummary.mockResolvedValue({ intakeYear: 2026, responseCount: 312 });
    setup();

    await screen.findByTestId('intake-response-count');
    expect(screen.queryByText(/48/)).not.toBeInTheDocument();
    expect(screen.queryByText(/w tym tygodniu/)).not.toBeInTheDocument();
  });

  it('has no language switcher: the language is chosen only in Settings', () => {
    setup();

    expect(screen.queryByRole('group', { name: pl.language.label })).not.toBeInTheDocument();
    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    for (const code of ['POL', 'ENG', 'RUS', 'UKR', 'BEL']) {
      expect(labels).not.toContain(code);
    }
    expect(screen.getByRole('button', { name: pl.start.cta })).toBeInTheDocument();
  });
});
