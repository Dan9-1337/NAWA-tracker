import { useEffect } from 'react';

/** Marks the app's single scroll container (the `<main>` of MiniAppShell). */
export const APP_SCROLL_ATTRIBUTE = 'data-app-scroll';

export function scrollAppToTop(): void {
  const container = document.querySelector<HTMLElement>(`[${APP_SCROLL_ATTRIBUTE}]`);
  if (container) container.scrollTop = 0;
}

/** Scrolls to the top whenever a dependency changes: a new screen, wizard step or dashboard tab starts at its top. */
export function useScrollToTopOnChange(...dependencies: unknown[]): void {
  useEffect(scrollAppToTop, dependencies);
}
