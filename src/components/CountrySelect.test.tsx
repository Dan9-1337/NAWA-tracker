import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_STORAGE_KEY } from '../i18n';
import { I18nProvider } from '../i18n/context';
import { CountrySelect } from './CountrySelect';

describe('CountrySelect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists Belarusian country names in Belarusian even when the browser answers in English (A3)', async () => {
    class EnglishDisplayNames {
      of(code: string) {
        return code === 'UA' ? 'Ukraine' : code === 'BY' ? 'Belarus' : code;
      }
    }
    vi.stubGlobal('Intl', { ...Intl, DisplayNames: EnglishDisplayNames });
    localStorage.setItem(LOCALE_STORAGE_KEY, 'be');
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <CountrySelect label="Country" value="" onChange={vi.fn()} />
      </I18nProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Country' }));

    const options = screen.getAllByRole('option').map((row) => row.textContent);
    expect(options).toContain('Украіна');
    expect(options).toContain('Беларусь');
    expect(options).not.toContain('Ukraine');
  });

  it('lists Sudan before South Sudan for the query "sudan" in English (A5)', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <CountrySelect label="Country" value="" onChange={vi.fn()} />
      </I18nProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Country' }));
    await user.type(screen.getByRole('searchbox'), 'sudan');

    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['Sudan', 'South Sudan']);
  });
});
