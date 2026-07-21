import { useI18n } from '../i18n/context';

type NawaScorePreviewProps = {
  score: number;
};

export function NawaScorePreview({ score }: NawaScorePreviewProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
      <p className="font-medium">{t.nawaScore.preview(score.toFixed(1))}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--tg-theme-subtitle-text-color)]">{t.nawaScore.previewNote}</p>
    </div>
  );
}
