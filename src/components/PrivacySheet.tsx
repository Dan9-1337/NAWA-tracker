import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/context';
import { ChevronIcon } from './icons';

type PrivacySheetProps = {
  open: boolean;
  onClose: () => void;
};

export function PrivacySheet({ open, onClose }: PrivacySheetProps) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
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
  }, [onClose, open]);

  useEffect(() => {
    if (!open) setShowFullPolicy(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay-scrim)]" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-sheet-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--tg-theme-section-bg-color)] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="privacy-sheet-title" className="text-lg font-semibold">
          {t.privacyNotice.quickTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">
          {t.privacyNotice.quickBody}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">
          {t.privacyNotice.quickNoPersonalData}
        </p>

        <button
          type="button"
          className="disclosure-row mt-1"
          aria-expanded={showFullPolicy}
          onClick={() => setShowFullPolicy((value) => !value)}
        >
          <span className="disclosure-row__label">{t.privacyNotice.fullPolicyToggle}</span>
          <span className="disclosure-row__chevron">
            <ChevronIcon />
          </span>
        </button>

        {showFullPolicy ? (
          <div className="mt-1">
            <p className="text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">{t.privacyNotice.body}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              {t.privacyNotice.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          ref={closeRef}
          type="button"
          className="mt-5 min-h-11 w-full rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
          onClick={onClose}
        >
          {t.privacyNotice.close}
        </button>
      </aside>
    </div>
  );
}
