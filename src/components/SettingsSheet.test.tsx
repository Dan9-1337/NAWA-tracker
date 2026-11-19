import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/context';
import { pl } from '../i18n/pl';
import { SettingsSheet } from './SettingsSheet';

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
        <SettingsSheet
          open
          onClose={vi.fn()}
          onEditProfile={vi.fn()}
          current={{
            intakeYear: 2026,
            hasPolishCitizenship: false,
            rankingCountry: 'UA',
            schoolCountry: 'UA',
            scholarshipTrack: 'nawa_director',
            studyRoute: 'direct_studies',
            targetUniversity: 'science-096',
            studyField: '0613',
            gradeBasis: 'final_certificate',
            applicantKind: 'school_leaver',
            averageGrade: 4.5,
            maximumGrade: 5,
            polishSchoolLevel: 'none',
            currentStatus: 'submitted',
            statusChangedAt: '2026-07-01',
          }}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: new RegExp(pl.settings.viewData) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(pl.settings.editProfile) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(pl.settings.invite) })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
