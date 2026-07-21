import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-3"
      style={{ paddingBottom: 'max(0.75rem, var(--tg-content-safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-2">
        {state.backVisible ? (
          <button
            type="button"
            className="rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold"
            onClick={() => state.triggerBack()}
          >
            ← Back
          </button>
        ) : null}
        {state.secondaryVisible ? (
          <button
            type="button"
            disabled={!state.secondaryEnabled}
            className="rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={() => state.triggerSecondary()}
          >
            {state.secondaryText}
          </button>
        ) : null}
        {state.mainVisible ? (
          <button
            type="button"
            disabled={!state.mainEnabled || state.mainProgress}
            className="rounded-xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-50"
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
  onOpenSettings?: () => void;
  /** When true (authenticated), header shows Settings only. Otherwise Start/gate: language only. */
  authenticatedHeader?: boolean;
  suspendActionBar?: boolean;
};

export function MiniAppShell({
  title,
  children,
  onOpenSettings,
  authenticatedHeader = false,
  suspendActionBar = false,
}: MiniAppShellProps) {
  const { t } = useI18n();
  return (
    <div
      className="mx-auto flex min-h-[var(--tg-viewport-stable-height,100dvh)] w-full max-w-md flex-col text-[var(--tg-theme-text-color)]"
      style={{
        paddingTop: 'var(--tg-content-safe-area-inset-top, 0px)',
        paddingRight: 'var(--tg-content-safe-area-inset-right, 0px)',
        paddingLeft: 'var(--tg-content-safe-area-inset-left, 0px)',
        paddingBottom: 'calc(var(--tg-content-safe-area-inset-bottom, 0px) + 5.5rem)',
        background: 'var(--tg-theme-bg-color)',
      }}
    >
      <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-3">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {authenticatedHeader && onOpenSettings ? (
            <button
              type="button"
              aria-label={t.settings.open}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base active:opacity-70"
              onClick={onOpenSettings}
            >
              ⚙
            </button>
          ) : null}
          {!authenticatedHeader ? <LanguageSwitcher /> : null}
        </div>
      </header>
      <main className="flex-1 px-4 pb-4">{children}</main>
      <DevActionBar hidden={suspendActionBar} />
    </div>
  );
}
