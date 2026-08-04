import { useEffect, useMemo, useRef } from 'react';
import type { ApplicationStatus } from '../../../shared/contracts';
import { useI18n } from '../../i18n/context';
import { formatDate } from '../../lib/format';
import {
  buildPassportStages,
  type PassportStage,
  type PassportStageId,
} from '../../lib/passport-stages';
import { getTelegramWebApp } from '../../lib/telegram';

type NawaPassportProps = {
  status: ApplicationStatus;
  statusChangedAt: string;
  /** Compact layout for terminal dashboard mode. */
  compact?: boolean;
  /** When true, haptic feedback fires for newly stamped stages. */
  celebrateNewStage?: boolean;
};

const cardClass =
  'rounded-2xl border border-[color-mix(in_srgb,var(--color-accent)_22%,var(--section-divider-color))] bg-[var(--tg-theme-section-bg-color)] px-3.5 py-3 space-y-3';

function stageNote(
  t: ReturnType<typeof useI18n>['t'],
  stage: PassportStage,
): string {
  if (stage.id === 'merit_review' && stage.tone === 'negative') {
    return t.passport.notes.meritNegative;
  }
  return t.passport.notes[stage.id];
}

function StageMark({ stage }: { stage: PassportStage }) {
  if (stage.state === 'completed' || stage.state === 'current') {
    const toneClass =
      stage.tone === 'negative'
        ? 'border-[var(--tg-theme-destructive-text-color)] text-[var(--tg-theme-destructive-text-color)]'
        : stage.tone === 'positive'
          ? 'border-[var(--tg-theme-success-text-color)] text-[var(--tg-theme-success-text-color)]'
          : 'border-[var(--color-accent)] text-[var(--color-accent)]';
    return (
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--tg-theme-bg-color)] text-xs font-bold ${toneClass}${
          stage.state === 'current' ? ' passport-stamp' : ''
        }`}
        aria-hidden="true"
      >
        {stage.tone === 'negative' ? '○' : '✓'}
      </span>
    );
  }

  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--section-divider-color)] text-xs text-[var(--text-helper)]"
      aria-hidden="true"
    >
      ○
    </span>
  );
}

export function NawaPassport({
  status,
  statusChangedAt,
  compact = false,
  celebrateNewStage = false,
}: NawaPassportProps) {
  const { t, locale } = useI18n();
  const celebratedRef = useRef<string | null>(null);

  const { stages, newlyStamped } = useMemo(
    () => buildPassportStages(status, statusChangedAt),
    [status, statusChangedAt],
  );

  useEffect(() => {
    if (!celebrateNewStage || newlyStamped.length === 0) return;
    const key = `${status}:${newlyStamped.join(',')}`;
    if (celebratedRef.current === key) return;
    celebratedRef.current = key;
    // No playful haptics for negative merit outcomes.
    if (status === 'merit_review_negative') return;
    getTelegramWebApp()?.haptic.notification('success');
  }, [celebrateNewStage, newlyStamped, status]);

  const visibleStages = compact
    ? stages.filter((stage) => stage.state !== 'upcoming' || stage.id === stages.find((s) => s.state === 'upcoming')?.id)
    : stages;

  return (
    <section className={cardClass} aria-label={t.passport.title}>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t.passport.title}</h2>

      <ol className="space-y-3">
        {visibleStages.map((stage) => (
          <li key={stage.id} className="flex gap-3">
            <StageMark stage={stage} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p
                className={`text-sm font-medium ${
                  stage.state === 'upcoming'
                    ? 'text-[var(--text-helper)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {t.passport.stages[stage.id as PassportStageId]}
              </p>
              {stage.reachedAt && stage.state !== 'upcoming' ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDate(
                    stage.reachedAt.includes('T')
                      ? stage.reachedAt.slice(0, 10)
                      : stage.reachedAt,
                    locale,
                  )}
                  {stage.daysFromPrevious != null && stage.daysFromPrevious > 0
                    ? ` · ${t.passport.daysSincePrevious(String(stage.daysFromPrevious))}`
                    : null}
                </p>
              ) : null}
              {!compact ? (
                <p className="text-xs leading-5 text-[var(--text-helper)]">{stageNote(t, stage)}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
