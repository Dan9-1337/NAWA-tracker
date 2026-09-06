import type { CompetitionNeighbourhood } from '../../lib/competition-neighbourhood';
import { useI18n } from '../../i18n/context';
import { formatScore } from '../../lib/format';

type CompetitionNeighbourhoodDetailsProps = {
  neighbourhood: CompetitionNeighbourhood;
};

export function CompetitionNeighbourhoodDetails({
  neighbourhood,
}: CompetitionNeighbourhoodDetailsProps) {
  const { t, locale } = useI18n();

  const densityCopy =
    neighbourhood.density === 'dense'
      ? t.dashboard.competitionNeighbourhood.dense
      : neighbourhood.density === 'moderate'
        ? t.dashboard.competitionNeighbourhood.moderate
        : t.dashboard.competitionNeighbourhood.sparse;

  return (
    <div className="space-y-1.5 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] px-3 py-2.5 text-sm">
      {neighbourhood.distanceToHigher != null ? (
        <p className="text-[var(--text-secondary)]">
          {t.dashboard.competitionNeighbourhood.distanceHigher(
            formatScore(neighbourhood.distanceToHigher, locale),
          )}
        </p>
      ) : null}
      {neighbourhood.distanceToLower != null ? (
        <p className="text-[var(--text-secondary)]">
          {t.dashboard.competitionNeighbourhood.distanceLower(
            formatScore(neighbourhood.distanceToLower, locale),
          )}
        </p>
      ) : null}
      <p className="text-[var(--text-secondary)]">
        {t.dashboard.competitionNeighbourhood.withinOnePoint(
          String(neighbourhood.withinOnePointCount),
        )}
      </p>
      {neighbourhood.tiedCount > 1 ? (
        <p className="text-[var(--text-secondary)]">
          {t.dashboard.competitionNeighbourhood.tied(String(neighbourhood.tiedCount))}
        </p>
      ) : null}
      <p className="text-xs text-[var(--text-helper)]">{densityCopy}</p>
    </div>
  );
}
