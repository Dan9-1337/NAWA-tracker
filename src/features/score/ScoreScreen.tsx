import { useEffect, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../../shared/contracts';
import { nawaOrientationThreshold } from '../../../shared/nawa-score';
import { isIntakeOpen, season2026 } from '../../../shared/season';
import { ScoreTape } from '../../components/ScoreTape';
import { ChevronIcon } from '../../components/icons';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import { formatDate, formatGrade, formatPrecise, parseLocalizedNumber } from '../../lib/format';
import {
  AVERAGE_STEP,
  averageAfterDrag,
  clampAverage,
  scoreForAverage,
  stepAverage,
} from '../../lib/score-tape';
import { getTelegramWebApp } from '../../lib/telegram';
import type { WizardStep } from '../ResponseWizardSteps';

type ScoreScreenProps = {
  current: ResponseFormInput;
  onEditSection: (section: WizardStep) => void;
};

type ProfileRowProps = {
  label: string;
  value: string;
  onClick: () => void;
  last?: boolean;
};

function ProfileRow({ label, value, onClick, last = false }: ProfileRowProps) {
  return (
    <button
      type="button"
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left active:opacity-70${
        last ? '' : ' border-b border-[var(--section-divider-color)]'
      }`}
      onClick={onClick}
    >
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="flex items-center gap-1.5 text-base font-semibold">
        {value}
        <span className="text-[var(--text-secondary)]">
          <ChevronIcon />
        </span>
      </span>
    </button>
  );
}

export function ScoreScreen({ current, onEditSection }: ScoreScreenProps) {
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
  const delta = Math.round((score - threshold) * 100) / 100;
  const thresholdText = String(threshold);

  const chipText =
    delta > 0
      ? copy.aboveThreshold(formatPrecise(delta, locale), thresholdText)
      : delta < 0
        ? copy.belowThreshold(formatPrecise(Math.abs(delta), locale), thresholdText)
        : copy.atThreshold(thresholdText);

  function applyAverage(next: number) {
    if (next === average) return;
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
      typedChange.current = true;
      setAverage(next);
    }
  }

  const bonus = scoreForAverage(average, profile) - scoreForAverage(average, { ...profile, polishSchoolLevel: 'none' });
  const formula = `${formatPrecise(average, locale)} × 90 ÷ ${formatGrade(maximumGrade, locale)}${
    bonus > 0 ? ` + ${formatGrade(bonus, locale)}` : ''
  } = ${formatPrecise(score, locale)}`;

  const seasonLabel = isIntakeOpen()
    ? copy.seasonOpen(formatDate(season2026.documentsTo, locale))
    : copy.seasonClosed(String(season2026.year));

  return (
    <section className="space-y-0" aria-label={copy.scoreLabel}>
      <div className="flex items-baseline justify-between gap-3 text-sm text-[var(--text-secondary)]">
        <span>{isWhatIf ? copy.whatIfLabel : copy.scoreLabel}</span>
        <span className="shrink-0 text-xs">{seasonLabel}</span>
      </div>

      <div className="mt-0.5 flex items-baseline gap-2">
        <span
          className="font-display text-[clamp(88px,34vw,132px)] font-semibold leading-[0.95] tracking-[-0.02em] tabular-nums"
          data-testid="score-value"
        >
          {formatPrecise(score, locale)}
        </span>
        <span className="font-display text-[28px] font-medium text-[var(--text-secondary)]">
          {copy.scaleMax}
        </span>
      </div>

      <div
        className="mt-2.5 inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13.5px] font-semibold"
        style={{
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d={delta >= 0 ? 'M5 12.5l4.5 4.5L19 7.5' : 'M12 5v14M6 13l6 6 6-6'} />
        </svg>
        {chipText}
      </div>

      <div className="-mx-4 mt-5">
        <ScoreTape
          score={score}
          threshold={threshold}
          ariaLabel={copy.tapeAriaLabel(formatPrecise(score, locale), thresholdText)}
          thresholdLabel={copy.thresholdFlag(thresholdText)}
          onDragStart={() => {
            dragStartAverage.current = average;
          }}
          onDrag={(dx) => applyAverage(averageAfterDrag(dragStartAverage.current, dx, maximumGrade))}
          onStep={(steps) => applyAverage(stepAverage(average, steps, maximumGrade))}
        />
      </div>
      <p className="-mt-1 text-center text-[13px] text-[var(--text-secondary)]">
        {copy.tapeHint(formatPrecise(AVERAGE_STEP, locale))}
      </p>

      <div className="mt-4 rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3">
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
        {isWhatIf ? (
          <p className="mt-1 text-[13px] text-[var(--text-helper)]">{copy.whatIfNote}</p>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)]">
        <ProfileRow
          label={copy.rows.citizenship}
          value={formatCountryLabel(current.rankingCountry, locale)}
          onClick={() => onEditSection('education')}
        />
        <ProfileRow
          label={copy.rows.average}
          value={formatGrade(current.averageGrade, locale)}
          onClick={() => onEditSection('grades')}
        />
        <ProfileRow
          label={copy.rows.scale}
          value={copy.scaleValue(formatGrade(maximumGrade, locale))}
          onClick={() => onEditSection('grades')}
        />
        <ProfileRow
          label={copy.rows.polish}
          value={copy.polishValue[current.polishSchoolLevel ?? 'none']}
          onClick={() => onEditSection('grades')}
          last
        />
      </div>

      <p className="mt-2.5 px-1 text-[13px] tabular-nums text-[var(--text-secondary)]">
        {formula}. {copy.formulaDisclaimer}
      </p>
    </section>
  );
}
