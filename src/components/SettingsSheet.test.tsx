import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/context';
import { pl } from '../i18n/pl';
import { botSubscribeLink } from '../lib/bot-links';
import { trackProductEvent } from '../lib/product-events';
import { SettingsSheet } from './SettingsSheet';

const botLinks = vi.hoisted(() => ({ openTelegramUrl: vi.fn() }));

vi.mock('../lib/bot-links', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/bot-links')>()),
  openTelegramUrl: botLinks.openTelegramUrl,
}));

vi.mock('../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

const trackedEvents = vi.mocked(trackProductEvent);
const currentProfile = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director' as const,
  studyRoute: 'direct_studies' as const,
  targetUniversity: 'science-096',
  studyField: '0613',
  gradeBasis: 'final_certificate' as const,
  applicantKind: 'school_leaver' as const,
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'none' as const,
  currentStatus: 'submitted' as const,
  statusChangedAt: '2026-07-01',
};

function countTracked(name: string): number {
  return trackedEvents.mock.calls.filter(([event]) => event.name === name).length;
}

beforeEach(() => {
  vi.clearAllMocks();
});

function renderSheet(overrides: Partial<Parameters<typeof SettingsSheet>[0]> = {}) {
  return render(
    <I18nProvider>
      <SettingsSheet open onClose={vi.fn()} current={null} {...overrides} />
    </I18nProvider>,
  );
}

describe('SettingsSheet', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <I18nProvider>
        <SettingsSheet open={false} onClose={vi.fn()} current={null} />
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens on the menu and navigates to privacy and back', async () => {
    const user = userEvent.setup();
    renderSheet();

    expect(screen.getByRole('heading', { name: pl.settings.title })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: new RegExp(pl.settings.privacyPolicy) }));

    expect(screen.getByRole('heading', { name: pl.settings.privacyPolicy })).toBeInTheDocument();
    expect(screen.getByText(pl.privacyNotice.points[0]!)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.settings.back }));
    expect(screen.getByRole('heading', { name: pl.settings.title })).toBeInTheDocument();
  });

  it('shows every About section and the app version', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: new RegExp(`^${pl.about.title}`) }));

    for (const title of [pl.about.capabilitiesTitle, pl.about.dataTitle, pl.about.officialTitle, pl.about.privacyTitle, pl.about.metricsTitle, pl.about.authorTitle]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('offers editing and viewing data only when a profile exists', () => {
    const { rerender } = renderSheet();
    expect(screen.queryByRole('button', { name: new RegExp(pl.settings.viewData) })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(pl.settings.invite) })).not.toBeInTheDocument();

    rerender(
      <I18nProvider>
        <SettingsSheet open onClose={vi.fn()} onEditProfile={vi.fn()} current={currentProfile} />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: new RegExp(pl.settings.viewData) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(pl.settings.editProfile) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(pl.settings.invite) })).toBeInTheDocument();
  });

  it('records the settings link events and still opens the Telegram links', async () => {
    const user = userEvent.setup();
    renderSheet({ current: currentProfile });

    await user.click(screen.getByRole('button', { name: new RegExp(pl.settings.reminders) }));
    expect(botLinks.openTelegramUrl).toHaveBeenCalledTimes(1);
    expect(botLinks.openTelegramUrl).toHaveBeenCalledWith(botSubscribeLink());
    expect(countTracked('reminders_link_opened')).toBe(1);
    expect(countTracked('invite_link_opened')).toBe(0);

    await user.click(screen.getByRole('button', { name: new RegExp(pl.settings.invite) }));
    expect(botLinks.openTelegramUrl).toHaveBeenCalledTimes(2);
    expect(decodeURIComponent(String(botLinks.openTelegramUrl.mock.calls[1]?.[0]))).toContain('startapp=c_UA');
    expect(countTracked('reminders_link_opened')).toBe(1);
    expect(countTracked('invite_link_opened')).toBe(1);
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
