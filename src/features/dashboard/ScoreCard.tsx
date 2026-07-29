import { DataSourceBadge } from '../../components/DataSourceBadge';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';

type ScoreCardProps = {
  total: number;
  gradesScore: number | null;
  polishSchoolBonus: number | null;
};

const cardClass =
  'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 space-y-2';

export function ScoreCard({ total, gradesScore, polishSchoolBonus }: ScoreCardProps) {
  const { t, locale } = useI18n();
  const showBreakdown = gradesScore != null || (polishSchoolBonus != null && polishSchoolBonus > 0);

  return (
    <section className={cardClass} aria-labelledby="dashboard-score-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="dashboard-score-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.dashboard.score.title}
        </h2>
        <DataSourceBadge source="estimate" />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
          {formatScore(total, locale)}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{t.dashboard.score.unit}</span>
      </div>

      {showBreakdown ? (
        <dl className="space-y-1 text-sm">
          {gradesScore != null ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--text-secondary)]">{t.dashboard.score.gradesLabel}</dt>
              <dd className="font-medium tabular-nums text-[var(--text-primary)]">
                {formatScore(gradesScore, locale)}
              </dd>
            </div>
          ) : null}
          {polishSchoolBonus != null && polishSchoolBonus > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--text-secondary)]">{t.dashboard.score.polishSchoolLabel}</dt>
              <dd className="font-medium tabular-nums text-[var(--text-primary)]">
                +{formatScore(polishSchoolBonus, locale)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-helper)]">{t.dashboard.score.disclaimer}</p>
    </section>
  );
}
