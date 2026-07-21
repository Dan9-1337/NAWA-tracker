import { useI18n } from '../i18n/context';

export function ResultPreviewCard() {
  const { t } = useI18n();

  return (
    <div
      className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] p-4"
      aria-hidden="true"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-helper)]">{t.start.previewCaption}</p>
      <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">{t.start.previewTitle}</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{t.start.previewVerdict}</p>
    </div>
  );
}
