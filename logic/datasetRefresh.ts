import { ImportBatch, Dataset, DataRow } from '../types';
import { generateId } from '../utils/common';
import { calculatePivotData } from './pivotEngine';
import { calculateTemporalComparison, detectDateColumn } from '../utils/temporalComparison';
import { blendData } from './dataBlending';
import { pivotResultToRows, temporalResultToRows } from '../utils/pivotToDataset';

/**
 * Recalculates all derived datasets that depend on a changed dataset.
 * Supports recursive updates (cascading derived datasets).
 */
export const refreshDerivedDatasets = (
    changedDatasetId: string,
    allDatasets: Dataset[],
    allBatches: ImportBatch[],
    referenceDate: string
): ImportBatch[] => {
    const finalBatches = [...allBatches];
    let changedDatasetIds = new Set<string>([changedDatasetId]);
    let totalLoops = 0;
    const MAX_LOOPS = 5; // Safety limit

    while (changedDatasetIds.size > 0 && totalLoops < MAX_LOOPS) {
        const nextChangedIds = new Set<string>();
        totalLoops++;

        const derivedToUpdate = allDatasets.filter(d => {
            if (!d.sourcePivotConfig) return false;
            const config = d.sourcePivotConfig.config;
            const temporalConfig = config?.temporalComparison || config;

            if (d.sourcePivotConfig.isTemporal) {
                return temporalConfig?.sources?.some((s: any) => changedDatasetIds.has(s.datasetId));
            } else {
                return config?.sources?.some((s: any) => changedDatasetIds.has(s.datasetId)) ||
                       (config?.currentDataset?.id && changedDatasetIds.has(config.currentDataset.id));
            }
        });

        derivedToUpdate.forEach(derivedDataset => {
            try {
                const { isTemporal, config } = derivedDataset.sourcePivotConfig!;
                let derivedRows: DataRow[] = [];

                if (isTemporal) {
                    const tConfig = config.temporalComparison || config;
                    if (!tConfig || !tConfig.sources) return;

                    const sourceDataMap = new Map<string, DataRow[]>();
                    tConfig.sources.forEach((source: any) => {
                        const dsBatches = finalBatches.filter(b => b.datasetId === source.datasetId);
                        if (dsBatches.length === 0) return;

                        let targetBatch = null;
                        if (source.year) {
                            targetBatch = dsBatches
                                .filter(b => new Date(b.date).getFullYear() === source.year)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        }

                        if (!targetBatch) {
                            targetBatch = dsBatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        }

                        if (targetBatch) {
                            sourceDataMap.set(source.id, targetBatch.rows);
                        }
                    });

                    const primaryDS = allDatasets.find(d => d.id === tConfig.sources?.[0]?.datasetId);
                    const dateColumn = primaryDS ? (detectDateColumn(primaryDS.fields) || 'Date écriture') : 'Date écriture';

                    // Update comparison month if MTD/YTD based on the latest batch
                    const activeConfig = { ...tConfig };
                    if (tConfig.comparisonMode === 'mtd' || tConfig.comparisonMode === 'ytd') {
                        const latestBatch = finalBatches.filter(b => b.datasetId === primaryDS?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        if (latestBatch) {
                            const latestMonth = new Date(latestBatch.date).getMonth() + 1;
                            activeConfig.comparisonMonth = latestMonth;
                            activeConfig.periodFilter = tConfig.comparisonMode === 'ytd'
                                ? { startMonth: 1, endMonth: latestMonth }
                                : { startMonth: latestMonth, endMonth: latestMonth };
                        }
                    }

                    const { results } = calculateTemporalComparison(sourceDataMap, activeConfig, dateColumn, false, activeConfig.filters || config.filters || []);
                    derivedRows = temporalResultToRows(results, activeConfig.groupByFields || config.rowFields || [], activeConfig);
                } else if (config) {
                    const primarySource = config.sources?.find((s: any) => s.isPrimary) || { datasetId: config.currentDataset?.id, isPrimary: true };
                    const primaryDS = allDatasets.find(d => d.id === primarySource.datasetId);

                    if (primaryDS) {
                        const dsBatches = finalBatches.filter(b => b.datasetId === primaryDS.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        if (dsBatches.length > 0) {
                            const currentBatch = dsBatches[0];
                            const blendedRows = blendData({
                                sources: config.sources || [primarySource],
                                primaryDataset: primaryDS,
                                currentBatch,
                                allBatches: finalBatches,
                                allDatasets
                            });

                            const result = calculatePivotData({
                                ...config,
                                rows: blendedRows,
                                currentDataset: primaryDS,
                                datasets: allDatasets,
                                showSubtotals: false
                            });

                            if (result) {
                                derivedRows = pivotResultToRows(result, config.rowFields);
                            }
                        }
                    }
                }

                if (derivedRows.length > 0) {
                    // Check if we already added a batch for this derived dataset in this cycle to avoid infinite growth
                    if (!finalBatches.some(b => b.datasetId === derivedDataset.id && b.date === referenceDate)) {
                        finalBatches.push({
                            id: generateId(),
                            datasetId: derivedDataset.id,
                            date: referenceDate,
                            createdAt: Date.now(),
                            rows: derivedRows
                        });
                        nextChangedIds.add(derivedDataset.id);
                    }
                }
            } catch (err) {
                console.error(`Failed to auto-refresh derived dataset ${derivedDataset.name}`, err);
            }
        });

        changedDatasetIds = nextChangedIds;
    }

    return finalBatches;
};
