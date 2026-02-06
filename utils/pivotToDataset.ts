
import { PivotResult, DataRow, PivotMetric } from '../types';
import { generateId } from '../utils';

/**
 * Transforms a Pivot Table result into a flat array of DataRows.
 * Only 'data' rows are included to avoid double-counting in further analysis.
 */
export const pivotToDatasetRows = (
  pivotData: PivotResult,
  rowFields: string[],
  colFields: string[],
  metrics: PivotMetric[]
): DataRow[] => {
  if (!pivotData || !pivotData.displayRows) return [];

  return pivotData.displayRows
    .filter(row => row.type === 'data')
    .map(row => {
      const dataRow: DataRow = { id: generateId() };

      // Add row field values
      rowFields.forEach((field, index) => {
        dataRow[field] = row.keys[index];
      });

      // Add metric values
      pivotData.colHeaders.forEach(header => {
          const value = row.metrics[header];
          dataRow[header] = value !== undefined ? value : 0;
      });

      return dataRow;
    });
};
