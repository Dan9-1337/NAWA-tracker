import { canShowCompetitionNeighbourhood } from '../../shared/product-rules';

export type CompetitionDensity = 'dense' | 'moderate' | 'sparse';

export type CompetitionNeighbourhood = {
  distanceToHigher: number | null;
  distanceToLower: number | null;
  withinOnePointCount: number;
  tiedCount: number;
  density: CompetitionDensity;
};

function roundDelta(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveDensity(withinOnePointCount: number, groupSize: number): CompetitionDensity {
  const ratio = groupSize > 0 ? withinOnePointCount / groupSize : 0;
  if (ratio >= 0.35 || withinOnePointCount >= 8) return 'dense';
  if (ratio >= 0.15 || withinOnePointCount >= 4) return 'moderate';
  return 'sparse';
}

export function computeCompetitionNeighbourhood(
  userScore: number,
  cohortScores: number[] | null | undefined,
  countrySampleSize: number | null | undefined,
): CompetitionNeighbourhood | null {
  if (!canShowCompetitionNeighbourhood(countrySampleSize, cohortScores) || cohortScores == null) {
    return null;
  }

  const roundedUserScore = roundDelta(userScore);

  const scoresAbove = cohortScores
    .map((score) => roundDelta(score))
    .filter((score) => score > roundedUserScore + 0.05);
  const scoresBelow = cohortScores
    .map((score) => roundDelta(score))
    .filter((score) => score < roundedUserScore - 0.05);

  const distanceToHigher =
    scoresAbove.length > 0
      ? roundDelta(Math.min(...scoresAbove.map((score) => score - roundedUserScore)))
      : null;
  const distanceToLower =
    scoresBelow.length > 0
      ? roundDelta(roundedUserScore - Math.max(...scoresBelow))
      : null;

  const withinOnePointCount = cohortScores.filter(
    (score) => Math.abs(roundDelta(score) - roundedUserScore) <= 1,
  ).length;
  const tiedCount = cohortScores.filter(
    (score) => Math.abs(roundDelta(score) - roundedUserScore) < 0.05,
  ).length;

  return {
    distanceToHigher,
    distanceToLower,
    withinOnePointCount,
    tiedCount,
    density: resolveDensity(withinOnePointCount, countrySampleSize ?? cohortScores.length),
  };
}
