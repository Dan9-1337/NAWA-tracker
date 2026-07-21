import { useState } from 'react';
import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { isCountryCode } from '../../../shared/countries';
import { PositionGlance } from '../../components/PositionGlance';
import { ScorePositionChart } from '../../components/ScorePositionChart';
import { StatCard } from '../../components/StatCard';
import { useI18n } from '../../i18n/context';
import { formatGrade } from '../../lib/format';
import {
  formatPercentileValue,
  getCohortProgressCount,
  getMedianBand,
  getReliabilityLevel,
  isDetailedCohort,
  MIN_DETAILED_COHORT,
} from '../../lib/stats-verdict';

export type StatisticsState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'suppressed'; data: StatisticsResult }
  | { status: 'success'; data: StatisticsResult };

type StatisticsPanelProps = {
  state: StatisticsState;
  profile?: ResponseFormInput | null;
  userScore?: number | null;
};

export function statisticsStateFromResult(data: StatisticsResult): StatisticsState {
  return data.detailsAvailable ? { status: 'success', data } : { status: 'suppressed', data };
}

function heroVerdict(
  t: ReturnType<typeof useI18n>['t'],
  lowerScorePercentage: number | null,
  groupSize: number,
): string {
  if (lowerScorePercentage == null) return t.stats.unavailable;

  const band = getMedianBand(lowerScorePercentage);
  if (!isDetailedCohort(groupSize)) {
    if (band === 'above') return t.stats.heroUpperPart;
    if (band === 'below') return t.stats.heroLowerPart;
    return t.stats.heroAround;
  }

  if (lowerScorePercentage >= 90) return t.stats.heroTopDecile;
  if (lowerScorePercentage >= 67) return t.stats.heroUpperThird;
  if (lowerScorePercentage <= 10) return t.stats.heroBottomDecile;
  if (lowerScorePercentage <= 33) return t.stats.heroLowerThird;
  if (band === 'above') return t.stats.heroAbove;
  if (band === 'below') return t.stats.heroBelow;
  return t.stats.heroAround;
}

function supportCopy(
  t: ReturnType<typeof useI18n>['t'],
  lowerScorePercentage: number | null,
  groupSize: number,
): { primary: string | null; note: string | null } {
  if (lowerScorePercentage == null) return { primary: null, note: null };

  const band = getMedianBand(lowerScorePercentage);
  if (!isDetailedCohort(groupSize)) {
    const primary =
      band === 'above'
        ? t.stats.supportAboveMost
        : band === 'below'
          ? t.stats.supportBelowMost
          : t.stats.supportAroundMost;
    return { primary, note: t.stats.positionMayChange };
  }

  const percentage = formatPercentileValue(lowerScorePercentage, groupSize);
  return { primary: t.stats.percentileSupport(String(percentage)), note: null };
}

function reliabilityShort(t: ReturnType<typeof useI18n>['t'], groupSize: number): string {
  const level = getReliabilityLevel(groupSize);
  if (level === 'low') return t.stats.reliabilityShortLow;
  if (level === 'medium') return t.stats.reliabilityShortMedium;
  return t.stats.reliabilityShortHigh;
}

function reliabilityHint(t: ReturnType<typeof useI18n>['t'], groupSize: number): string {
  const level = getReliabilityLevel(groupSize);
  if (level === 'low') return t.stats.reliabilityLow;
  if (level === 'medium') return t.stats.reliabilityMedium;
  return t.stats.reliabilityHigh;
}

export function StatisticsPanel({ state, profile, userScore }: StatisticsPanelProps) {
  const { t, locale } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const titleId = 'statistics-hero';
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;
  const groupSize = data?.groupResponseCount ?? 0;
  const progressCount = data ? getCohortProgressCount(data) : 0;
  const detailed = isDetailedCohort(groupSize);
  const percentage =
    data?.lowerScorePercentage != null
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;

  const schoolCountry =
    profile && isCountryCode(profile.schoolCountry) ? t.countries[profile.schoolCountry] : profile?.schoolCountry;

  if (state.status === 'unavailable') {
    return (
      <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
        {t.stats.unavailable}
      </p>
    );
  }

  if (state.status === 'loading') {
    return (
      <p
        className="text-sm text-[var(--tg-theme-subtitle-text-color)]"
        role="status"
        aria-label={t.stats.loadingAriaLabel}
        aria-live="polite"
      >
        {t.stats.loading}
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <p
        className="text-sm text-[var(--tg-theme-destructive-text-color)]"
        role="alert"
        aria-label={t.stats.errorAriaLabel}
      >
        {t.stats.error}
      </p>
    );
  }

  if (!data || !profile) return null;

  if (state.status === 'suppressed') {
    return (
      <section aria-labelledby={titleId} className="space-y-2" role="region">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
          {t.stats.heroLabel}
        </p>
        <h2 id={titleId} className="text-2xl font-semibold leading-tight tracking-tight">
          {t.stats.suppressedTitle}
        </h2>
        <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">
          {t.stats.suppressedCurrent(String(progressCount))} ·{' '}
          {t.stats.suppressedRemaining(String(Math.max(0, MIN_DETAILED_COHORT - progressCount)))}
        </p>
        <p className="text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.unofficialNote}</p>
      </section>
    );
  }

  const band = getMedianBand(data.lowerScorePercentage);
  const support = supportCopy(t, data.lowerScorePercentage, groupSize);

  return (
    <section aria-labelledby={titleId} className="space-y-0" role="region">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
          {t.stats.heroLabel}
        </p>
        <h2
          id={titleId}
          className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-[var(--text-primary)]"
        >
          {heroVerdict(t, data.lowerScorePercentage, groupSize)}
        </h2>

        {support.primary ? (
          <p className="text-base leading-snug text-[var(--text-secondary)]">{support.primary}</p>
        ) : null}
        {support.note ? (
          <p className="text-sm leading-snug text-[var(--tg-theme-subtitle-text-color)]">{support.note}</p>
        ) : null}
        <p className="text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.unofficialNote}</p>
      </div>

      {band !== 'unknown' && data.lowerScorePercentage != null ? (
        <div className="mt-3">
          {detailed ? (
            <PositionGlance mode="percentile" percentage={data.lowerScorePercentage} />
          ) : (
            <PositionGlance mode="band" band={band} />
          )}
        </div>
      ) : null}

      <hr className="section-divider" />

      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 rounded-xl py-1 text-left active:opacity-70"
        aria-expanded={showWhy}
        aria-label={t.stats.cohortWhy}
        onClick={() => setShowWhy((value) => !value)}
      >
        <span className="min-w-0 space-y-1">
          <span className="block text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
            {t.stats.cohortCompareLabel}
          </span>
          <span className="block text-sm font-medium leading-snug">
            {[t.choices.scholarshipTrack[profile.scholarshipTrack], schoolCountry].filter(Boolean).join(' · ')}
          </span>
          <span className="block text-sm leading-snug text-[var(--tg-theme-subtitle-text-color)]">
            {[t.choices.studyRoute[profile.studyRoute], t.stats.cohortResponses(String(groupSize))]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {showWhy ? (
            <span className="mt-2 block text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">
              {t.stats.cohortWhyBody}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 pt-5 text-[var(--tg-theme-hint-color)]" aria-hidden="true">
          ›
        </span>
      </button>

      <hr className="section-divider" />

      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 rounded-xl py-1 text-left active:opacity-70"
        aria-expanded={showDetails}
        onClick={() => setShowDetails((value) => !value)}
      >
        <span className="min-w-0 space-y-1">
          <span className="block text-sm font-medium">
            {t.stats.reliabilityLabel}: {reliabilityShort(t, groupSize)}
          </span>
          <span className="block text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">
            {reliabilityHint(t, groupSize)}
          </span>
        </span>
        <span className="shrink-0 pt-0.5 text-[var(--tg-theme-hint-color)]" aria-hidden="true">
          ›
        </span>
      </button>

      {showDetails ? (
        <div className="mt-3 space-y-3 border-t border-[var(--section-divider-color)] pt-3">
          {percentage != null ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {t.stats.percentileSupport(String(percentage))}
            </p>
          ) : null}

          {userScore != null ? (
            <ScorePositionChart userScore={userScore} medianScore={data.medianScore} />
          ) : null}

          <div className="space-y-2">
            <StatCard label={t.stats.groupResponseCount} value={String(data.groupResponseCount)} />
            {data.medianScore != null ? (
              <StatCard
                label={t.stats.percentileLabel}
                value={t.stats.medianSentence(formatGrade(data.medianScore, locale))}
              />
            ) : null}
            <StatCard label={t.stats.totalResponses} value={String(data.totalValidResponses)} />
          </div>

          <p className="text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.cohortWhyBody}</p>
          <p className="text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.stats.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
