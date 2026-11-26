import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';

/** Marks the app's single scroll container (the `<main>` of MiniAppShell). */
export const APP_SCROLL_ATTRIBUTE = 'data-app-scroll';

function appScrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${APP_SCROLL_ATTRIBUTE}]`);
}

export function scrollAppToTop(): void {
  restoreAppScroll(0);
}

/** Puts the app's scroll container back at `top`, for a screen that keeps its place (the dashboard hub). */
export function restoreAppScroll(top: number): void {
  const container = appScrollContainer();
  if (container) container.scrollTop = top;
}

/**
 * Records the scroll position of the app's container while `active` is true and keeps the last value while it is
 * false, so the screen can be restored with `restoreAppScroll` when the user comes back to it. Scrolls that happen
 * after the screen has been left (the next screen opening at its top) are ignored.
 */
export function useRememberedAppScroll(active: boolean): MutableRefObject<number> {
  const position = useRef(0);
  const activeRef = useRef(active);

  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const container = appScrollContainer();
    if (!container) return undefined;
    const remember = () => {
      if (activeRef.current) position.current = container.scrollTop;
    };
    container.addEventListener('scroll', remember, { passive: true });
    return () => container.removeEventListener('scroll', remember);
  }, []);

  return position;
}

/** Scrolls to the top whenever a dependency changes: a new screen, wizard step or dashboard tab starts at its top. */
export function useScrollToTopOnChange(...dependencies: unknown[]): void {
  useEffect(scrollAppToTop, dependencies);
}

/** Brings the element that carries the returned ref into view each time `message` appears, so a save error is not left below the form. */
export function useScrollIntoViewWhenShown<T extends HTMLElement>(message: string | null | undefined) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [message]);
  return ref;
}
