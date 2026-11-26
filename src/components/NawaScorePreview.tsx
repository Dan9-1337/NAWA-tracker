import { useI18n } from '../i18n/context';
import { formatPrecise } from '../lib/format';

type NawaScorePreviewProps = {
  /** The orientation score, or null until the average is valid: the bar then shows the empty-state text. */
  score: number | null;
};

/** The live score, pinned to the bottom of the scrolling step so it is in sight while the user types. */
export function NawaScorePreview({ score }: NawaScorePreviewProps) {
  const { t, locale } = useI18n();

  return (
    <div
      className="sticky bottom-2 z-10 rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      data-testid="score-bar"
    >
      <p className="font-medium" aria-live="polite">
        {score === null ? t.nawaScore.previewEmpty : t.nawaScore.preview(formatPrecise(score, locale))}
      </p>
      <p className="mt-1 text-sm leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.nawaScore.previewNote}</p>
    </div>
  );
}
