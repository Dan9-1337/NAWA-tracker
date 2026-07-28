import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { ConfirmSummary } from '../features/ConfirmSummary';
import { useI18n } from '../i18n/context';
import { getStoredThemePreference, type ThemePreference } from '../lib/theme';
import { getTelegramWebApp } from '../lib/telegram';
import {
  ChevronIcon,
  DocumentIcon,
  GlobeIcon,
  PaletteIcon,
  ShieldIcon,
  UserEditIcon,
} from './icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

type SettingsView = 'menu' | 'data' | 'privacy' | 'language' | 'appearance';

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  current: ResponseFormInput | null;
  onEditProfile?: () => void;
};

function resolveThemePreference(): ThemePreference {
  const stored = getStoredThemePreference();
  if (stored) return stored;
  return getTelegramWebApp()?.colorScheme === 'dark' ? 'dark' : 'light';
}

function SettingsMenuGroup({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--tg-theme-secondary-bg-color)]">
      <div className="divide-y divide-[var(--section-divider-color)]">{children}</div>
    </div>
  );
}

function SettingsMenuIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tg-theme-bg-color)] text-[var(--color-accent)]">
      {children}
    </span>
  );
}

function SettingsMenuRow({
  label,
  value,
  onClick,
  icon,
}: {
  label: string;
  value?: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[3.25rem] items-center gap-3 px-4 py-3 text-left text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_18%,transparent)]"
    >
      <SettingsMenuIcon>{icon}</SettingsMenuIcon>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{label}</span>
      {value ? (
        <span className="shrink-0 text-sm text-[var(--tg-theme-subtitle-text-color)]">{value}</span>
      ) : null}
      <ChevronIcon className="shrink-0 text-[var(--tg-theme-hint-color)]" />
    </button>
  );
}

export function SettingsSheet({ open, onClose, current, onEditProfile }: SettingsSheetProps) {
  const { t, locale } = useI18n();
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
  const themePreference = resolveThemePreference();
  const title =
    view === 'data'
      ? t.settings.viewData
      : view === 'privacy'
        ? t.settings.privacyPolicy
        : view === 'language'
          ? t.settings.language
          : view === 'appearance'
            ? t.settings.appearance
            : t.settings.title;

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
              {title}
            </h2>
          </div>

          {view === 'menu' ? (
            <div className="mt-5 space-y-3">
              <SettingsMenuGroup>
                {onEditProfile ? (
                  <SettingsMenuRow
                    label={t.settings.editProfile}
                    icon={<UserEditIcon size={17} />}
                    onClick={() => {
                      onClose();
                      onEditProfile();
                    }}
                  />
                ) : null}
                <SettingsMenuRow
                  label={t.settings.viewData}
                  icon={<DocumentIcon size={17} />}
                  onClick={() => setView('data')}
                />
                <SettingsMenuRow
                  label={t.settings.privacyPolicy}
                  icon={<ShieldIcon size={17} />}
                  onClick={() => setView('privacy')}
                />
                <SettingsMenuRow
                  label={t.settings.language}
                  value={t.language[locale]}
                  icon={<GlobeIcon size={17} />}
                  onClick={() => setView('language')}
                />
                <SettingsMenuRow
                  label={t.settings.appearance}
                  value={themePreference === 'dark' ? t.theme.dark : t.theme.light}
                  icon={<PaletteIcon size={17} />}
                  onClick={() => setView('appearance')}
                />
              </SettingsMenuGroup>
            </div>
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
            <div className="mt-5">
              <ConfirmSummary draft={current} />
            </div>
          ) : null}

          {view === 'privacy' ? (
            <div className="mt-5 space-y-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] p-4 text-sm leading-6">
              <p className="text-[var(--tg-theme-subtitle-text-color)]">{t.privacyNotice.body}</p>
              <ul className="space-y-2">
                {t.privacyNotice.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="text-[var(--color-accent)]">
                      •
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
