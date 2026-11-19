import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseFormInput } from '../../../shared/contracts';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../../i18n';
import { responseToDraft } from '../../lib/draft';
import { ApplicationStep } from './ApplicationStep';

vi.mock('../../lib/telegram', () => ({ getTelegramWebApp: () => null }));

const base: ResponseFormInput = {
  intakeYear: 2026,
  hasPolishCitizenship: false,
  rankingCountry: 'UA',
  schoolCountry: 'UA',
  scholarshipTrack: 'nawa_director',
  studyRoute: 'direct_studies',
  targetUniversity: 'science-096',
  studyField: '0613',
  gradeBasis: 'final_certificate',
  applicantKind: 'school_leaver',
  averageGrade: 4.5,
  maximumGrade: 5,
  polishSchoolLevel: 'none',
  currentStatus: 'submitted',
  statusChangedAt: '2026-11-01',
};

function renderStep(studyField: string, studyFieldError: string | null = null) {
  render(
    <ApplicationStep
      draft={{ ...responseToDraft(base), studyField }}
      onChange={() => undefined}
      universityError={null}
      studyFieldError={studyFieldError}
    />,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');
});

describe('ApplicationStep study field', () => {
  it('shows the selected field', () => {
    renderStep('0613');
    expect(screen.getByLabelText('Kierunek studiów')).toHaveTextContent('Tworzenie i analiza oprogramowania');
    expect(screen.queryByText(/NAWA nie finansuje lingwistyki/)).not.toBeInTheDocument();
  });

  it.each(['0231', '0232'])('warns about the philology restriction for field %s', (code) => {
    renderStep(code);
    expect(screen.getByRole('status')).toHaveTextContent('NAWA nie finansuje lingwistyki stosowanej');
  });

  it('renders the validation error', () => {
    renderStep('', 'Kierunek jest wymagany');
    expect(screen.getByText('Kierunek jest wymagany')).toBeInTheDocument();
  });
});
