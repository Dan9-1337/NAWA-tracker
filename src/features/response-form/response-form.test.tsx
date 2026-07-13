import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponseFormInput } from '../../../shared/contracts';
import { ResponseForm } from './ResponseForm';

const turnstileResets: number[] = [];
const turnstileCallbacks: Array<(token: string) => void> = [];

vi.mock('../../components/TurnstileWidget', () => ({
  TurnstileWidget: ({
    onVerify,
    resetKey = 0,
  }: {
    onVerify?: (token: string) => void;
    resetKey?: number;
  }) => {
    useEffect(() => {
      turnstileResets.push(resetKey);
      if (onVerify) turnstileCallbacks.push(onVerify);
    }, [resetKey]);
    return <button type="button" onClick={() => onVerify?.('challenge-token')}>verify</button>;
  },
}));

const initialValue: ResponseFormInput = {
  scholarshipTrack: 'minister_health',
  studyRoute: 'preparatory_course',
  studyType: 'uniform_masters',
  country: 'Niemcy',
  gradeScale: 10,
  gradeValue: 8,
  university: 'Uniwersytet Gdański',
  studyField: 'Data Science',
  choicePriority: 'second_choice',
  applicationStatus: 'under_review',
};

describe('ResponseForm', () => {
  beforeEach(() => {
    turnstileResets.length = 0;
    turnstileCallbacks.length = 0;
  });

  it('uses initial values and toggles custom scale inputs', async () => {
    const user = userEvent.setup();
    render(<ResponseForm mode="update" initialValue={initialValue} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Kraj')).toHaveValue('Niemcy');
    expect(screen.getByLabelText('Uczelnia')).toHaveValue('Uniwersytet Gdański');
    expect(screen.getByLabelText('Kierunek studiów')).toHaveValue('Data Science');

    await user.click(screen.getByLabelText('Własna skala'));
    expect(screen.getByLabelText('Maksymalna skala własna')).toBeInTheDocument();
  });

  it('rejects unknown universities while retaining custom study fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ResponseForm mode="update" initialValue={initialValue} onSubmit={onSubmit} />);

    const university = screen.getByLabelText('Uczelnia');
    const studyField = screen.getByLabelText('Kierunek studiów');
    expect(university).toHaveAttribute('list', 'university-suggestions');
    expect(studyField).toHaveAttribute('list', 'study-field-suggestions');
    expect(document.querySelector('#university-suggestions option[value="Uniwersytet Warszawski"]')).not.toBeNull();
    expect(document.querySelector('#study-field-suggestions option[value="Informatyka"]')).not.toBeNull();

    await user.clear(university);
    await user.type(university, 'Uczelnia spoza listy');
    await user.clear(studyField);
    await user.type(studyField, 'Autorski kierunek');
    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));

    expect(university).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('response-university-error')).toHaveTextContent('Wybierz uczelnię z listy.');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(studyField).toHaveValue('Autorski kierunek');

    await user.clear(university);
    await user.type(university, 'Uniwersytet Warszawski');
    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        university: 'Uniwersytet Warszawski',
        studyField: 'Autorski kierunek',
      }),
      undefined,
    );
  });

  it('uses localized placeholders and corrected study labels', () => {
    render(<ResponseForm mode="update" initialValue={initialValue} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Kraj')).toHaveAttribute('placeholder', 'Polska');
    expect(screen.getByLabelText('Uczelnia')).toHaveAttribute('placeholder', 'Wybierz uczelnię z listy');
    expect(screen.getByLabelText('Kierunek studiów')).toHaveAttribute('placeholder', 'Wpisz nazwę kierunku');
    expect(screen.getByLabelText('Tryb rozpoczęcia nauki')).toBeInTheDocument();
    expect(screen.getByLabelText('Rodzaj studiów')).toBeInTheDocument();
  });

  it('requires Turnstile only when creating and passes its token', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ResponseForm mode="create" onSubmit={create} />);

    expect(screen.getByRole('button', { name: 'Zapisz odpowiedź' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'verify' }));
    await user.click(screen.getByRole('button', { name: 'Zapisz odpowiedź' }));
    expect(create).toHaveBeenCalledWith(expect.any(Object), 'challenge-token');

    const update = vi.fn().mockResolvedValue(undefined);
    rerender(<ResponseForm mode="update" initialValue={initialValue} onSubmit={update} />);
    expect(screen.queryByRole('button', { name: 'verify' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));
    expect(update).toHaveBeenCalledWith(initialValue, undefined);
  });

  it('disables duplicate submissions and resets create Turnstile after settlement', async () => {
    const user = userEvent.setup();
    let settle!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => { settle = resolve; }));
    render(<ResponseForm mode="create" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'verify' }));
    await user.click(screen.getByRole('button', { name: 'Zapisz odpowiedź' }));
    expect(screen.getByRole('button', { name: 'Zapisywanie…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Zapisywanie…' }));
    expect(onSubmit).toHaveBeenCalledOnce();

    settle();
    expect(await screen.findByRole('button', { name: 'Zapisz odpowiedź' })).toBeDisabled();
    expect(turnstileResets).toEqual([0, 1]);
  });

  it('shows a safe server error without exposing exception details', async () => {
    const user = userEvent.setup();
    render(
      <ResponseForm
        mode="update"
        initialValue={initialValue}
        onSubmit={() => Promise.reject(new Error('database host and secret'))}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać danych. Spróbuj ponownie.');
    expect(screen.queryByText(/database host and secret/i)).not.toBeInTheDocument();
  });

  it('ignores callbacks retained by an old Turnstile generation', async () => {
    const user = userEvent.setup();
    render(<ResponseForm mode="create" onSubmit={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole('button', { name: 'verify' }));
    const oldCallback = turnstileCallbacks[0];
    await user.click(screen.getByRole('button', { name: 'Zapisz odpowiedź' }));
    expect(await screen.findByRole('button', { name: 'Zapisz odpowiedź' })).toBeDisabled();

    act(() => oldCallback('late-old-token'));
    expect(screen.getByRole('button', { name: 'Zapisz odpowiedź' })).toBeDisabled();
  });

  it('reports draft changes and disables the whole form for a competing operation', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    const { rerender } = render(
      <ResponseForm mode="update" initialValue={initialValue} onSubmit={vi.fn()} onDraftChange={onDraftChange} />,
    );

    await user.clear(screen.getByLabelText('Kraj'));
    await user.type(screen.getByLabelText('Kraj'), 'Czechy');
    expect(onDraftChange).toHaveBeenLastCalledWith(expect.objectContaining({ country: 'Czechy' }));

    rerender(
      <ResponseForm mode="update" initialValue={initialValue} onSubmit={vi.fn()} onDraftChange={onDraftChange} disabled />,
    );
    expect(screen.getByRole('form', { name: 'Twój formularz' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Zaktualizuj dane' })).toBeDisabled();
    expect(screen.getByLabelText('Kraj')).toBeDisabled();
  });

  it('clears decisionDate immediately when status changes from final to non-final', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    render(
      <ResponseForm
        mode="update"
        initialValue={{
          ...initialValue,
          applicationStatus: 'positive_decision',
          decisionDate: '2026-07-13',
        }}
        onSubmit={vi.fn()}
        onDraftChange={onDraftChange}
      />,
    );

    expect(screen.getByLabelText('Data decyzji')).toHaveValue('2026-07-13');
    await user.selectOptions(screen.getByLabelText('Status wniosku'), 'submitted');

    expect(screen.queryByLabelText('Data decyzji')).not.toBeInTheDocument();
    expect(onDraftChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ applicationStatus: 'submitted', decisionDate: null }),
    );
  });

  it('maps client validation to Polish accessible field errors and an alert summary', async () => {
    const user = userEvent.setup();
    render(<ResponseForm mode="update" initialValue={initialValue} onSubmit={vi.fn()} />);

    await user.clear(screen.getByLabelText('Uczelnia'));
    await user.click(screen.getByRole('button', { name: 'Zaktualizuj dane' }));

    const university = screen.getByLabelText('Uczelnia');
    expect(university).toHaveAttribute('aria-invalid', 'true');
    expect(university).toHaveAttribute('aria-describedby', 'response-university-hint response-university-error');
    expect(document.getElementById('response-university-error')).toHaveTextContent('Wybierz uczelnię z listy.');
    expect(screen.getByRole('alert')).toHaveTextContent('Sprawdź zaznaczone pola.');
    expect(screen.queryByText(/String must contain|university/i)).not.toBeInTheDocument();
  });
});
