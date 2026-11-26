import { useState } from 'react';
import { useI18n } from '../i18n/context';
import type { Locale } from '../i18n/types';
import { parseLocalizedNumber } from '../lib/format';

type GradeInputsProps = {
  averageGrade: number | null;
  maximumGrade: number | null;
  averageLabel: string;
  maximumLabel: string;
  onAverageChange: (value: number | null) => void;
  onMaximumChange: (value: number | null) => void;
  /** The scale is fixed by the country (or the applicant kind): shown as this plain text, not as an input. */
  maximumReadOnly?: boolean;
  maximumLockedText?: string | null;
  averageExceedsWarning?: string | null;
  averageRequiredError?: string | null;
};

function normalizeAverage(value: number | null): number | null {
  if (value == null) return null;
  return value < 0 ? 0 : value;
}

/** An example average inside the scale, so the placeholder never suggests another scale. Null while the scale is unknown. */
export function averagePlaceholderExample(maximum: number | null): number | null {
  if (maximum == null || !Number.isFinite(maximum) || maximum <= 0) return null;
  if (maximum === 12) return 10.5;
  if (maximum === 5) return 4.5;
  if (maximum === 100) return 85;
  return Math.round(maximum * 0.75 * 10) / 10;
}

/** The stored value as typed: only the decimal separator follows the locale, so nothing is rounded or grouped. */
function formatInputValue(value: number | null, locale: Locale): string {
  if (value == null) return '';
  return locale === 'en' ? String(value) : String(value).replace('.', ',');
}

export function GradeInputs({
  averageGrade,
  maximumGrade,
  averageLabel,
  maximumLabel,
  onAverageChange,
  onMaximumChange,
  maximumReadOnly = false,
  maximumLockedText,
  averageExceedsWarning,
  averageRequiredError,
}: GradeInputsProps) {
  const { t, locale } = useI18n();
  const [averageRaw, setAverageRaw] = useState(() => formatInputValue(averageGrade, locale));
  const [maximumRaw, setMaximumRaw] = useState(() => formatInputValue(maximumGrade, locale));
  const [averageTouched, setAverageTouched] = useState(false);

  const averageInvalid =
    averageGrade != null && maximumGrade != null && maximumGrade > 0 && averageGrade > maximumGrade;
  const averageMissing = averageTouched && averageGrade == null && Boolean(averageRequiredError);

  // The scale can change from outside (a locked scale unlocks): never show a typed value that no longer matches it.
  const maximumShown =
    parseLocalizedNumber(maximumRaw) === maximumGrade ? maximumRaw : formatInputValue(maximumGrade, locale);
  const example = averagePlaceholderExample(maximumGrade);
  const averagePlaceholder =
    example == null ? t.labels.averageGradePlaceholder : t.labels.averageGradePlaceholderExample(formatInputValue(example, locale));

  return (
    <>
      <label className="space-y-2 text-sm font-medium">
        <span>{averageLabel}</span>
        <input
          aria-label={averageLabel}
          type="text"
          inputMode="decimal"
          placeholder={averagePlaceholder}
          className={`min-h-11 w-full rounded-2xl border bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-base text-[var(--tg-theme-text-color)] ${
            averageInvalid || averageMissing
              ? 'border-[var(--tg-theme-destructive-text-color)]'
              : 'border-[var(--tg-theme-hint-color)]'
          }`}
          value={averageRaw}
          onChange={(event) => {
            const raw = event.target.value;
            setAverageRaw(raw);
            onAverageChange(normalizeAverage(parseLocalizedNumber(raw)));
          }}
          onBlur={() => {
            setAverageTouched(true);
            if (averageGrade != null) setAverageRaw(formatInputValue(averageGrade, locale));
          }}
        />
        {averageMissing ? (
          <p className="text-sm font-normal text-[var(--tg-theme-destructive-text-color)]" role="alert">
            {averageRequiredError}
          </p>
        ) : null}
        {averageInvalid && averageExceedsWarning ? (
          <p className="text-sm font-normal text-[var(--tg-theme-destructive-text-color)]" role="alert">
            {averageExceedsWarning}
          </p>
        ) : null}
      </label>
      {maximumReadOnly ? (
        maximumLockedText ? (
          <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{maximumLockedText}</p>
        ) : null
      ) : (
        <label className="space-y-2 text-sm font-medium">
          <span>{maximumLabel}</span>
          <input
            aria-label={maximumLabel}
            type="text"
            inputMode="decimal"
            placeholder={t.labels.maximumGradePlaceholder}
            className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-base text-[var(--tg-theme-text-color)]"
            value={maximumShown}
            onChange={(event) => {
              const raw = event.target.value;
              setMaximumRaw(raw);
              onMaximumChange(parseLocalizedNumber(raw));
            }}
            onBlur={() => {
              if (maximumGrade != null) setMaximumRaw(formatInputValue(maximumGrade, locale));
            }}
          />
        </label>
      )}
    </>
  );
}
