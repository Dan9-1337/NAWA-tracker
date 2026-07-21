import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StatisticsResult } from '../../../shared/contracts';
import { StatisticsPanel } from './StatisticsPanel';

const profile = {
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director' as const,
  studyRoute: 'direct_studies' as const,
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'none' as const,
  currentStatus: 'submitted' as const,
  statusChangedAt: '2026-07-13',
};

describe('StatisticsPanel', () => {
  it('renders unavailable, loading, and error states distinctly', () => {
    const { rerender } = render(<StatisticsPanel state={{ status: 'unavailable' }} profile={profile} />);

    expect(screen.getByText('Statystyki pojawią się po zapisaniu ankiety.')).toBeInTheDocument();

    rerender(<StatisticsPanel state={{ status: 'loading' }} profile={profile} />);
    expect(screen.getByRole('status')).toHaveTextContent('Wczytywanie statystyk…');

    rerender(<StatisticsPanel state={{ status: 'error' }} profile={profile} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać statystyk');
  });

  it('renders suppressed state as progress toward threshold', () => {
    render(<StatisticsPanel state={{ status: 'suppressed', data: suppressedStatistics }} profile={profile} />);

    expect(screen.getByText('Czekamy na więcej ankiet')).toBeInTheDocument();
    expect(screen.getByText(/W Twojej grupie: 9/)).toBeInTheDocument();
    expect(screen.getByText(/brakuje 1/)).toBeInTheDocument();
  });

  it('uses band hero for small cohorts and keeps exact percentile in details', async () => {
    const user = userEvent.setup();
    render(
      <StatisticsPanel
        state={{ status: 'success', data: qualitativeStatistics }}
        profile={profile}
        userScore={75}
      />,
    );

    expect(screen.getByText('Twój wynik')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'W górnej części grupy' })).toBeInTheDocument();
    expect(
      screen.getByText('Twój wynik jest wyższy niż większość ankiet w tej grupie.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Wyższy niż u 95%/)).not.toBeInTheDocument();
    expect(screen.getByText('Twoja grupa porównawcza')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Wiarygodność porównania/ }));
    expect(screen.getByText('Wyższy niż u 95% ankiet w tej grupie.')).toBeInTheDocument();
  });

  it('shows percentile support for detailed cohorts', () => {
    render(
      <StatisticsPanel
        state={{ status: 'success', data: detailedStatistics }}
        profile={profile}
        userScore={75}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Powyżej mediany' })).toBeInTheDocument();
    expect(screen.getByText('Wyższy niż u 65% ankiet w tej grupie.')).toBeInTheDocument();
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

const qualitativeStatistics: StatisticsResult = {
  detailsAvailable: true,
  group: 'track-country',
  totalValidResponses: 20,
  sameTrackCount: 18,
  sameCountryCount: 12,
  groupResponseCount: 19,
  medianScore: 82.5,
  lowerScorePercentage: 95,
  statusCounts: null,
};

const detailedStatistics: StatisticsResult = {
  detailsAvailable: true,
  group: 'track-country',
  totalValidResponses: 40,
  sameTrackCount: 36,
  sameCountryCount: 30,
  groupResponseCount: 30,
  medianScore: 82.5,
  lowerScorePercentage: 65,
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
