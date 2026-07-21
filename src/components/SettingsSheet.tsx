import { useEffect, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { ConfirmSummary } from '../features/ConfirmSummary';
import { useI18n } from '../i18n/context';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  current: ResponseFormInput | null;
  onDelete: () => Promise<void>;
  onEditProfile?: () => void;
};

export function SettingsSheet({ open, onClose, current, onDelete, onEditProfile }: SettingsSheetProps) {
  const { t } = useI18n();
  const [view, setView] = useState<'menu' | 'data' | 'privacy' | 'confirm-delete'>('menu');
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setView('menu');
      setDeleteError(null);
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

  async function handleDelete() {
    setPending(true);
    setDeleteError(null);
    try {
      await onDelete();
      onClose();
    } catch {
      setDeleteError(t.settings.deleteError);
    } finally {
      setPending(false);
    }
  }

  const nested = view !== 'menu';
  const title =
    view === 'data'
      ? t.settings.viewData
      : view === 'privacy'
        ? t.settings.privacyPolicy
        : view === 'confirm-delete'
          ? t.settings.deleteConfirmTitle
          : t.settings.title;

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        aria-label={t.settings.close}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(85vh,var(--tg-viewport-stable-height,100dvh))] w-full max-w-md flex-col rounded-t-3xl bg-[var(--tg-theme-section-bg-color)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            {nested ? (
              <button
                ref={backRef}
                type="button"
                className="min-h-11 shrink-0 rounded-xl border border-[var(--tg-theme-hint-color)] px-3 text-sm font-semibold"
                onClick={() => {
                  setDeleteError(null);
                  setView('menu');
                }}
              >
                ← {t.settings.back}
              </button>
            ) : null}
            <h2 id="settings-title" className="min-w-0 flex-1 pt-2 text-lg font-semibold">
              {title}
            </h2>
          </div>

          {view === 'menu' ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                {onEditProfile ? (
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-left text-sm font-medium"
                    onClick={() => {
                      onClose();
                      onEditProfile();
                    }}
                  >
                    {t.settings.editProfile}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-left text-sm font-medium"
                  onClick={() => setView('data')}
                >
                  {t.settings.viewData}
                </button>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-left text-sm font-medium"
                  onClick={() => setView('privacy')}
                >
                  {t.settings.privacyPolicy}
                </button>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-destructive-text-color)] px-4 py-3 text-left text-sm font-medium text-[var(--tg-theme-destructive-text-color)]"
                  onClick={() => {
                    setDeleteError(null);
                    setView('confirm-delete');
                  }}
                >
                  {t.settings.deleteData}
                </button>
              </div>

              <div className="rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{t.settings.appearance}</span>
                  <ThemeSwitcher />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3">
                <p className="mb-3 text-sm font-medium">{t.settings.language}</p>
                <LanguageSwitcher />
              </div>
            </div>
          ) : null}

          {view === 'data' && current ? (
            <div className="mt-4">
              <ConfirmSummary draft={current} />
            </div>
          ) : null}

          {view === 'privacy' ? (
            <div className="mt-4 space-y-3 text-sm leading-6">
              <p className="text-[var(--tg-theme-subtitle-text-color)]">{t.privacyNotice.body}</p>
              <ul className="space-y-2">
                {t.privacyNotice.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {view === 'confirm-delete' ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-[var(--tg-theme-subtitle-text-color)]">{t.settings.deleteConfirmBody}</p>
              {deleteError ? (
                <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
                  {deleteError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={pending}
                className="min-h-11 w-full rounded-2xl bg-[var(--tg-theme-destructive-text-color)] px-4 py-3 font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-50"
                onClick={() => void handleDelete()}
              >
                {pending ? '…' : t.settings.deleteConfirm}
              </button>
              <button
                type="button"
                disabled={pending}
                className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 font-semibold disabled:opacity-50"
                onClick={() => setView('menu')}
              >
                {t.settings.deleteCancel}
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="shrink-0 border-t border-[var(--tg-theme-hint-color)] px-5 pt-3"
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
