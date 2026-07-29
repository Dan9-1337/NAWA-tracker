export type TotalSeatScenarioLabel = 'lower' | 'middle' | 'upper';

export type TotalSeatScenario = {
  id: string;
  label: TotalSeatScenarioLabel;
  totalSeats: number;
  basis: string;
  isOfficial: boolean;
};

/**
 * Configurable programme-wide seat-mass scenarios.
 * Values are illustrative until NAWA publishes the 2026 total.
 */
export const totalSeatScenarios: TotalSeatScenario[] = [
  {
    id: 'lower-2026',
    label: 'lower',
    totalSeats: 420,
    basis:
      'Lower-bound scenario based on recent programme intakes; not the published 2026 limit.',
    isOfficial: false,
  },
  {
    id: 'middle-2026',
    label: 'middle',
    totalSeats: 500,
    basis:
      'Middle scenario based on recent programme intakes; not the published 2026 limit.',
    isOfficial: false,
  },
  {
    id: 'upper-2026',
    label: 'upper',
    totalSeats: 580,
    basis:
      'Upper-bound scenario based on recent programme intakes; not the published 2026 limit.',
    isOfficial: false,
  },
];

export function getTotalSeatScenarioById(id: string): TotalSeatScenario | null {
  return totalSeatScenarios.find((scenario) => scenario.id === id) ?? null;
}

export function getDefaultTotalSeatScenario(): TotalSeatScenario {
  return totalSeatScenarios.find((scenario) => scenario.label === 'middle') ?? totalSeatScenarios[1];
}
