export const calculateLinearRegression = (
  yValues: number[]
): { slope: number; intercept: number; r2: number } => {
  const n = yValues.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const xValues = Array.from({ length: n }, (_, i) => i);
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
  const sumXX = xValues.reduce((a, b) => a + b * b, 0);
  const sumYY = yValues.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R Squared calculation
  const ssTot = sumYY - (sumY * sumY) / n;
  const ssRes = sumYY - intercept * sumY - slope * sumXY; // Simplified for linear
  const r2 = 1 - ssRes / (ssTot || 1);

  return { slope, intercept, r2 };
};
