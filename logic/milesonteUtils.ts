/**
 * Calculates the percentage improvement between a previous and a new value.
 * Handles cases where improvement is not possible (e.g., division by zero).
 *
 * @param newValue The new value achieved.
 * @param previousValue The previous value to compare against.
 * @returns The percentage improvement as a number rounded to one decimal place, or null.
 */
export const calculateImprovementPercentage = (
  newValue: number | null | undefined,
  previousValue: number | null | undefined
): number | null => {
  // Cannot calculate improvement if values are missing or previous value is zero.
  if (previousValue == null || newValue == null || previousValue === 0) {
    return null;
  }

  // No improvement if the new value is not greater than the old one.
  if (newValue <= previousValue) {
    return 0;
  }

  const improvement = ((newValue - previousValue) / previousValue) * 100;

  // Return the value rounded to one decimal place.
  return parseFloat(improvement.toFixed(1));
};