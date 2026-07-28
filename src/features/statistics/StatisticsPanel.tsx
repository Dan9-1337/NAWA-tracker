import { useState } from 'react';
import type { ResponseFormInput, StatisticsResult } from '../../../shared/contracts';
import { PositionHistoryList } from '../../components/PositionHistoryList';
import { ChevronIcon } from '../../components/icons';
import { ScoreDensityStrip } from '../../components/ScoreDensityStrip';
import { ScorePositionChart } from '../../components/ScorePositionChart';
import { WeeklyActivityBlock } from '../../components/SinceLastVisitCard';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import type { StatsSnapshot } from '../../lib/stats-snapshot';
import { canShowScoreDistribution } from '../../lib/score-buckets';
import { getTelegramWebApp } from '../../lib/telegram';
import {
  formatPercentileValue,
  getCohortProgressCount,
  getMedianBand,
  getReliabilityLevel,
  MIN_DETAILED_COHORT,
  QUALITATIVE_COHORT_MAX,
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
  previousSnapshot?: StatsSnapshot | null;
};

export function statisticsStateFromResult(data: StatisticsResult): StatisticsState {
  return data.detailsAvailable ? { status: 'success', data } : { status: 'suppressed', data };
}

function medianBandLabel(t: ReturnType<typeof useI18n>['t'], lowerScorePercentage: number | null): string | null {
  const band = getMedianBand(lowerScorePercentage);
  if (band === 'above') return t.stats.heroAbove;
  if (band === 'below') return t.stats.heroBelow;
  if (band === 'around') return t.stats.heroAround;
  return null;
}

function reliabilityShortLabel(t: ReturnType<typeof useI18n>['t'], groupSize: number): string {
  const level = getReliabilityLevel(groupSize);
  if (level === 'low') return t.stats.reliabilityShortLow;
  if (level === 'medium') return t.stats.reliabilityShortMedium;
  return t.stats.reliabilityShortHigh;
}

function reliabilityHint(t: ReturnType<typeof useI18n>['t'], groupSize: number): string {
  const level = getReliabilityLevel(groupSize);
  if (level === 'low') return t.stats.reliabilityLow(String(groupSize));
  if (level === 'medium') return t.stats.reliabilityMedium(String(groupSize));
  return t.stats.reliabilityHigh(String(groupSize));
}

function heroVerdict(
  t: ReturnType<typeof useI18n>['t'],
  lowerScorePercentage: number | null,
  groupSize: number,
): string {
  if (lowerScorePercentage == null) return t.stats.unavailable;

  const band = getMedianBand(lowerScorePercentage);
  if (groupSize < MIN_DETAILED_COHORT) {
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

function heroMedianContext(
  t: ReturnType<typeof useI18n>['t'],
  lowerScorePercentage: number | null,
  groupSize: number,
): string | null {
  if (lowerScorePercentage == null || groupSize < MIN_DETAILED_COHORT) return null;

  const band = getMedianBand(lowerScorePercentage);
  const count = String(groupSize);
  if (band === 'above') return t.stats.heroMedianAbove(count);
  if (band === 'below') return t.stats.heroMedianBelow(count);
  if (band === 'around') return t.stats.heroMedianAround(count);
  return null;
}

export function StatisticsPanel({ state, profile, userScore, previousSnapshot }: StatisticsPanelProps) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const titleId = 'statistics-hero';
  const data = state.status === 'success' || state.status === 'suppressed' ? state.data : null;
  const groupSize = data?.groupResponseCount ?? 0;
  const progressCount = data ? getCohortProgressCount(data) : 0;
  const showDistribution = data ? canShowScoreDistribution(groupSize, data.scoreBuckets) : false;

  const schoolCountry = formatCountryLabel(profile?.schoolCountry, t.countries);

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

  const percentileValue =
    data.lowerScorePercentage != null && groupSize >= MIN_DETAILED_COHORT
      ? formatPercentileValue(data.lowerScorePercentage, groupSize)
      : null;
  const medianBadge = medianBandLabel(t, data.lowerScorePercentage);
  const medianContext = heroMedianContext(t, data.lowerScorePercentage, groupSize);
  const reliabilityShort = reliabilityShortLabel(t, groupSize);
  const reliabilityLevel = getReliabilityLevel(groupSize);
  const trackLabel = t.choices.scholarshipTrack[profile.scholarshipTrack];
  const heroTitle =
    percentileValue != null
      ? t.stats.heroHeadline(String(percentileValue))
      : heroVerdict(t, data.lowerScorePercentage, groupSize);

  return (
    <section aria-labelledby={titleId} className="space-y-0" role="region">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <h2 id={titleId} className="text-2xl font-bold leading-tight tracking-tight text-[var(--text-primary)]">
            {heroTitle}
          </h2>
          {medianContext ? (
            <p className="text-sm leading-snug text-[var(--text-secondary)]">{medianContext}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {medianBadge ? <span className="stat-badge stat-badge--accent">{medianBadge}</span> : null}
          <span className="stat-badge stat-badge--reliability">{t.stats.reliabilityBadgeWithLevel(reliabilityShort)}</span>
        </div>

        <WeeklyActivityBlock previous={previousSnapshot ?? null} current={data} />
      </div>

      {showDistribution && userScore != null ? (
        <ScoreDensityStrip
          buckets={data.scoreBuckets!}
          track={profile.scholarshipTrack}
          userScore={userScore}
          medianScore={data.medianScore}
          groupSize={groupSize}
        />
      ) : null}

      <PositionHistoryList history={data.history} />

      <hr className="section-divider" />

      <button
        type="button"
        className="disclosure-row"
        aria-expanded={showWhy}
        onClick={() => setShowWhy((value) => !value)}
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
            {t.stats.cohortCompareLabel}
          </span>
          {!showWhy ? (
            <dl className="cohort-grid cohort-grid--stacked">
              <div className="cohort-grid__full">
                <dt>{t.stats.cohortFieldTrack}</dt>
                <dd>{trackLabel}</dd>
              </div>
              <div>
                <dt>{t.stats.cohortFieldCountry}</dt>
                <dd>{schoolCountry ?? t.stats.noValue}</dd>
              </div>
              <div>
                <dt>{t.stats.cohortFieldSize}</dt>
                <dd>{t.stats.cohortResponses(String(groupSize))}</dd>
              </div>
              <div className="cohort-grid__full">
                <dt>{t.stats.cohortFieldRoute}</dt>
                <dd>{t.choices.studyRoute[profile.studyRoute]}</dd>
              </div>
            </dl>
          ) : (
            <span className="mt-2 block text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">
              {t.stats.cohortWhyBody}
            </span>
          )}
        </span>
        <span className="disclosure-row__chevron">
          <ChevronIcon />
        </span>
      </button>

      <div className="disclosure-slot">
        <button
          type="button"
          className="disclosure-row disclosure-row--slot"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((value) => !value)}
        >
          <span className="disclosure-row__label">{t.stats.reliabilityWhyLabel(reliabilityShort)}</span>
          <span className="disclosure-row__chevron">
            <ChevronIcon />
          </span>
        </button>
      </div>

      {getTelegramWebApp()?.isTelegram && data.lowerScorePercentage != null ? (
        <div className="mt-3">
          <button
            type="button"
            className="w-full rounded-2xl border border-[var(--section-divider-color)] px-4 py-2.5 text-sm font-medium text-[var(--tg-theme-button-color)]"
            onClick={() => {
              const initData = getTelegramWebApp()?.initData;
              if (!initData) return;
              const url = `${window.location.origin}/api/share-card?initData=${encodeURIComponent(initData)}`;
              getTelegramWebApp()?.shareToStory(url, {
                text: heroTitle,
              });
            }}
          >
            {t.stats.shareToStory}
          </button>
          <p className="mt-1 text-xs text-[var(--tg-theme-subtitle-text-color)]">{t.stats.shareToStoryPremiumNote}</p>
        </div>
      ) : null}

      {showDetails ? (
        <div className="reliability-details">
          <p className="reliability-details__summary">{reliabilityHint(t, groupSize)}</p>

          {userScore != null ? (
            <ScorePositionChart userScore={userScore} medianScore={data.medianScore} variant="compact" />
          ) : null}

          <ul className="reliability-details__factors">
            <li>{t.stats.reliabilityFactorSize(String(groupSize))}</li>
            <li>{t.stats.reliabilityFactorQuality(String(groupSize))}</li>
            <li>{t.stats.reliabilityFactorStability}</li>
          </ul>

          {reliabilityLevel !== 'high' ? (
            <p className="reliability-details__threshold">
              {t.stats.reliabilityThreshold(String(QUALITATIVE_COHORT_MAX + 1))}
            </p>
          ) : null}

          <p className="reliability-details__disclaimer">{t.stats.disclaimerShort}</p>
        </div>
      ) : null}
    </section>
  );
}
