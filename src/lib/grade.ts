export function calculateGradePercentage(scale: number, value: number): number {
  if (scale <= 0) {
    return 0;
  }

  return Math.round((value / scale) * 1000) / 10;
}
