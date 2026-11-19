import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrepCityDistribution } from '../../../shared/contracts';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../../i18n';
import { PrepCitiesCard } from './PrepCitiesCard';

const api = vi.hoisted(() => ({ getPrepCityDistribution: vi.fn() }));

vi.mock('../../lib/api-client', () => api);

function distribution(overrides: Partial<PrepCityDistribution> = {}): PrepCityDistribution {
  return {
    studyField: '0613',
    level: 'detailed',
    groupCode: '0613',
    total: 9,
    cities: [
      { city: 'Kraków', count: 5 },
      { city: 'Łódź', count: 3 },
    ],
    otherCount: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  setActiveLocale('en');
});

describe('PrepCitiesCard', () => {
  it('lists the cities with counts, the merged remainder and the total', async () => {
    api.getPrepCityDistribution.mockResolvedValue(distribution());
    render(<PrepCitiesCard />);

    expect(await screen.findByText('Kraków')).toBeInTheDocument();
    expect(screen.getByText('Łódź')).toBeInTheDocument();
    expect(screen.getByText('Other cities: 1')).toBeInTheDocument();
    expect(screen.getByText('Reports: 9')).toBeInTheDocument();
    expect(screen.getByText(/^Field: /)).toBeInTheDocument();
  });

  it('says which wider level is shown when the own field has too few reports', async () => {
    api.getPrepCityDistribution.mockResolvedValue(distribution({ level: 'narrow', groupCode: '061' }));
    render(<PrepCitiesCard />);
    expect(await screen.findByText(/Too few reports for your field, so we show the group/)).toBeInTheDocument();
  });

  it('says that all fields are shown at the widest level', async () => {
    api.getPrepCityDistribution.mockResolvedValue(distribution({ level: 'all', groupCode: null }));
    render(<PrepCitiesCard />);
    expect(await screen.findByText('Too few reports for your field, so we show all fields')).toBeInTheDocument();
  });

  it('shows the empty copy while nothing can be disclosed', async () => {
    api.getPrepCityDistribution.mockResolvedValue(
      distribution({ level: null, groupCode: null, total: 0, cities: [], otherCount: 0 }),
    );
    render(<PrepCitiesCard />);
    expect(await screen.findByText(/Too few reports to show anything/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('offers a retry after a failed load', async () => {
    api.getPrepCityDistribution.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(distribution());
    const user = userEvent.setup();
    render(<PrepCitiesCard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the data.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Kraków')).toBeInTheDocument());
    expect(api.getPrepCityDistribution).toHaveBeenCalledTimes(2);
  });
});
