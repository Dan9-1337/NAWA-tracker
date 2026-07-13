import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getCurrentResponse: vi.fn(),
}));

vi.mock('./lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/api-client')>()),
  ...api,
}));

describe('bootstrapApplication', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState(null, '', `/#restore=${'A'.repeat(43)}`);
    api.getCurrentResponse.mockClear();
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = '';
  });

  it('scrubs and hands off a startup fragment before current-session lookup', async () => {
    const { bootstrapApplication } = await import('./bootstrap');
    let root!: ReturnType<typeof bootstrapApplication>;

    act(() => {
      root = bootstrapApplication(document.getElementById('root')!);
    });

    expect(window.location.hash).toBe('');
    expect(await screen.findByText('Odzyskiwanie ankiety')).toBeInTheDocument();
    expect(api.getCurrentResponse).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
