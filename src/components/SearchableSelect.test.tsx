import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { normalizeSearchText } from '../../shared/university-search/normalize';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

type Props = Partial<Parameters<typeof SearchableSelect>[0]>;

function renderPicker(options: SearchableSelectOption[], props: Props = {}) {
  return render(
    <SearchableSelect
      label="Picker"
      value=""
      placeholder="Choose"
      searchPlaceholder="Search"
      options={options}
      onChange={vi.fn()}
      {...props}
    />,
  );
}

async function openAndType(query: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Picker' }));
  if (query) await user.type(screen.getByRole('searchbox', { name: 'Search' }), query);
  return user;
}

const rowLabels = () => screen.queryAllByRole('option').map((row) => row.textContent);
const simple = (...labels: string[]) => labels.map((label) => ({ value: label, label }));

describe('SearchableSelect ordering', () => {
  it('shows an empty-state row and reports no results once (A4)', async () => {
    const onSearchNoResults = vi.fn();
    renderPicker(simple('Informatyka', 'Bioinformatyka'), {
      emptyState: 'Nothing found',
      onSearchNoResults,
    });

    await openAndType('zz');

    expect(screen.getByText('Nothing found')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(onSearchNoResults).toHaveBeenCalledTimes(1);
    expect(onSearchNoResults).toHaveBeenCalledWith('zz');
  });

  it('keeps exactly what filterOptions returned (A6)', async () => {
    const filterOptions = vi.fn((options: readonly SearchableSelectOption[]) => [
      options[2]!,
      options[0]!,
    ]);
    renderPicker(simple('Informatyka', 'Bioinformatyka', 'Zarządzanie'), { filterOptions });

    await openAndType('informat');

    expect(rowLabels()).toEqual(['Zarządzanie', 'Informatyka']);
  });

  it('lists options in their original order for an empty query (A7)', async () => {
    renderPicker(
      [
        { value: 'ua', label: 'Ukraina', group: 'P' },
        { value: 'gw', label: 'Gwinea' },
        { value: 'in', label: 'Indie' },
      ],
    );

    await openAndType('');

    expect(rowLabels()).toEqual(['Ukraina', 'Gwinea', 'Indie']);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('ranks inside each group and keeps the group order (A9)', async () => {
    renderPicker([
      { value: 'ua', label: 'Ukraina', group: 'P' },
      { value: 'gw', label: 'Gwinea' },
      { value: 'in', label: 'Indie' },
    ]);

    await openAndType('in');

    expect(rowLabels()).toEqual(['Ukraina', 'Indie', 'Gwinea']);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('ranks a custom matchesQuery result without changing its set (A1, A8)', async () => {
    renderPicker(simple('Automatyka i zarządzanie', 'Zarządzanie', 'Fizyka'), {
      matchesQuery: (option, q) => normalizeSearchText(option.label).includes(normalizeSearchText(q)),
    });

    await openAndType('zarzadzanie');

    expect(rowLabels()).toEqual(['Zarządzanie', 'Automatyka i zarządzanie']);
  });

  it('passes the same result count to the analytics callbacks as before (A10)', async () => {
    const onSearchSelected = vi.fn();
    const onSearchAbandoned = vi.fn();
    const labels = simple('Automatyka i informatyka', 'Bioinformatyka', 'Informatyka', 'Fizyka');
    renderPicker(labels, { onSearchSelected, onSearchAbandoned });

    const user = await openAndType('informat');
    expect(rowLabels()).toEqual(['Informatyka', 'Automatyka i informatyka', 'Bioinformatyka']);
    await user.click(screen.getByRole('option', { name: 'Informatyka' }));

    expect(onSearchSelected).toHaveBeenCalledWith('informat', 'Informatyka', 3);

    await user.click(screen.getByRole('button', { name: 'Picker' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'fiz');
    fireEvent.pointerDown(document.body);

    expect(onSearchAbandoned).toHaveBeenCalledTimes(1);
    expect(onSearchAbandoned).toHaveBeenCalledWith('fiz', 1);
  });
});
