import { awardedShare, andersHistory, namedCountriesShare } from '../../../shared/anders-history';
import { CountryFlag } from '../../components/CountryFlag';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';

/** Official NAWA totals by year: the baseline that needs no community data. */
export function AndersHistoryCard() {
  const { t, locale } = useI18n();
  const copy = t.history;

  return (
    <section
      aria-labelledby="anders-history-title"
      className="mt-3 rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3"
    >
      <h3 id="anders-history-title" className="text-base font-semibold">
        {copy.title}
      </h3>
      <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-secondary)]">{copy.subtitle}</p>

      <ul className="m-0 mt-2 flex list-none flex-col gap-2.5 p-0">
        {andersHistory.map((entry) => {
          const percent = String(Math.round(awardedShare(entry) * 100));
          const named = namedCountriesShare(entry);
          return (
            <li key={`${entry.year}-${entry.level}`} className="text-sm">
              <p className="font-medium">
                {entry.year} · {copy.levels[entry.level]}
              </p>
              <p className="text-[var(--text-secondary)]">
                {copy.line(String(entry.awarded), String(entry.applications), percent)}
              </p>
              {entry.awardedByCountry ? (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--text-secondary)]">
                  {entry.awardedByCountry.map(([country, awarded]) => (
                    <span key={country} className="inline-flex items-center gap-1">
                      <CountryFlag code={country} size={14} />
                      {formatCountryLabel(country, locale)} {awarded}
                    </span>
                  ))}
                  {named != null ? <span>({Math.round(named * 100)}%)</span> : null}
                </p>
              ) : entry.largestCountries ? (
                <p className="text-[13px] text-[var(--text-secondary)]">
                  {copy.largest(entry.largestCountries.map((code) => formatCountryLabel(code, locale)).join(', '))}
                </p>
              ) : null}
              <a
                className="text-[13px] text-[var(--tg-theme-link-color)] underline underline-offset-2"
                href={entry.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {copy.source}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
