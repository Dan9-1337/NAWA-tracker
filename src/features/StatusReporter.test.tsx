import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';
import { StatusReporter } from './StatusReporter';

function renderReporter(props: Partial<Parameters<typeof StatusReporter>[0]> = {}) {
  render(
    <StatusReporter
      savedStatus="merit_review_positive"
      status="scholarship_awarded"
      statusChangedAt="2026-11-10"
      options={['merit_review_positive', 'scholarship_awarded', 'scholarship_not_awarded']}
      dirty
      open
      onOpenChange={() => undefined}
      onStatusChange={() => undefined}
      onDateChange={() => undefined}
      showCity
      prepCourseCity=""
      onCityChange={vi.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');
});

describe('StatusReporter prep-course city', () => {
  it('asks for the city when an award is reported on the preparatory route', () => {
    renderReporter();
    expect(screen.getByLabelText('Miasto kursu przygotowawczego')).toBeInTheDocument();
  });

  it('does not ask on the direct-studies route', () => {
    renderReporter({ showCity: false });
    expect(screen.queryByLabelText('Miasto kursu przygotowawczego')).not.toBeInTheDocument();
  });

  it('does not ask for any other status', () => {
    renderReporter({ status: 'scholarship_not_awarded' });
    expect(screen.queryByLabelText('Miasto kursu przygotowawczego')).not.toBeInTheDocument();
  });
});
