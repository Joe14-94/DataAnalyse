
import { DataRow, PivotSourceConfig, Dataset, ImportBatch } from '../types';
import { evaluateFormula } from '../utils';

interface BlendDataParams {
    sources: PivotSourceConfig[];
    primaryDataset: Dataset;
    currentBatch: ImportBatch;
    allBatches: ImportBatch[];
    allDatasets: Dataset[];
}

export const blendData = ({
    sources,
    primaryDataset,
    currentBatch,
    allBatches,
    allDatasets
}: BlendDataParams): DataRow[] => {
    if (!currentBatch || !primaryDataset) return [];

    // 1. Prepare Primary Rows
    const calcFields = primaryDataset.calculatedFields || [];
    let rows = currentBatch.rows;
    if (calcFields.length > 0) {
        rows = rows.map(r => {
            const enriched = { ...r };
            calcFields.forEach(cf => {
                enriched[cf.name] = evaluateFormula(enriched, cf.formula);
            });
            return enriched;
        });
    }

    // 2. Blend Secondary Sources
    const secondarySources = sources.filter(s => !s.isPrimary);

    if (secondarySources.length > 0) {
        secondarySources.forEach(src => {
            const secDS = allDatasets.find(d => d.id === src.datasetId);
            const join = src.joinConfig;

            if (secDS && join) {
                const secBatches = allBatches
                    .filter(b => b.datasetId === src.datasetId)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (secBatches.length > 0) {
                    const secBatch = secBatches[0];
                    let secRows = secBatch.rows;

                    // Enrich secondary rows
                    if (secDS.calculatedFields && secDS.calculatedFields.length > 0) {
                        secRows = secRows.map(r => {
                            const enriched = { ...r };
                            secDS.calculatedFields?.forEach(cf => {
                                enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                            });
                            return enriched;
                        });
                    }

                    // Build Lookup Map
                    const lookup = new Map<string, any>();
                    secRows.forEach(r => {
                        const k = String(r[join.secondaryKey]).trim();
                        if (k) lookup.set(k, r);
                    });

                    // Merge
                    rows = rows.map(row => {
                        const k = String(row[join.primaryKey]).trim();
                        const match = lookup.get(k);
                        if (match) {
                            const prefixedMatch: any = {};
                            Object.keys(match).forEach(key => {
                                if (key !== 'id') prefixedMatch[`[${secDS.name}] ${key}`] = match[key];
                            });
                            return { ...row, ...prefixedMatch };
                        }
                        return row;
                    });
                }
            }
        });
    }
    return rows;
};
