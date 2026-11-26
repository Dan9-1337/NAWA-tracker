import { useEffect, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../../shared/contracts';
import { nawaOrientationThreshold } from '../../../shared/nawa-score';
import { ScoreTape } from '../../components/ScoreTape';
import { useI18n } from '../../i18n/context';
import { formatGrade, formatPrecise, parseLocalizedNumber } from '../../lib/format';
import { canShowScoreDistribution, percentileBand } from '../../lib/score-buckets';
import {
  AVERAGE_STEP,
  averageAfterDrag,
  clampAverage,
  scoreForAverage,
  stepAverage,
} from '../../lib/score-tape';
import { getTelegramWebApp } from '../../lib/telegram';
import type { StatisticsState } from '../statistics/StatisticsPanel';
import { ThresholdChip } from './ThresholdChip';

type ScoreScreenProps = {
  current: ResponseFormInput;
  statistics: StatisticsState;
  /** The country `ориентир 2026`; a fixed mark on the ruler while the user drags (ADR 0017). */
  orientationMark?: number | null;
  /** Called when the user moves the average away from the saved one. The dashboard decides how often it is recorded. */
  onWhatIfUsed?: () => void;
};

/**
 * The what-if block: the tape, the score row (the saved score until the ruler moves), the average input and,
 * only while a what-if is active, the saved-score line, reset, percentile band and note.
 * Nothing here touches the saved card.
 */
export function ScoreScreen({ current, statistics, orientationMark, onWhatIfUsed }: ScoreScreenProps) {
  const { t, locale } = useI18n();
  const copy = t.scoreScreen;
  const maximumGrade = current.maximumGrade;
  const profile = {
    maximumGrade,
    polishSchoolLevel: current.polishSchoolLevel ?? 'none',
    rankingCountry: current.rankingCountry,
  } as const;

  const [average, setAverage] = useState(current.averageGrade);
  const [text, setText] = useState(() => formatGrade(current.averageGrade, locale));
  const [inputError, setInputError] = useState(false);
  const dragStartAverage = useRef(current.averageGrade);
  /** True while `average` is changing because of the text field, so the field keeps what was typed. */
  const typedChange = useRef(false);

  useEffect(() => {
    setAverage(current.averageGrade);
  }, [current.averageGrade]);

  useEffect(() => {
    if (typedChange.current) {
      typedChange.current = false;
      return;
    }
    setText(formatGrade(average, locale));
    setInputError(false);
  }, [average, locale]);

  const threshold = nawaOrientationThreshold;
  const savedScore = scoreForAverage(current.averageGrade, profile);
  const score = scoreForAverage(average, profile);
  const isWhatIf = average !== current.averageGrade;

  const statsData = statistics.status === 'success' ? statistics.data : null;
  const band =
    isWhatIf &&
    statsData &&
    statsData.detailsAvailable &&
    canShowScoreDistribution(statsData.scoreBuckets)
      ? percentileBand(score, statsData.scoreBuckets, current.scholarshipTrack)
      : null;

  function applyAverage(next: number) {
    if (next === average) return;
    if (next !== current.averageGrade) onWhatIfUsed?.();
    const haptic = getTelegramWebApp()?.haptic;
    if (scoreForAverage(next, profile) >= threshold !== score >= threshold) {
      haptic?.impact('medium');
    } else {
      haptic?.selection();
    }
    setAverage(next);
  }

  function commitText(raw: string) {
    setText(raw);
    const parsed = parseLocalizedNumber(raw);
    if (parsed === null || parsed < 0 || parsed > maximumGrade) {
      setInputError(true);
      return;
    }
    setInputError(false);
    const next = Math.round(clampAverage(parsed, maximumGrade) * 100) / 100;
    if (next !== average) {
      if (next !== current.averageGrade) onWhatIfUsed?.();
      typedChange.current = true;
      setAverage(next);
    }
  }

  return (
    <section className="space-y-0" aria-label={copy.whatIfLabel} data-testid="what-if-block">
      <p className="text-sm text-[var(--text-secondary)]">{copy.whatIfLabel}</p>

      <div className="-mx-4 mt-4">
        <ScoreTape
          score={score}
          threshold={threshold}
          ariaLabel={copy.tapeAriaLabel(formatPrecise(score, locale), String(threshold))}
          thresholdLabel={copy.thresholdFlag(String(threshold))}
          referenceMark={
            orientationMark != null
              ? { value: orientationMark, label: copy.orientationMarkLabel }
              : null
          }
          onDragStart={() => {
            dragStartAverage.current = average;
          }}
          onDrag={(dx) => applyAverage(averageAfterDrag(dragStartAverage.current, dx, maximumGrade))}
          onStep={(steps) => applyAverage(stepAverage(average, steps, maximumGrade))}
        />
      </div>
      <p className="-mt-1 text-center text-sm text-[var(--text-secondary)]">
        {copy.tapeHint(formatPrecise(AVERAGE_STEP, locale))}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="what-if-result">
        <span
          className="font-display text-[40px] font-semibold leading-[0.95] tracking-[-0.02em] tabular-nums"
          data-testid="what-if-score-value"
        >
          {formatPrecise(score, locale)}
        </span>
        <span className="font-display text-[18px] font-medium text-[var(--text-secondary)]">
          {copy.scaleMax}
        </span>
        <ThresholdChip score={score} size="small" testId="what-if-threshold-chip" />
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3">
        <label htmlFor="what-if-average" className="text-sm text-[var(--text-secondary)]">
          {copy.averageInputLabel}
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            aria-label={copy.decrease}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--section-divider-color)] text-xl font-semibold active:opacity-70"
            onClick={() => applyAverage(stepAverage(average, -1, maximumGrade))}
          >
            −
          </button>
          <input
            id="what-if-average"
            inputMode="decimal"
            autoComplete="off"
            value={text}
            aria-invalid={inputError}
            aria-describedby={inputError ? 'what-if-average-error' : undefined}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--section-divider-color)] bg-transparent px-3 text-center text-base font-semibold tabular-nums outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent-ink)]"
            onChange={(event) => commitText(event.target.value)}
            onBlur={() => {
              setText(formatGrade(average, locale));
              setInputError(false);
            }}
          />
          <button
            type="button"
            aria-label={copy.increase}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--section-divider-color)] text-xl font-semibold active:opacity-70"
            onClick={() => applyAverage(stepAverage(average, 1, maximumGrade))}
          >
            +
          </button>
        </div>
        {inputError ? (
          <p id="what-if-average-error" role="alert" className="mt-1.5 text-sm text-[var(--tg-theme-destructive-text-color)]">
            {copy.invalidAverage(formatGrade(maximumGrade, locale))}
          </p>
        ) : null}
        {isWhatIf ? (
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">{copy.savedScore(formatPrecise(savedScore, locale))}</span>
            <button
              type="button"
              className="min-h-11 font-semibold underline underline-offset-2"
              onClick={() => setAverage(current.averageGrade)}
            >
              {copy.reset}
            </button>
          </div>
        ) : null}
        {band ? (
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]" data-testid="what-if-percentile-band">
            {band.kind === 'band' ? copy.percentileBand(band.from, band.to) : copy.belowAxis}
          </p>
        ) : null}
        {isWhatIf ? (
          <p className="mt-1 text-sm text-[var(--text-helper)]">{copy.whatIfNote}</p>
        ) : null}
      </div>
    </section>
  );
}
