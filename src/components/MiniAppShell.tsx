import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';
import { getDevChromeState, getTelegramWebApp } from '../lib/telegram';

function DevActionBar({ hidden }: { hidden: boolean }) {
  const app = getTelegramWebApp();
  const [state, setState] = useState(getDevChromeState);

  useEffect(() => {
    if (app?.isTelegram) return undefined;
    const id = window.setInterval(() => setState(getDevChromeState()), 100);
    return () => window.clearInterval(id);
  }, [app?.isTelegram]);

  if (hidden || !app || app.isTelegram) return null;
  if (!state.mainVisible && !state.secondaryVisible && !state.backVisible) return null;

  return (
    <div
      className="shrink-0 border-t border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-3"
      style={{
        paddingBottom: 'max(0.75rem, var(--tg-content-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-2">
        {state.backVisible ? (
          <button
            type="button"
            className="rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold"
            onClick={() => state.triggerBack()}
          >
            ← Back
          </button>
        ) : null}
        {state.secondaryVisible ? (
          <button
            type="button"
            disabled={!state.secondaryEnabled}
            className="rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={() => state.triggerSecondary()}
          >
            {state.secondaryText}
          </button>
        ) : null}
        {state.mainVisible ? (
          <button
            type="button"
            disabled={!state.mainEnabled || state.mainProgress}
            className="rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-50"
            onClick={() => state.triggerMain()}
          >
            {state.mainProgress ? '…' : state.mainText}
          </button>
        ) : null}
      </div>
    </div>
  );
}

type MiniAppShellProps = {
  title: string;
  children: ReactNode;
  subtitle?: string | null;
  onOpenSettings?: () => void;
  onOpenRadar?: () => void;
  suspendActionBar?: boolean;
};

export function MiniAppShell({
  title,
  children,
  subtitle,
  onOpenSettings,
  onOpenRadar,
  suspendActionBar = false,
}: MiniAppShellProps) {
  const { t } = useI18n();
  return (
    <div className="app-shell h-[var(--tg-viewport-stable-height,100dvh)] w-full text-[var(--tg-theme-text-color)]">
      <div
        className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden"
        style={{
          paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
          paddingRight: 'var(--tg-content-safe-area-inset-right, env(safe-area-inset-right, 0px))',
          paddingLeft: 'var(--tg-content-safe-area-inset-left, env(safe-area-inset-left, 0px))',
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-4 pt-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--text-disabled)]">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {onOpenRadar ? (
              <button
                type="button"
                aria-label={t.radar.open}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] text-[var(--text-primary)] transition-colors hover:bg-[var(--tg-theme-secondary-bg-color)] active:bg-[var(--tg-theme-secondary-bg-color)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                onClick={onOpenRadar}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  <path d="M12 12l6-4" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
            {onOpenSettings ? (
              <button
                type="button"
                aria-label={t.settings.open}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] text-[var(--text-primary)] transition-colors hover:bg-[var(--tg-theme-secondary-bg-color)] active:bg-[var(--tg-theme-secondary-bg-color)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                onClick={onOpenSettings}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 14 2h-4a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.65 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.39.3.59.22l2.39-.96c.5.39 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h4c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z" />
                </svg>
              </button>
            ) : null}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</main>
        <DevActionBar hidden={suspendActionBar} />
      </div>
    </div>
  );
}
