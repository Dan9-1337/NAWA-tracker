import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ResponseFormInput,
  ScholarshipReport,
  ScholarshipReportSummary,
} from '../../../shared/contracts';
import { I18nProvider } from '../../i18n/context';
import { LOCALE_STORAGE_KEY, messages, setActiveLocale, localeOrder } from '../../i18n';
import { pl } from '../../i18n/pl';
import { broadGroups } from '../../../shared/study-fields';
import { getDevChromeState } from '../../lib/telegram';
import { ProfileDashboard } from '../ProfileDashboard';

vi.mock('../../lib/product-events', () => ({ trackProductEvent: vi.fn() }));

const api = vi.hoisted(() => ({
  getOrientationMark: vi.fn(),
  getScholarshipReport: vi.fn(),
  createScholarshipReport: vi.fn(),
  updateScholarshipReport: vi.fn(),
  deleteScholarshipReport: vi.fn(),
  getScholarshipReportSummary: vi.fn(),
}));

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  ...api,
}));

vi.mock('../../lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/telegram')>();
  return {
    ...actual,
    getTelegramWebApp: () => actual.createDevTelegramWebApp('user=%7B%22id%22%3A900000010%7D'),
  };
});

const UI_TIMEOUT = 20_000;
const TEST_TIMEOUT = 60_000;

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

const savedReport: ScholarshipReport = {
  studyRoute: 'direct_studies',
  programmeId: 'informatyka',
  programmeName: 'Informatyka',
  universityId: 'science-096',
  scoreSnapshot: 81,
};

const allCountriesSummary: ScholarshipReportSummary = {
  total: 4,
  countries: [
    { country: 'BY', count: 1 },
    { country: 'UA', count: 3 },
  ],
  paths: [
    { route: 'preparatory_course', count: 1 },
    { route: 'direct_studies', count: 3 },
  ],
  centres: [{ centreId: 'umcs-lublin', count: 1 }],
  fields: [
    {
      group: '06',
      count: 2,
      programmes: [{ programmeId: 'informatyka', programmeName: 'Informatyka', count: 2 }],
    },
    {
      group: '04',
      count: 1,
      programmes: [{ programmeId: 'prawo', programmeName: 'Prawo', count: 1 }],
    },
  ],
  typedProgrammeCount: 1,
  universities: [
    { universityId: 'science-096', count: 2 },
    { universityId: 'science-078', count: 1 },
    { universityId: 'science-071', count: 1 },
  ],
};

const bySummary: ScholarshipReportSummary = {
  total: 1,
  countries: [
    { country: 'BY', count: 1 },
    { country: 'UA', count: 3 },
  ],
  paths: [
    { route: 'preparatory_course', count: 1 },
    { route: 'direct_studies', count: 0 },
  ],
  centres: [{ centreId: 'umcs-lublin', count: 1 }],
  fields: [
    {
      group: '04',
      count: 1,
      programmes: [{ programmeId: 'prawo', programmeName: 'Prawo', count: 1 }],
    },
  ],
  typedProgrammeCount: 0,
  universities: [{ universityId: 'science-078', count: 1 }],
};

const chrome = () => getDevChromeState();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');
  api.getOrientationMark.mockResolvedValue({ mark: null, n: 0 });
  api.getScholarshipReport.mockResolvedValue({ report: null });
});

function renderDashboard(profile: ResponseFormInput = current) {
  render(
    <I18nProvider>
      <ProfileDashboard current={profile} statistics={{ status: 'loading' }} onSubmit={vi.fn()} />
    </I18nProvider>,
  );
}

async function pressMain() {
  await act(async () => {
    chrome().triggerMain();
  });
}

async function pressBack() {
  await act(async () => {
    chrome().triggerBack();
  });
}

async function startFlow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: pl.scholarshipReport.start }, { timeout: UI_TIMEOUT }),
  );
}

async function choosePreparatoryPath(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('radio', { name: pl.scholarshipReport.routes.preparatory_course }),
  );
  await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
}

async function chooseDirectPath(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('radio', { name: pl.scholarshipReport.routes.direct_studies }),
  );
  await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
}

async function pickCentre(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: pl.scholarshipReport.centreLabel }, { timeout: UI_TIMEOUT }),
  );
  await user.click(await screen.findByRole('option', { name: /UMCS/ }, { timeout: UI_TIMEOUT }));
  await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
}

async function pickCatalogueProgramme(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(
    await screen.findByRole('button', { name: pl.scholarshipReport.programmeLabel }, { timeout: UI_TIMEOUT }),
  );
  const search = await screen.findByRole('searchbox', {
    name: pl.scholarshipReport.flow.programmeSearchPlaceholder,
  }, { timeout: UI_TIMEOUT });
  await user.type(search, name);
  await user.click(await screen.findByRole('option', { name }, { timeout: UI_TIMEOUT }));
  await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
}

async function pickUniversity(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: pl.scholarshipReport.universityLabel }, { timeout: UI_TIMEOUT }),
  );
  const search = await screen.findByRole('searchbox', {
    name: pl.scholarshipReport.flow.universitySearchPlaceholder,
  }, { timeout: UI_TIMEOUT });
  await user.type(search, 'Uniwersytet Warszawski');
  await user.click(
    await screen.findByRole('option', { name: /Uniwersytet Warszawski/ }, { timeout: UI_TIMEOUT }),
  );
  await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
}

async function openResults(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: pl.scholarshipReport.openResults }, { timeout: UI_TIMEOUT }),
  );
  await screen.findByRole('heading', { name: pl.scholarshipReport.results.title }, { timeout: UI_TIMEOUT });
}

describe('scholarship-holder flow', () => {
  it(
    'saves the preparatory path with a catalogue kierunek and shows the answers and the results',
    async () => {
      const user = userEvent.setup();
      api.createScholarshipReport.mockResolvedValue({
        report: {
          studyRoute: 'preparatory_course',
          prepCentreId: 'umcs-lublin',
          programmeId: 'informatyka',
          programmeName: 'Informatyka',
          universityId: 'science-096',
          scoreSnapshot: 81,
        },
      });
      renderDashboard();
      await startFlow(user);

      await choosePreparatoryPath(user);
      await pressMain();

      await pickCentre(user);
      await pressMain();

      await pickCatalogueProgramme(user, 'Informatyka');
      await pressMain();

      await pickUniversity(user);
      await pressMain();

      await waitFor(() => expect(api.createScholarshipReport).toHaveBeenCalledTimes(1), {
        timeout: UI_TIMEOUT,
      });
      expect(api.createScholarshipReport).toHaveBeenCalledWith({
        report: {
          studyRoute: 'preparatory_course',
          prepCentreId: 'umcs-lublin',
          programmeId: 'informatyka',
          universityId: 'science-096',
        },
      });

      expect(await screen.findByText('Informatyka', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.getByText(pl.scholarshipReport.routes.preparatory_course)).toBeInTheDocument();
      expect(screen.getByText(/UMCS/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: pl.scholarshipReport.openResults })).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'skips the centre step on the direct path and saves a typed kierunek',
    async () => {
      const user = userEvent.setup();
      api.createScholarshipReport.mockResolvedValue({
        report: {
          studyRoute: 'direct_studies',
          customProgramme: 'Moje studia',
          universityId: 'science-096',
          scoreSnapshot: 81,
        },
      });
      renderDashboard();
      await startFlow(user);

      await chooseDirectPath(user);
      await pressMain();

      expect(screen.queryByRole('button', { name: pl.scholarshipReport.centreLabel })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: pl.scholarshipReport.flow.manualToggle }));
      await user.type(screen.getByLabelText(pl.scholarshipReport.flow.manualLabel), 'Moje studia');
      await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
      await pressMain();

      await pickUniversity(user);
      await pressMain();

      await waitFor(() => expect(api.createScholarshipReport).toHaveBeenCalledTimes(1), {
        timeout: UI_TIMEOUT,
      });
      expect(api.createScholarshipReport).toHaveBeenCalledWith({
        report: {
          studyRoute: 'direct_studies',
          customProgramme: 'Moje studia',
          universityId: 'science-096',
        },
      });
      expect(await screen.findByText('Moje studia', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.getByText(pl.scholarshipReport.typedByHand)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'rejects 81-character and empty typed text on the client and accepts 1 to 80',
    async () => {
      const user = userEvent.setup();
      renderDashboard();
      await startFlow(user);
      await chooseDirectPath(user);
      await pressMain();

      await user.click(screen.getByRole('button', { name: pl.scholarshipReport.flow.manualToggle }));
      const input = screen.getByLabelText(pl.scholarshipReport.flow.manualLabel);

      fireEvent.change(input, { target: { value: 'a'.repeat(81) } });
      expect(
        await screen.findByText(pl.scholarshipReport.flow.customTooLong(80), {}, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      expect(chrome().mainEnabled).toBe(false);

      fireEvent.change(input, { target: { value: 'a'.repeat(80) } });
      await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });

      fireEvent.change(input, { target: { value: '' } });
      expect(
        await screen.findByText(pl.scholarshipReport.flow.customRequired, {}, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      expect(chrome().mainEnabled).toBe(false);

      fireEvent.change(input, { target: { value: 'P' } });
      await waitFor(() => expect(chrome().mainEnabled).toBe(true), { timeout: UI_TIMEOUT });
      await pressMain();
      expect(
        await screen.findByRole('button', { name: pl.scholarshipReport.universityLabel }, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      expect(api.createScholarshipReport).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT,
  );

  it(
    'prefills an existing report and replaces its answers with PUT',
    async () => {
      const user = userEvent.setup();
      api.getScholarshipReport.mockResolvedValue({ report: savedReport });
      api.updateScholarshipReport.mockResolvedValue({
        report: {
          studyRoute: 'direct_studies',
          programmeId: 'prawo',
          programmeName: 'Prawo',
          universityId: 'science-096',
          scoreSnapshot: 81,
        },
      });
      renderDashboard();

      await user.click(
        await screen.findByRole('button', { name: pl.scholarshipReport.edit }, { timeout: UI_TIMEOUT }),
      );
      expect(
        screen.getByRole('radio', { name: pl.scholarshipReport.routes.direct_studies }),
      ).toBeChecked();

      await pressMain();
      await pickCatalogueProgramme(user, 'Prawo');
      await pressMain();
      expect(
        await screen.findByRole('button', { name: pl.scholarshipReport.universityLabel }, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      await pressMain();

      await waitFor(() => expect(api.updateScholarshipReport).toHaveBeenCalledTimes(1), {
        timeout: UI_TIMEOUT,
      });
      expect(api.updateScholarshipReport).toHaveBeenCalledWith({
        report: {
          studyRoute: 'direct_studies',
          programmeId: 'prawo',
          universityId: 'science-096',
        },
      });
      expect(await screen.findByText('Prawo', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'deletes the report after a confirmation and returns to the invitation',
    async () => {
      const user = userEvent.setup();
      api.getScholarshipReport.mockResolvedValue({ report: savedReport });
      api.deleteScholarshipReport.mockResolvedValue({ deleted: true });
      renderDashboard();

      await user.click(
        await screen.findByRole('button', { name: pl.scholarshipReport.delete }, { timeout: UI_TIMEOUT }),
      );
      expect(screen.getByText(pl.scholarshipReport.deleteConfirmTitle)).toBeInTheDocument();
      expect(screen.getByText(pl.scholarshipReport.deleteConfirmBody)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: pl.scholarshipReport.deleteConfirm }));

      expect(
        await screen.findByRole('button', { name: pl.scholarshipReport.start }, { timeout: UI_TIMEOUT }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: pl.scholarshipReport.openResults })).not.toBeInTheDocument();
      expect(screen.getByTestId('profile-block')).toBeInTheDocument();
      expect(api.deleteScholarshipReport).toHaveBeenCalledTimes(1);
    },
    TEST_TIMEOUT,
  );
});

describe('scholarship-holder results', () => {
  it(
    'opens the results on all countries and returns to the dashboard with Telegram back',
    async () => {
      const user = userEvent.setup();
      api.getScholarshipReport.mockResolvedValue({ report: savedReport });
      api.getScholarshipReportSummary.mockResolvedValue(allCountriesSummary);
      renderDashboard();

      await openResults(user);
      expect(api.getScholarshipReportSummary).toHaveBeenCalledWith(undefined);

      await pressBack();
      expect(await screen.findByTestId('profile-block', {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();

      await openResults(user);
      expect(api.getScholarshipReportSummary).toHaveBeenLastCalledWith(undefined);
      expect(await screen.findByTestId('scholarship-results-total')).toHaveTextContent('4');
    },
    TEST_TIMEOUT,
  );

  it(
    'sorts the country filter, shows counts from one, filters to BY and resets on reopening',
    async () => {
      const user = userEvent.setup();
      api.getScholarshipReport.mockResolvedValue({ report: savedReport });
      api.getScholarshipReportSummary.mockResolvedValueOnce(allCountriesSummary);
      api.getScholarshipReportSummary.mockResolvedValueOnce(bySummary);
      renderDashboard();

      await openResults(user);
      expect(await screen.findByTestId('scholarship-results-total')).toHaveTextContent('4');

      await user.click(screen.getByRole('button', { name: pl.scholarshipReport.results.filterLabel }));
      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent?.replace('✓', ''))).toEqual([
        pl.scholarshipReport.results.allCountries,
        'Ukraina · 3',
        'Białoruś · 1',
      ]);
      expect(screen.getByText(/UMCS/)).toBeInTheDocument();
      expect(screen.getByText('Informatyka')).toBeInTheDocument();
      expect(screen.getByText(pl.scholarshipReport.results.manualRow)).toBeInTheDocument();
      expect(screen.queryByText(pl.scholarshipReport.results.otherFieldGroup)).not.toBeInTheDocument();

      await user.click(screen.getByRole('option', { name: 'Białoruś · 1' }));

      await waitFor(
        () => expect(screen.getByTestId('scholarship-results-total')).toHaveTextContent('1'),
        { timeout: UI_TIMEOUT },
      );
      expect(api.getScholarshipReportSummary).toHaveBeenLastCalledWith('BY');
      expect(screen.getByText('Prawo')).toBeInTheDocument();
      expect(screen.getByText(/UMCS/)).toBeInTheDocument();
      expect(screen.queryByText('Informatyka')).not.toBeInTheDocument();

      await pressBack();
      await openResults(user);
      expect(api.getScholarshipReportSummary).toHaveBeenLastCalledWith(undefined);
      await waitFor(
        () => expect(screen.getByTestId('scholarship-results-total')).toHaveTextContent('4'),
        { timeout: UI_TIMEOUT },
      );
    },
    TEST_TIMEOUT,
  );

  it(
    'shows catalogue kierunki under their field group and typed kierunki as one row without text',
    async () => {
      const user = userEvent.setup();
      api.getScholarshipReport.mockResolvedValue({ report: savedReport });
      api.getScholarshipReportSummary.mockResolvedValue({
        ...allCountriesSummary,
        fields: [
          {
            group: '06',
            count: 1,
            programmes: [{ programmeId: 'informatyka', programmeName: 'Informatyka', count: 1 }],
          },
        ],
        typedProgrammeCount: 11,
        centres: [],
        countries: [
          { country: 'UA', count: 10 },
          { country: 'BY', count: 2 },
        ],
        paths: [
          { route: 'preparatory_course', count: 0 },
          { route: 'direct_studies', count: 12 },
        ],
        universities: [{ universityId: 'science-096', count: 12 }],
        total: 12,
      });
      renderDashboard();

      await openResults(user);

      expect(await screen.findByText(broadGroups['06']!.pl, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.getByText('Informatyka')).toBeInTheDocument();
      expect(screen.getByTestId('scholarship-typed-count')).toHaveTextContent('11');
      expect(screen.queryByText('Tajne studia')).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'shows only the empty state when the selection has no counted reports',
    async () => {
      const user = userEvent.setup();
      api.getScholarshipReport.mockResolvedValue({ report: savedReport });
      api.getScholarshipReportSummary.mockResolvedValue({
        total: 0,
        countries: [],
        paths: [
          { route: 'preparatory_course', count: 0 },
          { route: 'direct_studies', count: 0 },
        ],
        centres: [],
        fields: [],
        typedProgrammeCount: 0,
        universities: [],
      });
      renderDashboard();

      await openResults(user);

      expect(await screen.findByText(pl.scholarshipReport.results.empty, {}, { timeout: UI_TIMEOUT })).toBeInTheDocument();
      expect(screen.queryByTestId('scholarship-results-total')).not.toBeInTheDocument();
      expect(screen.queryByText(pl.scholarshipReport.results.caption)).not.toBeInTheDocument();
      expect(screen.queryByText(pl.scholarshipReport.results.fieldsTitle)).not.toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});

describe('scholarship-holder privacy copy', () => {
  const holdersOnly: Record<string, RegExp> = {
    pl: /Wyniki ankiety dla stypendystów/,
    en: /scholarship-holder results/,
    ru: /Результаты анкеты для стипендиатов/,
    uk: /Результати анкети для стипендіатів/,
    be: /Вынікі анкеты для стыпендыятаў/,
  };
  const typedByHand: Record<string, RegExp> = {
    pl: /ręcznie/,
    en: /typed by hand/,
    ru: /вписанное вручную/,
    uk: /вписаний вручну/,
    be: /упісаны ўручную/,
  };

  it.each(localeOrder)('%s says only contributors see the results and a typed kierunek is private', (locale) => {
    const points = messages[locale].privacyNotice.points.join('\n');

    expect(points).toMatch(holdersOnly[locale]!);
    expect(points).toMatch(typedByHand[locale]!);
  });
});
