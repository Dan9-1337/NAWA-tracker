import { useEffect, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { ConfirmSummary } from '../features/ConfirmSummary';
import { useI18n } from '../i18n/context';
import { getStoredThemePreference, type ThemePreference } from '../lib/theme';
import { getTelegramWebApp } from '../lib/telegram';
import { DeleteProfileZone } from './DeleteProfileZone';
import { ChevronIcon } from './icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { AboutView } from './settings/AboutView';
import { HelpView } from './settings/HelpView';
import { MainMenu } from './settings/MainMenu';
import { PrivacyView } from './settings/PrivacyView';
import { settingsViewTitle, type SettingsView } from './settings/settings-view';
import { ThemeSwitcher } from './ThemeSwitcher';

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  current: ResponseFormInput | null;
  onEditProfile?: () => void;
  onDelete?: () => Promise<void>;
};

function resolveThemePreference(): ThemePreference {
  const stored = getStoredThemePreference();
  if (stored) return stored;
  return getTelegramWebApp()?.colorScheme === 'dark' ? 'dark' : 'light';
}

export function SettingsSheet({ open, onClose, current, onEditProfile, onDelete }: SettingsSheetProps) {
  const { t } = useI18n();
  const [view, setView] = useState<SettingsView>('menu');
  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setView('menu');
      return undefined;
    }
    const focusTarget = view === 'menu' ? closeRef : backRef;
    focusTarget.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open, view]);

  if (!open) return null;

  const nested = view !== 'menu';

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        aria-label={t.settings.close}
        className="absolute inset-0 bg-[var(--overlay-scrim)]"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(85vh,var(--tg-viewport-stable-height,100dvh))] w-full max-w-md flex-col rounded-t-3xl bg-[var(--tg-theme-section-bg-color)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--tg-theme-hint-color)]"
            aria-hidden="true"
          />

          <div className="relative flex min-h-11 items-center justify-center">
            {nested ? (
              <button
                ref={backRef}
                type="button"
                className="absolute left-0 top-1/2 flex h-11 w-11 shrink-0 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_12%,transparent)]"
                onClick={() => setView('menu')}
              >
                <ChevronIcon className="rotate-180" size={18} />
                <span className="sr-only">{t.settings.back}</span>
              </button>
            ) : null}
            <h2
              id="settings-title"
              className={`text-center text-lg font-semibold leading-tight${nested ? ' px-14' : ''}`}
            >
              {settingsViewTitle(view, t)}
            </h2>
          </div>

          {view === 'menu' ? (
            <MainMenu
              current={current}
              themePreference={resolveThemePreference()}
              onNavigate={setView}
              onEditProfile={onEditProfile}
              onClose={onClose}
            />
          ) : null}

          {view === 'language' ? (
            <div className="mt-5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] p-4">
              <LanguageSwitcher fullWidth />
            </div>
          ) : null}

          {view === 'appearance' ? (
            <div className="mt-5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] p-4">
              <ThemeSwitcher layout="segmented" />
            </div>
          ) : null}

          {view === 'data' && current ? (
            <div className="mt-5 space-y-4">
              <ConfirmSummary draft={current} />
              {onDelete ? <DeleteProfileZone onDelete={onDelete} /> : null}
            </div>
          ) : null}

          {view === 'privacy' ? <PrivacyView /> : null}
          {view === 'help' ? <HelpView current={current} /> : null}
          {view === 'about' ? <AboutView /> : null}
        </div>

        <div
          className="shrink-0 border-t border-[var(--section-divider-color)] px-5 pt-3"
          style={{ paddingBottom: 'max(1rem, var(--tg-content-safe-area-inset-bottom, 0px))' }}
        >
          <button
            ref={closeRef}
            type="button"
            className="min-h-11 w-full rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
            onClick={onClose}
          >
            {t.settings.close}
          </button>
        </div>
      </aside>
    </div>
  );
}
