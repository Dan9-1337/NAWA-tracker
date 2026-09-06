import { useState } from 'react';
import { useI18n } from '../i18n/context';
import { parseLocalizedNumber } from '../lib/format';

type GradeInputsProps = {
  averageGrade: number | null;
  maximumGrade: number | null;
  averageLabel: string;
  maximumLabel: string;
  onAverageChange: (value: number | null) => void;
  onMaximumChange: (value: number | null) => void;
  maximumHint?: string | null;
  maximumReadOnly?: boolean;
  averageExceedsWarning?: string | null;
};

function normalizeAverage(value: number | null): number | null {
  if (value == null) return null;
  return value < 0 ? 0 : value;
}

function formatInputValue(value: number | null): string {
  if (value == null) return '';
  return String(value);
}

export function GradeInputs({
  averageGrade,
  maximumGrade,
  averageLabel,
  maximumLabel,
  onAverageChange,
  onMaximumChange,
  maximumHint,
  maximumReadOnly = false,
  averageExceedsWarning,
}: GradeInputsProps) {
  const { t } = useI18n();
  const [averageRaw, setAverageRaw] = useState(() => formatInputValue(averageGrade));
  const [maximumRaw, setMaximumRaw] = useState(() => formatInputValue(maximumGrade));

  const averageInvalid =
    averageGrade != null && maximumGrade != null && maximumGrade > 0 && averageGrade > maximumGrade;

  return (
    <>
      <label className="space-y-2 text-sm font-medium">
        <span>{maximumLabel}</span>
        <input
          aria-label={maximumLabel}
          type="text"
          inputMode="decimal"
          readOnly={maximumReadOnly}
          placeholder={t.labels.maximumGradePlaceholder}
          className={`min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-base text-[var(--tg-theme-text-color)] ${
            maximumReadOnly
              ? 'cursor-default bg-[var(--tg-theme-secondary-bg-color)]'
              : 'bg-[var(--tg-theme-section-bg-color)]'
          }`}
          value={maximumReadOnly ? formatInputValue(maximumGrade) : maximumRaw}
          onChange={(event) => {
            const raw = event.target.value;
            setMaximumRaw(raw);
            const nextMaximum = parseLocalizedNumber(raw);
            onMaximumChange(nextMaximum);
          }}
          onBlur={() => {
            if (maximumGrade != null) setMaximumRaw(formatInputValue(maximumGrade));
          }}
        />
        {maximumHint ? (
          <p className="text-xs font-normal text-[var(--tg-theme-subtitle-text-color)]">{maximumHint}</p>
        ) : null}
      </label>
      <label className="space-y-2 text-sm font-medium">
        <span>{averageLabel}</span>
        <input
          aria-label={averageLabel}
          type="text"
          inputMode="decimal"
          placeholder={t.labels.averageGradePlaceholder}
          className={`min-h-11 w-full rounded-2xl border bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-base text-[var(--tg-theme-text-color)] ${
            averageInvalid
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
            if (averageGrade != null) setAverageRaw(formatInputValue(averageGrade));
          }}
        />
        {averageInvalid && averageExceedsWarning ? (
          <p className="text-xs font-normal text-[var(--tg-theme-destructive-text-color)]" role="alert">
            {averageExceedsWarning}
          </p>
        ) : null}
      </label>
    </>
  );
}
