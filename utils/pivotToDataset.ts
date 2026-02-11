
import { PivotResult, TemporalComparisonResult, TemporalComparisonConfig, DataRow } from '../types';
import { generateId } from '../utils';

/**
 * Converts standard PivotResult into DataRow[] for a new Dataset
 */
export const pivotResultToRows = (
    result: PivotResult,
    rowFields: string[]
): DataRow[] => {
    return result.displayRows
        .filter(row => row.type === 'data')
        .map(row => {
            const newRow: DataRow = { id: generateId() };

            // Add row fields
            rowFields.forEach((field, i) => {
                newRow[field] = row.keys[i];
            });

            // Add metric columns
            // colHeaders can contain special characters, but it's fine for our DataRow keys
            result.colHeaders.forEach(header => {
                newRow[header] = row.metrics[header];
            });

            return newRow;
        });
};

/**
 * Converts TemporalComparisonResult[] into DataRow[] for a new Dataset
 */
export const temporalResultToRows = (
    results: TemporalComparisonResult[],
    rowFields: string[],
    config: TemporalComparisonConfig
): DataRow[] => {
    return results
        .filter(r => !r.isSubtotal)
        .map(r => {
            const newRow: DataRow = { id: generateId() };
            const groupValues = r.groupLabel.split('\x1F');

            // Add row fields
            rowFields.forEach((field, i) => {
                newRow[field] = groupValues[i];
            });

            // Add source values
            config.sources.forEach(source => {
                const sourceValues = r.values[source.id];
                if (sourceValues === undefined || sourceValues === null) return;

                if (typeof sourceValues === 'object') {
                    Object.entries(sourceValues).forEach(([mLabel, val]) => {
                        const key = (config.metrics && config.metrics.length > 1) ? `${source.label} - ${mLabel}` : source.label;
                        newRow[key] = val;
                    });
                } else {
                    // Legacy support for single metric results where sourceValues is the direct value
                    newRow[source.label] = sourceValues;
                }

                // Optional: add deltas if needed, but let's keep it simple for now
                // if (source.id !== config.referenceSourceId) {
                //    newRow[`${source.label} Δ`] = r.deltas[source.id].value;
                //    newRow[`${source.label} %`] = r.deltas[source.id].percentage;
                // }
            });

            return newRow;
        });
};
