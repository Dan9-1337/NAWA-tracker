import { useI18n } from '../../i18n/context';
import { getAppVersion } from '../../lib/app-version';

export function AboutView() {
  const { t } = useI18n();
  const sections = [
    [t.about.title, t.about.intro],
    [t.about.capabilitiesTitle, t.about.capabilitiesBody],
    [t.about.dataTitle, t.about.dataBody],
    [t.about.officialTitle, t.about.officialBody],
    [t.about.privacyTitle, t.about.privacyBody],
    [t.about.metricsTitle, t.about.metricsBody],
    [t.about.authorTitle, t.about.authorBody],
  ] as const;

  return (
    <div className="mt-5 space-y-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
      {sections.map(([title, body]) => (
        <section key={title} className="space-y-1.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          <p>{body}</p>
        </section>
      ))}
      <p className="text-sm text-[var(--text-helper)]">{t.about.version(getAppVersion())}</p>
    </div>
  );
}
