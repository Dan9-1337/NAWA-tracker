import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseFormInput } from '../../shared/contracts';
import { I18nProvider } from '../i18n/context';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { pl } from '../i18n/pl';
import { botCountryLink, telegramShareLink } from '../lib/bot-links';
import { DRAFT_STORAGE_KEY_PREFIX } from '../lib/draft';
import { trackProductEvent } from '../lib/product-events';
import { getDevChromeState } from '../lib/telegram';
import { ProfileDashboard } from './ProfileDashboard';

vi.mock('../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

const botLinks = vi.hoisted(() => ({ openTelegramUrl: vi.fn() }));

vi.mock('../lib/bot-links', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/bot-links')>()),
  openTelegramUrl: botLinks.openTelegramUrl,
}));

const trackedEvents = vi.mocked(trackProductEvent);

function countTracked(name: string): number {
  return trackedEvents.mock.calls.filter(([event]) => event.name === name).length;
}

vi.mock('../lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/telegram')>();
  return {
    ...actual,
    // The dev bridge records the MainButton/SecondaryButton/BackButton state, so tests can press them.
    getTelegramWebApp: () => actual.createDevTelegramWebApp('user=%7B%22id%22%3A900000009%7D'),
  };
});

const scholarshipApi = vi.hoisted(() => ({
  getOrientationMark: vi.fn(),
  getScholarshipReport: vi.fn(),
  createScholarshipReport: vi.fn(),
  updateScholarshipReport: vi.fn(),
  deleteScholarshipReport: vi.fn(),
  getScholarshipReportSummary: vi.fn(),
}));

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  ...scholarshipApi,
}));

/** jsdom renders the full country list, so keep generous timeouts for slower CI machines. */
const UI_TIMEOUT = 15_000;
const TEST_TIMEOUT = 40_000;

const current: ResponseFormInput = {
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
  statusChangedAt: '2026-07-13',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');
  scholarshipApi.getOrientationMark.mockResolvedValue({ mark: null, n: 0 });
  scholarshipApi.getScholarshipReport.mockResolvedValue({ report: null });
});

function renderDashboard(
  onSubmit = vi.fn().mockResolvedValue(undefined),
  profile: ResponseFormInput = current,
) {
  render(
    <I18nProvider>
      <ProfileDashboard current={profile} statistics={{ status: 'loading' }} onSubmit={onSubmit} />
    </I18nProvider>,
  );
  return onSubmit;
}

async function editAverageTo(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
  const average = await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
  await user.clear(average);
  await user.type(average, value);
  await waitFor(() => expect(chrome().mainText).toBe(pl.form.submitUpdate), { timeout: UI_TIMEOUT });
}

const chrome = () => getDevChromeState();

async function pressMain() {
  await act(async () => {
    chrome().triggerMain();
  });
}

async function pressSecondary() {
  await act(async () => {
    chrome().triggerSecondary();
  });
}

async function pressBack() {
  await act(async () => {
    chrome().triggerBack();
  });
}

/** Opens the edit wizard on education, changes citizenship, and lands on grades with the changed draft. */
async function changeCitizenshipAndReachGrades(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.citizenship) }));
  await user.click(
    await screen.findByRole('button', { name: pl.labels.rankingCountry }, { timeout: UI_TIMEOUT }),
  );
  await user.click(await screen.findByRole('option', { name: 'Białoruś' }, { timeout: UI_TIMEOUT }));

  await pressMain();

  expect(await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
}

describe('ProfileDashboard edit wizard', () => {
  it(
    'asks for confirmation on the grades step before saving a cohort change',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard();
      await changeCitizenshipAndReachGrades(user);

      expect(chrome().mainText).toBe(pl.form.submitUpdate);

      await pressMain();

      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();
      expect(screen.getByText(pl.form.cohortChangeBody)).toBeInTheDocument();
      expect(chrome().mainText).toBe(pl.form.cohortChangeConfirm);
      expect(chrome().secondaryVisible).toBe(true);
      expect(chrome().secondaryText).toBe(pl.form.cohortChangeCancel);
      expect(onSubmit).not.toHaveBeenCalled();

      await pressMain();

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ rankingCountry: 'BY' });
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.getByText(new RegExp(pl.form.saved))).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'hides the warning on Cancel and checks the cohort change again on the next save press',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard();
      await changeCitizenshipAndReachGrades(user);
      await pressMain();
      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();

      await pressSecondary();

      expect(screen.queryByText(pl.form.cohortChangeTitle)).not.toBeInTheDocument();
      expect(chrome().secondaryVisible).toBe(false);
      expect(screen.getByLabelText(pl.labels.averageGrade)).toBeInTheDocument();

      await pressMain();

      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );

  it(
    'hides the warning on Telegram Back without leaving the grades step',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard();
      await changeCitizenshipAndReachGrades(user);
      await pressMain();
      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();

      await pressBack();

      expect(screen.queryByText(pl.form.cohortChangeTitle)).not.toBeInTheDocument();
      expect(screen.getByLabelText(pl.labels.averageGrade)).toBeInTheDocument();
      expect(chrome().mainText).toBe(pl.form.submitUpdate);

      await pressMain();

      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );

  it(
    'hides the warning after any edit and checks the cohort change again on the next save press',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard();
      await changeCitizenshipAndReachGrades(user);
      await pressMain();
      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();

      const average = screen.getByLabelText(pl.labels.averageGrade);
      await user.clear(average);
      await user.type(average, '4');

      expect(screen.queryByText(pl.form.cohortChangeTitle)).not.toBeInTheDocument();

      await pressMain();

      expect(screen.getByText(pl.form.cohortChangeTitle)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );

  it(
    'saves an edit with the intake year of the saved survey (ADR 0018)',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard(undefined, { ...current, intakeYear: 2027 });
      await editAverageTo(user, '4,8');

      await pressMain();

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ intakeYear: 2027, averageGrade: 4.8 });
    },
    TEST_TIMEOUT,
  );

  it(
    'records survey_updated on a successful edit and no wizard events',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard();
      await editAverageTo(user, '4,8');

      await pressMain();

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(countTracked('survey_updated')).toBe(1);
      expect(countTracked('wizard_started')).toBe(0);
      expect(countTracked('wizard_education_completed')).toBe(0);
      expect(countTracked('wizard_completed')).toBe(0);
    },
    TEST_TIMEOUT,
  );

  it(
    'records no survey_updated when the edit save fails',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard(vi.fn().mockRejectedValue(new Error('offline')));
      await editAverageTo(user, '4,8');

      await pressMain();

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });
      expect(countTracked('survey_updated')).toBe(0);
      expect(screen.getByLabelText(pl.labels.averageGrade)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'opens the chosen step from the dashboard and walks back to the dashboard',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard();

      await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
      expect(await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      await pressBack();
      expect(await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      await pressMain();
      expect(await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      await pressBack();
      expect(await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      await pressBack();
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );
});

describe('ProfileDashboard edit wizard records no new-survey wizard events (A4)', () => {
  it(
    'sends none of the three events for an above-maximum average, a low score and a failed save',
    async () => {
      const user = userEvent.setup();
      const onSubmit = renderDashboard(vi.fn().mockRejectedValue(new Error('offline')));

      await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
      const average = await screen.findByLabelText(pl.labels.averageGrade, {}, { timeout: UI_TIMEOUT });
      await user.clear(average);
      await user.type(average, '9');
      expect(await screen.findByText(pl.wizard.averageAboveMaximum, { selector: '[role="alert"]' })).toBeInTheDocument();

      await user.clear(average);
      await user.type(average, '1');
      await user.tab();
      expect(screen.getByText(/poniżej progu 60/)).toBeInTheDocument();

      await user.clear(average);
      await user.type(average, '4,8');
      await waitFor(() => expect(chrome().mainText).toBe(pl.form.submitUpdate), { timeout: UI_TIMEOUT });
      await pressMain();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1), { timeout: UI_TIMEOUT });

      expect(countTracked('wizard_average_above_maximum_shown')).toBe(0);
      expect(countTracked('wizard_low_score_warning_shown')).toBe(0);
      expect(countTracked('wizard_save_failed')).toBe(0);
    },
    TEST_TIMEOUT,
  );
});

describe('ProfileDashboard edit requests', () => {
  function dashboardWith(profile: ResponseFormInput, editRequestNonce: number, actionError?: string | null) {
    return (
      <I18nProvider>
        <ProfileDashboard
          current={profile}
          statistics={{ status: 'loading' }}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          editRequestNonce={editRequestNonce}
          actionError={actionError}
        />
      </I18nProvider>
    );
  }

  it(
    'opens the wizard once per request and keeps the dashboard when the survey object changes afterwards',
    async () => {
      const { rerender } = render(dashboardWith(current, 0));
      rerender(dashboardWith(current, 1));
      expect(await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      await pressBack();
      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      // A save hands the dashboard a new `current` object; that must not replay the old request.
      rerender(dashboardWith({ ...current }, 1));
      expect(screen.getByTestId('saved-score-value')).toBeInTheDocument();
      expect(screen.queryByLabelText(pl.labels.rankingCountry)).not.toBeInTheDocument();

      rerender(dashboardWith({ ...current }, 2));
      expect(await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'does not replay a request that was already made before the dashboard mounted',
    async () => {
      render(dashboardWith(current, 3));

      expect(await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByLabelText(pl.labels.rankingCountry)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'writes no wizard draft while the edit wizard is open',
    async () => {
      const user = userEvent.setup();
      renderDashboard();
      await editAverageTo(user, '4,8');

      const draftKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '');
      expect(draftKeys.filter((key) => key.startsWith(DRAFT_STORAGE_KEY_PREFIX))).toEqual([]);
    },
    TEST_TIMEOUT,
  );

  it(
    'brings the save error into view once when it appears in the edit wizard',
    async () => {
      const scrollIntoView = vi.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoView;
      try {
        const { rerender } = render(dashboardWith(current, 0));
        rerender(dashboardWith(current, 1));
        await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT });
        expect(scrollIntoView).not.toHaveBeenCalled();

        rerender(dashboardWith(current, 1, 'Limit reached'));
        const alert = await screen.findByRole('alert');
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(alert);

        rerender(dashboardWith(current, 1, 'Limit reached'));
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    },
    TEST_TIMEOUT,
  );
});

describe('Scholarship-holder card', () => {
  it(
    'places the invitation between the what-if block and the profile block for a 2026 Director survey',
    async () => {
      renderDashboard();

      const start = await screen.findByRole('button', { name: pl.scholarshipReport.start }, {
        timeout: UI_TIMEOUT,
      });
      const card = start.closest('section')!;
      expect(card).toHaveAccessibleName(pl.scholarshipReport.title);

      const whatIf = screen.getByTestId('what-if-block');
      const profile = screen.getByTestId('profile-block');
      expect(whatIf.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(card.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    },
    TEST_TIMEOUT,
  );

  it(
    'does not invite a survey of another intake year',
    async () => {
      renderDashboard(undefined, { ...current, intakeYear: 2025 });

      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });
      expect(screen.queryByRole('button', { name: pl.scholarshipReport.start })).not.toBeInTheDocument();
      expect(scholarshipApi.getScholarshipReport).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );

  it(
    'does not invite a survey scoring below 60',
    async () => {
      renderDashboard(undefined, { ...current, averageGrade: 3.2 });

      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });
      expect(screen.queryByRole('button', { name: pl.scholarshipReport.start })).not.toBeInTheDocument();
      expect(scholarshipApi.getScholarshipReport).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );
});

describe('Dashboard main button invites people from my country', () => {
  function dashboard(chromeSuspended: boolean) {
    return (
      <I18nProvider>
        <ProfileDashboard
          current={current}
          statistics={{ status: 'loading' }}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          chromeSuspended={chromeSuspended}
        />
      </I18nProvider>
    );
  }

  it(
    'shows the invite text on the main button of the dashboard (A1)',
    async () => {
      render(dashboard(false));
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });

      expect(chrome().mainVisible).toBe(true);
      expect(chrome().mainEnabled).toBe(true);
      expect(chrome().mainText).toBe(pl.settings.invite);
    },
    TEST_TIMEOUT,
  );

  it(
    'opens the same share sheet as the Settings row and records the event once per press (A2)',
    async () => {
      render(dashboard(false));
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });

      await pressMain();

      const expected = telegramShareLink(botCountryLink('UA'), pl.settings.inviteText('Ukraina'));
      expect(botLinks.openTelegramUrl).toHaveBeenCalledTimes(1);
      expect(botLinks.openTelegramUrl).toHaveBeenCalledWith(expected);
      expect(decodeURIComponent(expected)).toContain('startapp=c_UA');
      expect(countTracked('invite_main_button_opened')).toBe(1);
      expect(countTracked('invite_link_opened')).toBe(0);

      await pressMain();
      expect(botLinks.openTelegramUrl).toHaveBeenCalledTimes(2);
      expect(countTracked('invite_main_button_opened')).toBe(2);
    },
    TEST_TIMEOUT,
  );

  it(
    'hides the main button while Settings or another sheet suspends the chrome (A4)',
    async () => {
      const { rerender } = render(dashboard(false));
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });
      expect(chrome().mainVisible).toBe(true);

      rerender(dashboard(true));
      await waitFor(() => expect(chrome().mainVisible).toBe(false));

      rerender(dashboard(false));
      await waitFor(() => expect(chrome().mainText).toBe(pl.settings.invite));
      expect(chrome().mainVisible).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    'swaps the invite for the edit wizard action and back (A3)',
    async () => {
      const user = userEvent.setup();
      renderDashboard();
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });
      expect(chrome().mainText).toBe(pl.settings.invite);

      await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.citizenship) }));
      await screen.findByLabelText(pl.labels.rankingCountry, {}, { timeout: UI_TIMEOUT });
      await waitFor(() => expect(chrome().mainText).not.toBe(pl.settings.invite));

      await pressBack();
      await screen.findByTestId('saved-score-value', {}, { timeout: UI_TIMEOUT });
      await waitFor(() => expect(chrome().mainText).toBe(pl.settings.invite));
    },
    TEST_TIMEOUT,
  );
});
