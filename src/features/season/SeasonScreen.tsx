import type { ApplicationStatus } from '../../../shared/contracts';
import { season2026, type SeasonPhaseId } from '../../../shared/season';
import { useI18n } from '../../i18n/context';
import { formatDate } from '../../lib/format';
import { buildSeasonStages, type SeasonStage, type SeasonStageState } from '../../lib/season-stages';

type SeasonScreenProps = {
  status: ApplicationStatus;
};

const INK = '#14161a';

const rulerBackground = [
  `linear-gradient(0deg, ${INK} 1px, transparent 1px) 0 0 / 12px 10px repeat-y`,
  `linear-gradient(0deg, ${INK} 1.5px, transparent 1.5px) 0 0 / 20px 50px repeat-y`,
  `linear-gradient(0deg, ${INK} 2px, transparent 2px) 0 0 / 28px 100px repeat-y`,
].join(', ');

function stageNodeClass(state: SeasonStageState): string {
  switch (state) {
    case 'done':
      return 'border-[3px] border-[var(--tg-theme-bg-color)] bg-[#14161a] text-[var(--color-accent)]';
    case 'current':
      return 'border-2 border-[#14161a] bg-[var(--color-accent)] text-[#14161a]';
    case 'upcoming':
      return 'border-2 border-[#14161a] bg-[var(--tg-theme-secondary-bg-color)] text-[var(--text-primary)]';
    case 'locked':
      return 'border-2 border-[var(--text-disabled)] bg-[var(--tg-theme-secondary-bg-color)] text-[var(--text-secondary)]';
  }
}

export function SeasonScreen({ status }: SeasonScreenProps) {
  const { t, locale } = useI18n();
  const copy = t.season;
  const stages = buildSeasonStages(status);
  const awarded = status === 'scholarship_awarded';
  const outcomeReported =
    awarded || status === 'scholarship_not_awarded' || status === 'merit_review_negative';
  const doneCount = stages.filter((stage) => stage.state === 'done').length;
  // The yellow stretch of the ruler runs through the stages already passed, plus the current one.
  const currentIndex = stages.findIndex((stage) => stage.state === 'current');
  const filledStages = currentIndex === -1 ? doneCount : currentIndex + 1;

  const datesFor = (id: SeasonPhaseId): string => {
    switch (id) {
      case 'documents':
        return copy.documents.dates(
          formatDate(season2026.documentsFrom, locale),
          formatDate(season2026.documentsTo, locale),
        );
      case 'evaluation':
        return copy.evaluation.dates(formatDate(season2026.resultsBy, locale));
      case 'results':
        return copy.results.dates(formatDate(season2026.resultsBy, locale));
      case 'university':
        return awarded ? copy.university.datesAwarded : copy.university.dates;
    }
  };

  // Stage texts must not ask for what the user has already done: a reported outcome closes "report the result",
  // and an awarded scholarship is no longer "after the scholarship is awarded".
  const bodyFor = (id: SeasonPhaseId): string => {
    if (id === 'results' && outcomeReported) return copy.results.bodyReported;
    if (id === 'university' && awarded) return copy.university.bodyAwarded;
    return copy[id].body;
  };

  const stateLabel: Record<SeasonStageState, string> = {
    done: copy.stateDone,
    current: copy.stateCurrent,
    upcoming: copy.stateUpcoming,
    locked: copy.stateLocked,
  };

  const renderStage = (stage: SeasonStage, index: number) => {
    const block = copy[stage.id];
    const isCurrent = stage.state === 'current';
    const isLocked = stage.state === 'locked';
    return (
      <li key={stage.id} className="relative" aria-current={isCurrent ? 'step' : undefined}>
        <span
          aria-hidden="true"
          className={`font-display absolute -left-[38px] top-3.5 flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-semibold ${stageNodeClass(stage.state)}`}
        >
          {index + 1}
        </span>
        <div
          className={`min-h-[96px] rounded-2xl px-4 py-3.5 ${
            isCurrent
              ? 'border-2 border-[var(--text-primary)] bg-[var(--tg-theme-secondary-bg-color)]'
              : isLocked
                ? 'border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)]'
                : 'border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)]'
          }`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold">{block.title}</h3>
            <span className="shrink-0 text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]">
              {stateLabel[stage.state]}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{datesFor(stage.id)}</p>
          <p className="mt-1.5 text-[13.5px] leading-snug">{bodyFor(stage.id)}</p>
        </div>
      </li>
    );
  };

  return (
    <section aria-labelledby="season-title">
      <h2 id="season-title" className="font-display text-[34px] font-semibold leading-[1.1]">
        {copy.title}
      </h2>
      <p className="mt-0.5 text-sm leading-snug text-[var(--text-secondary)]">
        {copy.subtitle(String(season2026.year))}
      </p>

      <div className="relative mt-6 pl-[68px]">
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 top-0 w-11 rounded-md"
          style={{ background: '#f4e6a6' }}
        />
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 w-11 rounded-t-md"
          style={{
            height: `${(filledStages / stages.length) * 100}%`,
            background: 'var(--color-accent)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 top-0 w-11"
          style={{ background: rulerBackground }}
        />
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {stages.map(renderStage)}
        </ol>
      </div>
    </section>
  );
}
