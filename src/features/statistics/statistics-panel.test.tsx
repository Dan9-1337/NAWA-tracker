import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { StatisticsPanel } from './StatisticsPanel';

describe('StatisticsPanel', () => {
  it('renders unavailable, loading, and error states distinctly', () => {
    const { rerender } = render(<StatisticsPanel state={{ status: 'unavailable' }} />);

    expect(screen.getByText('Statystyki pojawią się po zapisaniu ankiety.')).toBeInTheDocument();
    expect(screen.queryByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).not.toBeInTheDocument();

    rerender(<StatisticsPanel state={{ status: 'loading' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Wczytywanie statystyk…');
    expect(screen.getByRole('region', { name: 'Twój wynik na tle innych zgłoszeń' })).toHaveAttribute('aria-busy', 'true');

    rerender(<StatisticsPanel state={{ status: 'error' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać statystyk. Spróbuj ponownie później.');
    expect(screen.queryByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).not.toBeInTheDocument();
  });

  it('renders a suppressed result without detailed breakdown', () => {
    render(<StatisticsPanel state={{ status: 'suppressed', data: suppressedStatistics }} />);

    expect(screen.getByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).toBeInTheDocument();
    expect(screen.queryByText('Rozkład statusów w grupie')).not.toBeInTheDocument();
  });

  it('renders the complete localized percentile sentence', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        userScore={75}
        profilePath="Stypendium Dyrektora NAWA"
      />,
    );

    expect(
      screen.getByText('Twój wynik jest wyższy niż wynik 40.0% uczestników tej grupy.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Twoja pozycja na skali wyniku')).toBeInTheDocument();
    expect(screen.getByText('Stypendium Dyrektora NAWA')).toBeInTheDocument();
    expect(screen.getByText('Ty')).toBeInTheDocument();
    expect(screen.getByText('Mediana grupy')).toBeInTheDocument();
    expect(screen.getByText('Liczba odpowiedzi w grupie')).toBeInTheDocument();
    expect(screen.getByText('Mediana wyniku w tej grupie: 82.50')).toBeInTheDocument();
  });
});

const suppressedStatistics: StatisticsResult = {
  detailsAvailable: false,
  group: null,
  totalValidResponses: 9,
  sameTrackCount: 9,
  sameCountryCount: null,
  groupResponseCount: 0,
  medianScore: null,
  lowerScorePercentage: null,
  statusCounts: null,
};

const detailedStatistics: StatisticsResult = {
  detailsAvailable: true,
  group: 'track-country',
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 12,
  groupResponseCount: 10,
  medianScore: 82.5,
  lowerScorePercentage: 40,
  statusCounts: {
    submitted: 2,
    formal_review_in_progress: 2,
    correction_requested: 0,
    formal_review_completed: 2,
    merit_review_in_progress: 1,
    merit_review_positive: 1,
    merit_review_negative: 0,
    awaiting_decision: 1,
    scholarship_awarded: 1,
    scholarship_not_awarded: 0,
  },
};
