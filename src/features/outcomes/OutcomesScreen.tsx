import { useCallback, useEffect, useState } from 'react';
import type { CohortOutcomesResult } from '../../../shared/contracts';
import { CountryFlag } from '../../components/CountryFlag';
import { useI18n } from '../../i18n/context';
import { getCohortOutcomes } from '../../lib/api-client';
import { cohortLabel } from '../../lib/cohort-label';
import {
  awardedBand,
  outcomeAxisPosition,
  outcomeAxisTicks,
  relateToOutcome,
} from '../../lib/country-outcomes';
import { formatPrecise, formatScore } from '../../lib/format';
import { season2026 } from '../../../shared/season';
import { AndersHistoryCard } from './AndersHistoryCard';
import { PrepCitiesCard } from './PrepCitiesCard';

const INK = '#14161a';
const TAPE_PALE = '#f4e6a6';

const tickBackground = [
  `linear-gradient(90deg, ${INK} 1px, transparent 1px) 0 100% / 2.5% 7px repeat-x`,
  `linear-gradient(90deg, ${INK} 1.5px, transparent 1.5px) 0 100% / 25% 13px repeat-x`,
].join(', ');

type OutcomesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: CohortOutcomesResult };

type OutcomesScreenProps = {
  /** The user's saved orientation score, or null when it cannot be computed. */
  userScore: number | null;
  /** True for preparatory-course applicants, who can see where reporters in their field were sent. */
  showPrepCities?: boolean;
};

function pct(position: number): string {
  return `${position * 100}%`;
}

type CohortTapeProps = {
  label: string;
  ownCountry: string;
  showFlag: boolean;
  outcome: CohortOutcomesResult;
  band: { low: number; high: number };
  userScore: number | null;
};

function CohortTape({ label, ownCountry, showFlag, outcome, band, userScore }: CohortTapeProps) {
  const { t, locale } = useI18n();
  const copy = t.outcomes;
  const low = formatScore(band.low, locale);
  const high = formatScore(band.high, locale);
  const lowPos = outcomeAxisPosition(band.low);
  const highPos = outcomeAxisPosition(band.high);

  return (
    <div className="rounded-2xl border-2 border-[var(--text-primary)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-base font-semibold">
          {showFlag ? <CountryFlag code={ownCountry} size={18} /> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-[13px] text-[var(--text-secondary)]">
          {copy.awardedLine(String(outcome.awardedCount))}
        </span>
      </div>

      <div
        role="img"
        aria-label={copy.tapeLabel(label, low, high)}
        className="relative mt-[18px] h-7 rounded"
        style={{ background: TAPE_PALE }}
      >
        <div
          className="absolute bottom-0 top-0"
          style={{
            left: pct(lowPos),
            width: pct(Math.max(highPos - lowPos, 0.01)),
            background: 'var(--color-accent)',
          }}
        />
        <div className="absolute inset-0" style={{ background: tickBackground }} />
        {userScore != null ? (
          <div
            className="absolute -top-[19px] flex -translate-x-1/2 flex-col items-center"
            style={{ left: pct(outcomeAxisPosition(userScore)) }}
          >
            <span className="text-xs font-semibold leading-none">{copy.you}</span>
            <span
              className="mt-0.5 block h-0 w-0"
              style={{
                borderLeft: '6.5px solid transparent',
                borderRight: '6.5px solid transparent',
                borderTop: '9px solid var(--text-primary)',
              }}
            />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{copy.rangeCaption(low, high)}</p>
      {outcome.notAwardedBandHigh != null ? (
        <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
          {copy.notAwardedCaption(formatScore(outcome.notAwardedBandHigh, locale))}
        </p>
      ) : null}
      {outcome.notAwardedCount > 0 ? (
        <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
          {copy.notAwardedLine(String(outcome.notAwardedCount))}
          {outcome.awardedRate != null ? ` · ${copy.rateLine(String(Math.round(outcome.awardedRate * 100)))}` : ''}
        </p>
      ) : null}
    </div>
  );
}

export function OutcomesScreen({ userScore, showPrepCities = false }: OutcomesScreenProps) {
  const { t, locale } = useI18n();
  const copy = t.outcomes;
  const [state, setState] = useState<OutcomesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getCohortOutcomes().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const header = (
    <>
      <h2 className="font-display text-[34px] font-semibold leading-[1.1]">
        {copy.title(String(season2026.year))}
      </h2>
      <p className="mt-0.5 text-sm leading-snug text-[var(--text-secondary)]">{copy.subtitle}</p>
    </>
  );

  if (state.status === 'loading') {
    return (
      <section aria-busy="true">
        {header}
        <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status" aria-live="polite">
          {copy.loading}
        </p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section>
        {header}
        <div className="mt-4 space-y-1" role="alert">
          <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">{copy.error}</p>
          <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-2" onClick={retry}>
            {copy.retry}
          </button>
        </div>
        <AndersHistoryCard />
      </section>
    );
  }

  const outcome = state.data;
  const band = awardedBand(outcome);
  const label = cohortLabel(t, locale, outcome.scope, outcome.ownCountry, outcome.groupId);

  let banner: string;
  if (band && userScore != null) {
    const args = [label, formatPrecise(userScore, locale), formatScore(band.low, locale), formatScore(band.high, locale)] as const;
    const relation = relateToOutcome(userScore, band);
    banner =
      relation === 'inside'
        ? copy.bannerInside(...args)
        : relation === 'below'
          ? copy.bannerBelow(...args)
          : copy.bannerAbove(...args);
  } else {
    banner = copy.bannerNoData(label);
  }

  return (
    <section>
      {header}

      <p
        className="mt-3 rounded-2xl px-4 py-3 text-sm leading-snug"
        style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
      >
        {banner}
      </p>

      {band ? (
        <>
          <div aria-hidden="true" className="relative mx-4 mt-3.5 h-[18px] text-xs tabular-nums text-[var(--text-secondary)]">
            {outcomeAxisTicks.map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2"
                style={{ left: pct(outcomeAxisPosition(tick)) }}
              >
                {tick}
              </span>
            ))}
          </div>
          <div className="mt-1">
            <CohortTape
              label={label}
              ownCountry={outcome.ownCountry}
              showFlag={outcome.scope === 'country'}
              outcome={outcome}
              band={band}
              userScore={userScore}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.empty}</p>
      )}

      <p className="mt-2.5 rounded-2xl bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-[13px] leading-snug text-[var(--text-secondary)]">
        {copy.legend}
      </p>

      {showPrepCities ? <PrepCitiesCard /> : null}

      <AndersHistoryCard />
    </section>
  );
}
