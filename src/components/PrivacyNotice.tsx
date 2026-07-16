import { useI18n } from '../i18n/context';

export function PrivacyNotice() {
  const { t } = useI18n();

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
    </aside>
  );
}
