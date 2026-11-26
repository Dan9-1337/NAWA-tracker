import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n/context';
import { LOCALE_STORAGE_KEY, messages, setActiveLocale } from '../../i18n';
import type { Locale } from '../../i18n/types';
import type { WizardDraft } from '../../lib/draft';
import { GradesStep } from './GradesStep';

const bonus = vi.hoisted(() => ({ none: 0, primary: 5, secondary: 10 }));

vi.mock('../../../shared/nawa-score', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/nawa-score')>()),
  polishSchoolBonus: bonus,
}));

const baseDraft: WizardDraft = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: '',
  studyField: '',
  prepCourseCity: '',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: null,
  maximumGrade: 12,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '',
};

function Harness({ initial }: { initial: WizardDraft }) {
  const [draft, setDraft] = useState(initial);
  return <GradesStep draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />;
}

function renderStep(locale: Locale, overrides: Partial<WizardDraft> = {}) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  setActiveLocale(locale);
  return render(
    <I18nProvider>
      <Harness initial={{ ...baseDraft, ...overrides }} />
    </I18nProvider>,
  );
}

const stickerText: Record<Locale, [string, string]> = {
  ru: ['+5 баллов', '+10 баллов'],
  pl: ['+5 pkt', '+10 pkt'],
  en: ['+5 pts', '+10 pts'],
  uk: ['+5 балів', '+10 балів'],
  be: ['+5 балаў', '+10 балаў'],
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  Object.assign(bonus, { none: 0, primary: 5, secondary: 10 });
});

describe('GradesStep Polish-school bonus stickers', () => {
  it('shows the bonus on both "Да" cards and none on "Нет" (ru)', () => {
    renderStep('ru');
    const t = messages.ru.choices.polishSchoolLevel;
    const none = screen.getByRole('radio', { name: t.none });
    expect(none.closest('label')?.textContent).toBe(t.none);
    expect(screen.getByRole('radio', { name: /Да, начальную школу.*\+5 баллов/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Да, среднюю школу.*\+10 баллов/ })).toBeTruthy();
    expect(within(screen.getByRole('radio', { name: /Да, среднюю школу/ }).closest('label')!).getByText('+10 баллов')).toBeTruthy();
  });

  it.each(Object.keys(stickerText) as Locale[])('shows the %s sticker text', (locale) => {
    renderStep(locale);
    const t = messages[locale].choices.polishSchoolLevel;
    const [primary, secondary] = stickerText[locale];
    expect(within(screen.getByRole('radio', { name: new RegExp(t.primary) }).closest('label')!).getByText(primary)).toBeTruthy();
    expect(within(screen.getByRole('radio', { name: new RegExp(t.secondary) }).closest('label')!).getByText(secondary)).toBeTruthy();
    expect(messages[locale].choices.polishSchoolBonusBadge.length).toBe(1);
  });

  it('reads the number from polishSchoolBonus', () => {
    Object.assign(bonus, { none: 0, primary: 2, secondary: 7 });
    renderStep('ru');
    expect(screen.getByRole('radio', { name: /Да, начальную школу.*\+2 балла/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Да, среднюю школу.*\+7 баллов/ })).toBeTruthy();
  });

  it('is not shown for citizens of Belarus', () => {
    renderStep('ru', { rankingCountry: 'BY', schoolCountry: 'BY' });
    expect(screen.queryByText(messages.ru.labels.polishSchoolLevel)).toBeNull();
    expect(screen.queryByText(/\+5|\+10/)).toBeNull();
  });
});

describe('GradesStep score preview', () => {
  it('hides the preview and shows the error while the average is above the maximum', async () => {
    const user = userEvent.setup();
    renderStep('ru');
    await user.type(screen.getByLabelText(messages.ru.labels.averageGrade), '13');
    expect(screen.getByRole('alert').textContent).toBe(messages.ru.wizard.averageAboveMaximum);
    expect(screen.queryByText(/Ориентировочный балл/)).toBeNull();
  });

  it('shows the preview for a valid average', async () => {
    const user = userEvent.setup();
    renderStep('ru');
    await user.type(screen.getByLabelText(messages.ru.labels.averageGrade), '12');
    expect(screen.getByText(/Ориентировочный балл: 90,00/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['ru', 'uk', 'be', 'pl', 'en'] as Locale[])('explains the score in plain words without the legal citation (%s)', async (locale) => {
    const user = userEvent.setup();
    renderStep(locale);
    await user.type(screen.getByLabelText(messages[locale].labels.averageGrade), '12');
    const note = screen.getByText(messages[locale].nawaScore.previewNote);
    expect(note.textContent).not.toContain('Ogłoszenie');
  });

  it('uses the intended ru score note (A1)', () => {
    expect(messages.ru.nawaScore.previewNote).toBe(
      'Считаем по правилам NAWA: оценки — до 90 баллов + бонус 0/5/10 за польскую школу. Это не официальный результат NAWA.',
    );
  });

  it('shows the Belarus notice in plain words without the legal citation (A2)', () => {
    renderStep('ru', { rankingCountry: 'BY', schoolCountry: 'BY' });
    const notice = screen.getByText('По правилам NAWA бонус за польскую школу не начисляется гражданам Беларуси.');
    expect(notice.textContent).not.toContain('Ogłoszenie');
    expect(notice.textContent).toBe(messages.ru.wizard.belarusPoloniaBonusNotice);
  });
});

describe('GradesStep low grades score warning', () => {
  const warning = (locale: Locale, max: string, score: string) =>
    messages[locale].wizard.averageBelowThreshold(max, score);

  it('shows a neutral notice with the scale and the score after leaving the field (A1)', async () => {
    const user = userEvent.setup();
    renderStep('ru');
    const average = screen.getByLabelText(messages.ru.labels.averageGrade);
    await user.type(average, '3,2');
    await user.tab();
    const notice = screen.getByText(warning('ru', '12', '24'));
    expect(notice.textContent).toBe(
      'Проверьте среднюю: по шкале до 12 это 24 балла из 90, ниже порога 60. Возможно, оценка введена по другой шкале.',
    );
    expect(notice.getAttribute('role')).toBe('status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('formats the numbers with the locale separator (en)', async () => {
    const user = userEvent.setup();
    renderStep('en', { maximumGrade: 5 });
    await user.type(screen.getByLabelText(messages.en.labels.averageGrade), '3.3');
    await user.tab();
    expect(
      screen.getByText(
        'Check your average: on a scale up to 5 it gives 59.4 of 90 points, below the threshold of 60. It may have been entered on a different scale.',
      ),
    ).toBeTruthy();
  });

  it('does not warn for an average that gives 60 or more (A2)', async () => {
    const user = userEvent.setup();
    renderStep('ru');
    await user.type(screen.getByLabelText(messages.ru.labels.averageGrade), '10,5');
    await user.tab();
    expect(screen.queryByText(/ниже порога 60/)).toBeNull();
  });

  it('shows only the "above maximum" error for an average above the scale (A6)', async () => {
    const user = userEvent.setup();
    renderStep('ru');
    await user.type(screen.getByLabelText(messages.ru.labels.averageGrade), '13');
    await user.tab();
    expect(screen.getByRole('alert').textContent).toBe(messages.ru.wizard.averageAboveMaximum);
    expect(screen.queryByText(/ниже порога 60/)).toBeNull();
  });

  it('waits for the field to be left (A7)', async () => {
    const user = userEvent.setup();
    renderStep('ru');
    await user.type(screen.getByLabelText(messages.ru.labels.averageGrade), '3,2');
    expect(screen.queryByText(/ниже порога 60/)).toBeNull();
    await user.tab();
    expect(screen.getByText(/ниже порога 60/)).toBeTruthy();
  });

  it('is not triggered by leaving the maximum field', async () => {
    const user = userEvent.setup();
    renderStep('ru', { schoolCountry: '', maximumGrade: 12 });
    await user.click(screen.getByLabelText(messages.ru.labels.maximumGrade));
    await user.click(screen.getByLabelText(messages.ru.labels.averageGrade));
    await user.keyboard('3,2');
    expect(screen.queryByText(/ниже порога 60/)).toBeNull();
  });

  it('shows at once for a restored draft or a saved survey in edit (A8)', () => {
    renderStep('ru', { averageGrade: 3.2 });
    expect(screen.getByText(warning('ru', '12', '24'))).toBeTruthy();
  });

  it('is not shown for students in Poland', () => {
    renderStep('ru', { applicantKind: 'student_in_poland', maximumGrade: 5, averageGrade: 4.8 });
    expect(screen.queryByText(/ниже порога 60/)).toBeNull();
  });

  it('does not count the Polish-school bonus', () => {
    renderStep('ru', { maximumGrade: 5, averageGrade: 3.3, polishSchoolLevel: 'secondary' });
    expect(screen.getByText(warning('ru', '5', '59,4'))).toBeTruthy();
  });

  it.each(Object.keys(messages) as Locale[])('has the %s copy with the formatted numbers', (locale) => {
    const text = warning(locale, '12', '24,5');
    expect(text).toContain('12');
    expect(text).toContain('24,5');
    expect(text).toContain('90');
    expect(text).toContain('60');
  });
});
