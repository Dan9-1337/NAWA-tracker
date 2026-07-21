import { useId, useState } from 'react';
import { useI18n } from '../i18n/context';

export const PRIVACY_NOTICE_VERSION = '2026-07-21';

type PrivacyNoticeProps = {
  /** When provided, renders as a required acknowledgement gate instead of a static notice. */
  onAccept?: (acceptedAt: string) => void;
};

export function PrivacyNotice({ onAccept }: PrivacyNoticeProps) {
  const { t } = useI18n();
  const [acknowledged, setAcknowledged] = useState(false);
  const checkboxId = useId();

  return (
    <aside
      aria-labelledby="privacy-notice-title"
      className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 text-amber-950 shadow-sm"
    >
      <h2 id="privacy-notice-title" className="text-lg font-semibold">{t.privacyNotice.title}</h2>
      <p className="mt-2 text-sm leading-6">{t.privacyNotice.body}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {t.privacyNotice.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {onAccept ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-amber-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor={checkboxId} className="flex items-center gap-2 text-sm font-medium">
            <input
              id={checkboxId}
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="h-4 w-4 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
            />
            {t.wizard.privacyAccept}
          </label>
          <button
            type="button"
            disabled={!acknowledged}
            onClick={() => onAccept(new Date().toISOString())}
            className="inline-flex items-center justify-center rounded-full bg-amber-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            {t.wizard.privacyStart}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
