import { forwardRef, useImperativeHandle } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnstileWidget } from './TurnstileWidget';

const reset = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: forwardRef(function TurnstileDouble(
    props: {
      onSuccess?: (token: string) => void;
      onExpire?: (token: string) => void;
      onError?: (code: string) => void;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ reset }));
    return (
      <div>
        <button type="button" onClick={() => props.onSuccess?.('challenge-token')}>success</button>
        <button type="button" onClick={() => props.onExpire?.('challenge-token')}>expire</button>
        <button type="button" onClick={() => props.onError?.('network-error')}>error</button>
      </div>
    );
  }),
}));

describe('TurnstileWidget', () => {
  beforeEach(() => {
    reset.mockClear();
  });

  it('resets the provider widget when the reset signal changes', () => {
    const { rerender } = render(<TurnstileWidget siteKey="site-key" resetKey={0} />);

    rerender(<TurnstileWidget siteKey="site-key" resetKey={1} />);

    expect(reset).toHaveBeenCalledOnce();
  });

  it('resets and invalidates the token on expiration and provider error', () => {
    const onExpire = vi.fn();
    const onError = vi.fn();
    render(<TurnstileWidget siteKey="site-key" onExpire={onExpire} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: 'expire' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(onExpire).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(reset).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledOnce();
  });
});
