import { useRef, useState } from 'react';
import { nawaOrientationThreshold } from '../../shared/nawa-score';
import { useI18n } from '../i18n/context';
import { formatPrecise } from '../lib/format';
import { percentileInBuckets, scoreAtPercentile, scoreAxisForTrack } from '../lib/score-buckets';
import { averageAfterDrag, scoreForAverage, stepAverage } from '../lib/score-tape';
import { getTelegramWebApp } from '../lib/telegram';
import { ScoreTape } from './ScoreTape';

/** Fake cohort for the start-screen demo: 16 buckets on the same axis the real distribution uses (60–100). */
const DEMO_BUCKETS = [2, 4, 8, 13, 19, 25, 29, 30, 26, 20, 14, 9, 5, 3, 2, 1];
const DEMO_AXIS = scoreAxisForTrack('nawa_director');
const DEMO_MEDIAN = scoreAtPercentile(50, DEMO_BUCKETS, DEMO_AXIS.origin, DEMO_AXIS.step);
const DEMO_PROFILE = { maximumGrade: 5, polishSchoolLevel: 'none', rankingCountry: '' } as const;
const DEMO_START_AVERAGE = 4.65;

/** The first screen's hook: a ruler the visitor can drag to see how a score lands against a sample cohort. */
export function ResultPreviewCard() {
  const { t, locale } = useI18n();
  const [average, setAverage] = useState(DEMO_START_AVERAGE);
  const dragStartAverage = useRef(DEMO_START_AVERAGE);

  const score = scoreForAverage(average, DEMO_PROFILE);
  const percentile = percentileInBuckets(score, DEMO_BUCKETS, DEMO_AXIS.origin, DEMO_AXIS.step);
  const percentileLow = Math.min(Math.floor(percentile / 10) * 10, 90);
  const delta = Math.round((score - DEMO_MEDIAN) * 100) / 100;
  const deltaText = formatPrecise(Math.abs(delta), locale);
  const thresholdText = String(nawaOrientationThreshold);

  function applyAverage(next: number) {
    if (next === average) return;
    getTelegramWebApp()?.haptic.selection();
    setAverage(next);
  }

  return (
    <section
      className="result-preview-card overflow-hidden rounded-2xl border bg-[var(--tg-theme-section-bg-color)] p-4"
      aria-label={t.start.previewBadge}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="stat-badge">{t.start.previewBadge}</span>
        <span className="stat-badge stat-badge--accent" data-testid="preview-percentile">
          {percentileLow}–{percentileLow + 10} {t.start.previewPercentileLabel}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]"
          data-testid="preview-score"
        >
          {formatPrecise(score, locale)}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{t.start.previewScoreUnit}</span>
      </div>
      <p
        className={`mt-0.5 text-sm font-medium ${
          delta >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--text-secondary)]'
        }`}
        data-testid="preview-median"
      >
        {delta >= 0 ? t.start.previewAboveMedianBy(deltaText) : t.start.previewBelowMedianBy(deltaText)}
      </p>

      <div className="-mx-4 mt-3">
        <ScoreTape
          score={score}
          threshold={nawaOrientationThreshold}
          ariaLabel={t.scoreScreen.tapeAriaLabel(formatPrecise(score, locale), thresholdText)}
          thresholdLabel={t.scoreScreen.thresholdFlag(thresholdText)}
          onDragStart={() => {
            dragStartAverage.current = average;
          }}
          onDrag={(dx) => applyAverage(averageAfterDrag(dragStartAverage.current, dx, DEMO_PROFILE.maximumGrade))}
          onStep={(steps) => applyAverage(stepAverage(average, steps, DEMO_PROFILE.maximumGrade))}
        />
      </div>
      <p className="-mt-1 text-center text-[13px] text-[var(--text-secondary)]">{t.start.previewTapeHint}</p>

      <p className="mt-3 text-xs font-medium leading-5 text-[var(--text-secondary)]">
        <span className="text-[var(--color-accent-ink)]">●</span> {t.start.previewLive}
      </p>
    </section>
  );
}
