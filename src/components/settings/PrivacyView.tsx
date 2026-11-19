import { useI18n } from '../../i18n/context';

export function PrivacyView() {
  const { t } = useI18n();

  return (
    <div className="mt-5 space-y-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] p-4 text-sm leading-6">
      <p className="text-[var(--tg-theme-subtitle-text-color)]">{t.privacyNotice.body}</p>
      <ul className="space-y-2">
        {t.privacyNotice.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--color-accent-ink)]">
              •
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
