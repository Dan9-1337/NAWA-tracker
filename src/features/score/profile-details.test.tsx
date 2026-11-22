import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ResponseFormInput } from '../../../shared/contracts';
import { pl } from '../../i18n/pl';
import { ProfileDetails } from './ProfileDetails';

const current: ResponseFormInput = {
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
  statusChangedAt: '2026-07-13',
};

describe('ProfileDetails', () => {
  it('opens the same wizard step from each profile row', async () => {
    const onEditSection = vi.fn();
    const user = userEvent.setup();
    render(<ProfileDetails current={current} onEditSection={onEditSection} />);

    await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.citizenship) }));
    expect(onEditSection).toHaveBeenLastCalledWith('education');

    await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.average) }));
    expect(onEditSection).toHaveBeenLastCalledWith('grades');

    await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.scale) }));
    expect(onEditSection).toHaveBeenLastCalledWith('grades');

    await user.click(screen.getByRole('button', { name: new RegExp(pl.scoreScreen.rows.polish) }));
    expect(onEditSection).toHaveBeenLastCalledWith('grades');
    expect(onEditSection).toHaveBeenCalledTimes(4);
  });

  it('builds the formula from the saved values without a bonus', () => {
    render(<ProfileDetails current={current} onEditSection={vi.fn()} />);

    expect(screen.getByText(/^4,50 × 90 ÷ 5 = 81,00\./)).toBeInTheDocument();
    expect(screen.getByText(pl.scoreScreen.formulaDisclaimer, { exact: false })).toBeInTheDocument();
  });

  it('includes the Polish-school bonus in the saved formula', () => {
    render(
      <ProfileDetails
        current={{ ...current, polishSchoolLevel: 'secondary' }}
        onEditSection={vi.fn()}
      />,
    );

    expect(screen.getByText(/^4,50 × 90 ÷ 5 \+ 10 = 91,00\./)).toBeInTheDocument();
  });
});
