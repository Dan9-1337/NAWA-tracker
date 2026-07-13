import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatisticsPanel } from './StatisticsPanel';

describe('StatisticsPanel', () => {
  it('renders unavailable, loading, and error states distinctly', () => {
    const { rerender } = render(<StatisticsPanel state={{ status: 'unavailable' }} />);

    expect(screen.getByText('Statystyki pojawią się po zapisaniu ankiety.')).toBeInTheDocument();
    expect(screen.queryByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).not.toBeInTheDocument();

    rerender(<StatisticsPanel state={{ status: 'loading' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Wczytywanie statystyk…');
    expect(screen.getByRole('region', { name: 'Twoje wyniki na tle innych uczestników' })).toHaveAttribute('aria-busy', 'true');

    rerender(<StatisticsPanel state={{ status: 'error' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać statystyk.');
    expect(screen.queryByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).not.toBeInTheDocument();
  });

  it('renders the suppression state only for a successful suppressed result', () => {
    render(<StatisticsPanel state={{ status: 'suppressed', data: suppressedStatistics }} />);

    expect(screen.getByText('Za mało danych, aby pokazać szczegółowe porównanie dla tej grupy.')).toBeInTheDocument();
  });

  it('renders suppressed university counts as unavailable', () => {
    render(
      <StatisticsPanel
        state={{ status: 'suppressed', data: suppressedStatistics }}
      />,
    );

    expect(screen.getByText('Na tej samej uczelni').parentElement).toHaveTextContent('—');
    expect(screen.getByText('Na tej samej uczelni i kierunku').parentElement).toHaveTextContent('—');
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('renders the complete localized percentile sentence', () => {
    render(<StatisticsPanel state={{ status: 'success', data: detailedStatistics }} />);

    expect(
      screen.getByText('Twój wynik jest wyższy niż wynik 40.0% uczestników tej grupy.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Liczba odpowiedzi w grupie')).toBeInTheDocument();
    expect(screen.getByText('Mediana w tej grupie: 82.5%')).toBeInTheDocument();
  });
});

const suppressedStatistics = {
  detailsAvailable: false,
  group: null,
  totalValidResponses: 9,
  sameTrackCount: 9,
  sameUniversityCount: null,
  sameUniversityAndFieldCount: null,
  groupResponseCount: 0,
  medianGradePercentage: null,
  lowerGradePercentage: null,
  waitingForDecisionCount: null,
  positiveDecisionCount: null,
  negativeDecisionCount: null,
} as const;

const detailedStatistics = {
  ...suppressedStatistics,
  detailsAvailable: true,
  group: 'track-route-type' as const,
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameUniversityCount: 12,
  sameUniversityAndFieldCount: 10,
  groupResponseCount: 10,
  medianGradePercentage: 82.5,
  lowerGradePercentage: 40,
  waitingForDecisionCount: 4,
  positiveDecisionCount: 5,
  negativeDecisionCount: 1,
};
