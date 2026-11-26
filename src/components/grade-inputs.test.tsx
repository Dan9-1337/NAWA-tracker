import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/context';
import { LOCALE_STORAGE_KEY, messages, setActiveLocale } from '../i18n';
import type { Locale } from '../i18n/types';
import { GradeInputs } from './GradeInputs';

type Grades = { average: number | null; maximum: number | null };

function Harness({
  initial,
  maximumReadOnly = false,
  onValues,
}: {
  initial: Grades;
  maximumReadOnly?: boolean;
  onValues?: (values: Grades) => void;
}) {
  const [values, setValues] = useState(initial);
  const t = messages.ru;
  return (
    <GradeInputs
      averageGrade={values.average}
      maximumGrade={values.maximum}
      averageLabel={t.labels.averageGrade}
      maximumLabel={t.labels.maximumGrade}
      maximumReadOnly={maximumReadOnly}
      averageExceedsWarning={t.wizard.averageAboveMaximum}
      averageRequiredError={t.wizard.validation.averageGradeRequired}
      onAverageChange={(average) => {
        const next = { ...values, average };
        setValues(next);
        onValues?.(next);
      }}
      onMaximumChange={(maximum) => {
        const next = { ...values, maximum };
        setValues(next);
        onValues?.(next);
      }}
    />
  );
}

function renderWith(locale: Locale, props: Parameters<typeof Harness>[0]) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  setActiveLocale(locale);
  return render(
    <I18nProvider>
      <Harness {...props} />
    </I18nProvider>,
  );
}

const average = () => screen.getByLabelText(messages.ru.labels.averageGrade) as HTMLInputElement;
const maximum = () => screen.getByLabelText(messages.ru.labels.maximumGrade) as HTMLInputElement;

beforeEach(() => {
  localStorage.clear();
});

describe('GradeInputs decimal separator', () => {
  it.each([
    ['ru', '10,5'],
    ['pl', '10,5'],
    ['uk', '10,5'],
    ['be', '10,5'],
    ['en', '10.5'],
  ] as const)('shows a saved 10.5 as %s "%s" on first render', (locale, expected) => {
    renderWith(locale, { initial: { average: 10.5, maximum: 12 } });
    expect(average().value).toBe(expected);
    expect(maximum().value).toBe('12');
  });

  it('keeps a typed 11,5 after the field loses focus (ru)', async () => {
    const user = userEvent.setup();
    renderWith('ru', { initial: { average: null, maximum: 12 } });
    await user.type(average(), '11,5');
    await user.tab();
    expect(average().value).toBe('11,5');
  });

  it('does not round or group: 4,825 stays 4,825 and a maximum of 1000 stays 1000', async () => {
    const user = userEvent.setup();
    const onValues = vi.fn();
    renderWith('ru', { initial: { average: null, maximum: null }, onValues });
    await user.type(average(), '4,825');
    await user.tab();
    expect(average().value).toBe('4,825');
    expect(onValues).toHaveBeenLastCalledWith({ average: 4.825, maximum: null });
  });

  it('keeps an English maximum of 1000 ungrouped after blur and stores 1000', async () => {
    const user = userEvent.setup();
    const onValues = vi.fn();
    renderWith('en', { initial: { average: null, maximum: null }, onValues });
    await user.type(maximum(), '1000');
    await user.tab();
    expect(maximum().value).toBe('1000');
    expect(onValues).toHaveBeenLastCalledWith({ average: null, maximum: 1000 });
  });

  it('shows a read-only maximum with the locale separator', () => {
    renderWith('ru', { initial: { average: null, maximum: 2.5 }, maximumReadOnly: true });
    expect(maximum().value).toBe('2,5');
  });
});

describe('GradeInputs required error', () => {
  it('is not shown before the field has been focused and left', () => {
    renderWith('ru', { initial: { average: null, maximum: 12 } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(messages.ru.wizard.validation.averageGradeRequired)).toBeNull();
    expect(average().className).not.toContain('destructive');
  });

  it('appears after the empty field was focused and left', async () => {
    const user = userEvent.setup();
    renderWith('ru', { initial: { average: null, maximum: 12 } });
    await user.click(average());
    expect(screen.queryByRole('alert')).toBeNull();
    await user.tab();
    expect(screen.getByRole('alert').textContent).toBe(messages.ru.wizard.validation.averageGradeRequired);
    expect(average().className).toContain('destructive');
  });
});
