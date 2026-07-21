import { nawaOrientationThreshold } from '../../shared/nawa-score';
import { useI18n } from '../i18n/context';

type NawaScorePreviewProps = {
  score: number;
};

export function NawaScorePreview({ score }: NawaScorePreviewProps) {
  const { t } = useI18n();
  const above = score >= nawaOrientationThreshold;

  return (
    <p
      className={`rounded-2xl px-4 py-3 text-sm ${
        above
          ? 'border border-[var(--tg-theme-success-text-color)] bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-success-text-color)]'
          : 'border border-[var(--tg-theme-destructive-text-color)] bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-destructive-text-color)]'
      }`}
      role={above ? 'status' : 'alert'}
    >
      {t.nawaScore.preview(score.toFixed(2), above)}
    </p>
  );
}
