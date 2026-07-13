import { canonicalOpaqueTokenPattern } from '../../shared/validation';

export function takeRecoveryTokenFromFragment(): string | null {
  const match = /^#restore=([^&]*)$/.exec(window.location.hash);
  if (!match) return null;

  const token = match[1];
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  return canonicalOpaqueTokenPattern.test(token) ? token : null;
}
