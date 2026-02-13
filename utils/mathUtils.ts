/**
 * Calculates a simple linear regression.
 * BOLT OPTIMIZATION: Optimized to single-pass and using mathematical formulas for arithmetic progressions.
 */
export const calculateLinearRegression = (yValues: number[]): { slope: number, intercept: number, r2: number } => {
  const n = yValues.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  // BOLT OPTIMIZATION: Since X is always a sequence [0, 1, 2, ..., n-1],
  // we use closed-form formulas for sumX and sumXX to avoid O(N) work.
  // sumX = n(n-1)/2
  // sumXX = n(n-1)(2n-1)/6
  const sumX = (n * (n - 1)) / 2;
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  let sumY = 0;
  let sumXY = 0;
  let sumYY = 0;

  // BOLT OPTIMIZATION: Single-pass to calculate all dependent sums (Y, XY, YY)
  for (let i = 0; i < n; i++) {
    const y = yValues[i];
    sumY += y;
    sumXY += i * y;
    sumYY += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R Squared calculation
  const ssTot = sumYY - (sumY * sumY) / n;
  const ssRes = sumYY - intercept * sumY - slope * sumXY; // Simplified for linear
  const r2 = 1 - (ssRes / (ssTot || 1));

  return { slope, intercept, r2 };
};
