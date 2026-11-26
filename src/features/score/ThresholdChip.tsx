import { nawaOrientationThreshold } from '../../../shared/nawa-score';
import { useI18n } from '../../i18n/context';
import { formatPrecise } from '../../lib/format';

type ThresholdChipProps = {
  score: number;
  /** The saved result card uses the default size; the what-if preview one step smaller. */
  size?: 'default' | 'small';
  testId?: string;
};

/** Distance of `score` from the 60-point merit threshold, shown as one pill. */
export function ThresholdChip({ score, size = 'default', testId }: ThresholdChipProps) {
  const { t, locale } = useI18n();
  const copy = t.scoreScreen;
  const threshold = nawaOrientationThreshold;
  const thresholdText = String(threshold);
  const delta = Math.round((score - threshold) * 100) / 100;

  const chipText =
    delta > 0
      ? copy.aboveThreshold(formatPrecise(delta, locale), thresholdText)
      : delta < 0
        ? copy.belowThreshold(formatPrecise(Math.abs(delta), locale), thresholdText)
        : copy.atThreshold(thresholdText);

  const compact = size === 'small';
  const iconSize = compact ? 14 : 16;

  return (
    <div
      className={`inline-flex items-center rounded-full font-semibold ${
        compact
          ? 'gap-1.5 px-2.5 py-[5px] text-sm'
          : 'gap-2 px-3.5 py-[7px] text-sm'
      }`}
      style={{
        background: 'var(--tg-theme-button-color)',
        color: 'var(--tg-theme-button-text-color)',
      }}
      data-testid={testId}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        <path d={delta >= 0 ? 'M5 12.5l4.5 4.5L19 7.5' : 'M12 5v14M6 13l6 6 6-6'} />
      </svg>
      {chipText}
    </div>
  );
}
