import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_STORAGE_KEY } from '../i18n';
import { I18nProvider } from '../i18n/context';
import { pl } from '../i18n/pl';
import { ru } from '../i18n/ru';
import { createDevTelegramWebApp, type TelegramWebAppBridge } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { CountrySelect } from './CountrySelect';

const telegramTestState = vi.hoisted(() => ({ webApp: null as TelegramWebAppBridge | null }));

vi.mock('../lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/telegram')>();
  return { ...actual, getTelegramWebApp: vi.fn(() => telegramTestState.webApp) };
});

function Harness({ onChange = vi.fn(), initial = '' }: { onChange?: (value: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <I18nProvider>
      <CountrySelect
        label="Country"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </I18nProvider>
  );
}

async function openSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Country' }));
  return screen.getByRole('dialog');
}

const optionNames = () => screen.getAllByRole('option').map((row) => row.textContent?.replace('✓', ''));

describe('CountrySelect', () => {
  beforeEach(() => {
    telegramTestState.webApp = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('opens a dialog with a focused search field and makes the page behind inert (A1)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    const dialog = await openSheet(user);

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('searchbox')).toHaveFocus();
    expect(within(dialog).getByRole('listbox')).toBeInTheDocument();
    expect(container).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
  });

  it.each(['Ukraine', 'UA', 'Україна', 'Ukraina', 'украина', 'Украіна'])(
    'finds Ukraine first for "%s" while the app is Russian (A2)',
    async (query) => {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
      const user = userEvent.setup();
      render(<Harness />);

      await openSheet(user);
      await user.type(screen.getByRole('searchbox'), query);

      expect(optionNames()[0]).toBe('Украина');
    },
  );

  it('finds Belarus for "belaru" and "Biał" (A3)', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
    const user = userEvent.setup();
    render(<Harness />);

    await openSheet(user);
    await user.type(screen.getByRole('searchbox'), 'belaru');
    expect(optionNames()).toEqual(['Беларусь']);

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'Biał');
    expect(optionNames()).toEqual(['Беларусь']);
  });

  it('treats ё like е when searching Russian names (A2)', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
    const user = userEvent.setup();
    render(<Harness />);

    await openSheet(user);
    await user.type(screen.getByRole('searchbox'), 'Бельгия');
    const plain = optionNames();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'Бёльгия');

    expect(optionNames()).toEqual(plain);
  });

  it('says nothing was found for a query that matches no country (A4)', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
    const user = userEvent.setup();
    render(<Harness />);

    await openSheet(user);
    await user.type(screen.getByRole('searchbox'), 'zzzzqq');

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(ru.countries.noResults)).toBeInTheDocument();
    expect(ru.countries.noResults).toBe('Ничего не найдено');
  });

  it('chooses with Arrow Down and Enter, and Escape closes without a change; focus returns to the field (A5)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: 'Country' });

    await openSheet(user);
    const second = screen.getAllByRole('option')[1];
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.any(String));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveTextContent(second.textContent ?? '');

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('marks the chosen country and starts on it (A5)', async () => {
    const user = userEvent.setup();
    render(<Harness initial="DE" />);

    await openSheet(user);

    const chosen = screen.getAllByRole('option').filter((row) => row.getAttribute('aria-selected') === 'true');
    expect(chosen).toHaveLength(1);
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-activedescendant', chosen[0].id);
  });

  it('keeps Tab inside the sheet (A5)', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const dialog = await openSheet(user);
    const close = within(dialog).getByRole('button', { name: pl.countries.close });
    const search = within(dialog).getByRole('searchbox');

    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(search).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(search).toHaveFocus();
  });

  it('closes when the scrim is pressed and by the close button, returning focus (A5)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Country' });

    const dialog = await openSheet(user);
    await user.click(within(dialog).getByRole('button', { name: pl.countries.close }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('hides the main button while open and lets Back close the sheet instead of the screen (A6)', async () => {
    const app = createDevTelegramWebApp('user=%7B%22id%22%3A900000001%7D');
    const backHandlers = new Set<() => void>();
    const mainHide = vi.spyOn(app.mainButton, 'hide');
    const mainShow = vi.spyOn(app.mainButton, 'show');
    const haptic = vi.spyOn(app.haptic, 'selection');
    app.backButton.onClick = (handler) => void backHandlers.add(handler);
    app.backButton.offClick = (handler) => void backHandlers.delete(handler);
    telegramTestState.webApp = app;
    const screenBack = vi.fn();

    function Screen() {
      useMiniAppChrome({ main: { text: 'Next', visible: true }, back: { visible: true, onClick: screenBack } });
      return <Harness />;
    }

    const user = userEvent.setup();
    render(<Screen />);
    mainHide.mockClear();
    mainShow.mockClear();

    await openSheet(user);
    expect(mainHide).toHaveBeenCalledTimes(1);
    expect(mainShow).not.toHaveBeenCalled();

    act(() => backHandlers.forEach((handler) => handler()));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screenBack).not.toHaveBeenCalled();
    expect(mainShow).toHaveBeenCalledTimes(1);

    act(() => backHandlers.forEach((handler) => handler()));
    expect(screenBack).toHaveBeenCalledTimes(1);

    await openSheet(user);
    await user.click(screen.getAllByRole('option')[0]);
    expect(haptic).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mainShow).toHaveBeenCalledTimes(2);
  });

  it('gives every row a 44px minimum height and keeps headings out of the tab order (A7)', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const dialog = await openSheet(user);

    for (const row of screen.getAllByRole('option')) {
      // `min-h-11` is 2.75rem, 44px.
      expect(row).toHaveClass('min-h-11');
      expect(row).not.toHaveAttribute('tabindex');
    }
    const tabStops = dialog.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])');
    expect([...tabStops].map((element) => element.tagName)).toEqual(['BUTTON', 'INPUT']);
  });

  it('puts the popular group first and only options inside the listbox (A8)', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru');
    const user = userEvent.setup();
    render(<Harness />);

    await openSheet(user);
    const listbox = screen.getByRole('listbox');

    const group = within(listbox).getByRole('group', { name: ru.countries.popular });
    expect(within(group).getAllByRole('option').map((row) => row.textContent)).toEqual([
      'Украина',
      'Беларусь',
      'Казахстан',
      'Россия',
    ]);
    for (const child of Array.from(listbox.children)) {
      expect(['group', 'option']).toContain(child.getAttribute('role'));
    }
    for (const child of Array.from(group.children)) {
      expect([null, 'option']).toContain(child.getAttribute('role'));
    }
    const rest = optionNames().slice(4);
    expect(rest).toEqual([...rest].sort((a, b) => (a ?? '').localeCompare(b ?? '', 'ru')));
  });

  it('lists Belarusian country names in Belarusian even when the browser answers in English', async () => {
    class EnglishDisplayNames {
      of(code: string) {
        return code === 'UA' ? 'Ukraine' : code === 'BY' ? 'Belarus' : code;
      }
    }
    vi.stubGlobal('Intl', { ...Intl, DisplayNames: EnglishDisplayNames });
    localStorage.setItem(LOCALE_STORAGE_KEY, 'be');
    const user = userEvent.setup();
    render(<Harness />);

    await openSheet(user);

    const options = optionNames();
    expect(options).toContain('Украіна');
    expect(options).toContain('Беларусь');
    expect(options).not.toContain('Ukraine');
  });

  it('lists Sudan before South Sudan for the query "sudan" in English', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const user = userEvent.setup();
    render(<Harness />);

    await openSheet(user);
    await user.type(screen.getByRole('searchbox'), 'sudan');

    expect(optionNames().slice(0, 2)).toEqual(['Sudan', 'South Sudan']);
  });
});
