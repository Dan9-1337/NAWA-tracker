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

function parseOptionalNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampAverage(value: number | null, maximumGrade: number | null): number | null {
  if (value == null) return null;
  let next = value;
  if (next < 0) next = 0;
  if (maximumGrade != null && maximumGrade > 0 && next > maximumGrade) next = maximumGrade;
  return next;
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
  const averageInvalid =
    averageGrade != null && maximumGrade != null && maximumGrade > 0 && averageGrade > maximumGrade;

  return (
    <>
      <label className="space-y-2 text-sm font-medium">
        <span>{maximumLabel}</span>
        <input
          aria-label={maximumLabel}
          type="number"
          inputMode="decimal"
          min={1}
          max={1000}
          step="any"
          readOnly={maximumReadOnly}
          className={`w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-[var(--tg-theme-text-color)] ${
            maximumReadOnly
              ? 'cursor-default bg-[var(--tg-theme-secondary-bg-color)]'
              : 'bg-[var(--tg-theme-section-bg-color)]'
          }`}
          value={maximumGrade ?? ''}
          onChange={(event) => {
            const nextMaximum = parseOptionalNumber(event.target.value);
            onMaximumChange(nextMaximum);
            if (averageGrade != null && nextMaximum != null && nextMaximum > 0) {
              onAverageChange(clampAverage(averageGrade, nextMaximum));
            }
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
          type="number"
          inputMode="decimal"
          min={0}
          max={maximumGrade ?? undefined}
          step="0.01"
          className={`w-full rounded-2xl border bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-[var(--tg-theme-text-color)] ${
            averageInvalid
              ? 'border-[var(--tg-theme-destructive-text-color)]'
              : 'border-[var(--tg-theme-hint-color)]'
          }`}
          value={averageGrade ?? ''}
          onChange={(event) => onAverageChange(clampAverage(parseOptionalNumber(event.target.value), maximumGrade))}
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
