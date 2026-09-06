import { useState } from 'react';
import { useI18n } from '../i18n/context';
import { TrashIcon } from './icons';

type DeleteProfileZoneProps = {
  onDelete: () => Promise<void>;
  disabled?: boolean;
};

export function DeleteProfileZone({ onDelete, disabled = false }: DeleteProfileZoneProps) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await onDelete();
    } catch {
      setError(t.settings.deleteError);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="mt-8 rounded-2xl border-2 border-[var(--tg-theme-destructive-text-color)] bg-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_8%,var(--tg-theme-secondary-bg-color))] p-4"
      aria-labelledby="delete-zone-title"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_18%,transparent)] text-[var(--tg-theme-destructive-text-color)]"
          aria-hidden="true"
        >
          <TrashIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="delete-zone-title"
            className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--tg-theme-destructive-text-color)]"
          >
            {t.form.deleteZoneTitle}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--tg-theme-subtitle-text-color)]">
            {t.form.deleteZoneHint}
          </p>
        </div>
      </div>

      {!confirming ? (
        <button
          type="button"
          disabled={disabled}
          className="mt-4 min-h-11 w-full rounded-xl border border-[var(--tg-theme-destructive-text-color)] bg-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_12%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-destructive-text-color)] transition-colors hover:bg-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_20%,transparent)] active:bg-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_26%,transparent)] disabled:opacity-50"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          {t.settings.deleteData}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">
            {t.settings.deleteConfirmTitle}
          </p>
          <p className="text-sm leading-relaxed text-[var(--tg-theme-subtitle-text-color)]">
            {t.settings.deleteConfirmBody}
          </p>
          {error ? (
            <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={disabled || pending}
            className="min-h-11 w-full rounded-xl bg-[var(--tg-theme-destructive-text-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-50"
            onClick={() => void handleDelete()}
          >
            {pending ? '…' : t.form.deleteConfirmPermanent}
          </button>
          <button
            type="button"
            disabled={pending}
            className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-bg-color)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
          >
            {t.settings.deleteCancel}
          </button>
        </div>
      )}
    </section>
  );
}
