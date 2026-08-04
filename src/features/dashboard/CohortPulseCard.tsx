import type { GlobalBenchmark, StatisticsGrowth7d, StatisticsResult } from '../../../shared/contracts';
import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';

type CohortPulseCardProps = {
  growth: StatisticsGrowth7d | null;
  globalBenchmark: GlobalBenchmark;
  reportedMeritOutcomes: StatisticsResult['reportedMeritOutcomes'];
  rankingCountryLabel: string;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-3';

function medianDeltaLine(
  t: ReturnType<typeof useI18n>['t'],
  locale: string,
  then: number | null,
  now: number | null,
): string | null {
  if (then == null || now == null) return null;
  const delta = Math.round((now - then) * 10) / 10;
  if (Math.abs(delta) < 0.05) return t.dashboard.cohortPulse.medianStable;
  return t.dashboard.cohortPulse.medianDelta(
    delta > 0 ? `+${formatScore(delta, locale)}` : `−${formatScore(Math.abs(delta), locale)}`,
  );
}

export function CohortPulseCard({
  growth,
  globalBenchmark,
  reportedMeritOutcomes,
  rankingCountryLabel,
}: CohortPulseCardProps) {
  const { t, locale } = useI18n();

  const countryLines: string[] = [];
  if (growth) {
    if (growth.newResponsesInGroup > 0) {
      countryLines.push(t.dashboard.cohortPulse.newApps(String(growth.newResponsesInGroup)));
    }
    if (growth.statusUpdatesInGroup > 0) {
      countryLines.push(
        t.dashboard.cohortPulse.statusUpdates(String(growth.statusUpdatesInGroup)),
      );
    }
    const medianLine = medianDeltaLine(t, locale, growth.medianThen, growth.medianNow);
    if (medianLine) countryLines.push(medianLine);
  }

  const meritCount =
    (reportedMeritOutcomes?.positiveCount ?? 0) + (reportedMeritOutcomes?.negativeCount ?? 0);
  if (meritCount > 0 && (growth?.newResponsesInGroup ?? 0) > 0) {
    countryLines.push(t.dashboard.cohortPulse.firstMeritOutcomes);
  }

  const programLines: string[] = [];
  if (globalBenchmark.sampleSize != null) {
    programLines.push(t.dashboard.cohortPulse.programApps(String(globalBenchmark.sampleSize)));
  }
  if (globalBenchmark.representedCountryCount != null) {
    programLines.push(
      t.dashboard.cohortPulse.programCountries(String(globalBenchmark.representedCountryCount)),
    );
  }
  if (globalBenchmark.detailedCountriesCount != null) {
    programLines.push(
      t.dashboard.cohortPulse.detailedCountries(String(globalBenchmark.detailedCountriesCount)),
    );
  }
  if (growth && growth.trackNewResponses > 0) {
    programLines.push(t.dashboard.cohortPulse.weekNewApps(String(growth.trackNewResponses)));
  }

  if (countryLines.length === 0 && programLines.length === 0) return null;

  return (
    <section className={cardClass} aria-label={t.dashboard.cohortPulse.title}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {t.dashboard.cohortPulse.title}
        </h2>
        <DataSourceBadge source="global_sample" />
      </div>

      {countryLines.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-helper)]">
            {t.dashboard.cohortPulse.countryTitle(rankingCountryLabel)}
          </p>
          <ul className="space-y-0.5 text-sm text-[var(--text-primary)]">
            {countryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {programLines.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-helper)]">
            {t.dashboard.cohortPulse.programTitle}
          </p>
          <ul className="space-y-0.5 text-sm text-[var(--text-secondary)]">
            {programLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">
        {t.dashboard.cohortPulse.disclaimer}
      </p>
    </section>
  );
}
