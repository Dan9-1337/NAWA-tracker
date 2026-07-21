import { useId } from 'react';
import { useI18n } from '../i18n/context';

type PrivacyNoticeProps = {
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
};

export function PrivacyNotice({ acknowledged, onAcknowledgedChange }: PrivacyNoticeProps) {
  const { t } = useI18n();
  const checkboxId = useId();

  return (
    <aside
      aria-labelledby="privacy-notice-title"
      className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-5"
    >
      <h2 id="privacy-notice-title" className="text-lg font-semibold">
        {t.privacyNotice.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">{t.privacyNotice.body}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {t.privacyNotice.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <label htmlFor={checkboxId} className="mt-5 flex items-center gap-2 text-sm font-medium">
        <input
          id={checkboxId}
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => onAcknowledgedChange(event.target.checked)}
          className="h-4 w-4"
        />
        {t.wizard.privacyAccept}
      </label>
    </aside>
  );
}
