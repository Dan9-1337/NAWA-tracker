import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseFormInput } from '../../shared/contracts';
import { I18nProvider } from '../i18n/context';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { pl } from '../i18n/pl';
import { trackProductEvent } from '../lib/product-events';
import { getDevChromeState } from '../lib/telegram';
import { ProfileDashboard } from './ProfileDashboard';

vi.mock('../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

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
});

function renderDashboard(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <I18nProvider>
      <ProfileDashboard current={current} statistics={{ status: 'loading' }} onSubmit={onSubmit} />
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
