
import { useMemo, useState, useEffect } from 'react';
import { useBatches, useDatasets } from '../context/DataContext';
import { PivotSourceConfig, DataRow, TemporalComparisonConfig, TemporalComparisonResult, FilterRule, PivotResult, AggregationType, DateGrouping, SortBy, SortOrder, PivotMetric } from '../types';
import { evaluateFormula } from '../utils';
import { calculatePivotData } from '../logic/pivotEngine';
import { calculateTemporalComparison, detectDateColumn } from '../utils/temporalComparison';
import { blendData } from '../logic/dataBlending';

interface UsePivotDataProps {
   sources: PivotSourceConfig[];
   selectedBatchId: string;
   rowFields: string[];
   colFields: string[];
   colGrouping: DateGrouping;
   valField: string;
   aggType: AggregationType;
   metrics: PivotMetric[];
   filters: FilterRule[];
   sortBy: SortBy;
   sortOrder: SortOrder;
   showSubtotals: boolean;
   showVariations: boolean;
   isTemporalMode: boolean;
   temporalConfig: TemporalComparisonConfig | null;
   searchTerm: string;
}

export const usePivotData = ({
   sources, selectedBatchId, rowFields, colFields, colGrouping, valField, aggType, metrics, filters, sortBy, sortOrder, showSubtotals, showVariations, isTemporalMode, temporalConfig, searchTerm
}: UsePivotDataProps) => {
   const { batches } = useBatches();
   const { datasets } = useDatasets();

   const [pivotData, setPivotData] = useState<PivotResult | null>(null);
   const [temporalResults, setTemporalResults] = useState<TemporalComparisonResult[]>([]);
   const [temporalColTotals, setTemporalColTotals] = useState<{ [sourceId: string]: { [metricLabel: string]: number } }>({});
   const [isCalculating, setIsCalculating] = useState(false);

   const primarySourceConfig = sources.find(s => s.isPrimary);
   const primaryDataset = (primarySourceConfig ? datasets.find(d => d.id === primarySourceConfig.datasetId) : null) || null;

   const datasetBatches = useMemo(() => {
       if (!primaryDataset) return [];
       return (batches || [])
           .filter(b => b.datasetId === primaryDataset.id)
           .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [batches, primaryDataset]);

   const currentBatch = useMemo(() =>
       datasetBatches.find(b => b.id === selectedBatchId) || datasetBatches[0],
       [datasetBatches, selectedBatchId]);

   // --- BLENDING LOGIC ---
   const blendedRows = useMemo(() => {
       if (!currentBatch || !primaryDataset) return [];
       return blendData({
           sources,
           primaryDataset,
           currentBatch,
           allBatches: batches,
           allDatasets: datasets
       });
   }, [currentBatch, sources, primaryDataset, datasets, batches]);

   // BOLT OPTIMIZATION: Pre-calculate search index for O(N) search performance
   const blendedRowsWithIndex = useMemo(() => {
       if (blendedRows.length === 0) return [];
       const searchableKeys = Object.keys(blendedRows[0]).filter(k => !k.startsWith('_'));

       return blendedRows.map(row => {
           let searchContent = "";
           for (let i = 0; i < searchableKeys.length; i++) {
               const v = row[searchableKeys[i]];
               if (v !== null && v !== undefined && v !== "") {
                   searchContent += (searchContent ? " " : "") + String(v);
               }
           }
           return { ...row, _searchIndex: searchContent.toLowerCase() };
       });
   }, [blendedRows]);

   const filteredRows = useMemo(() => {
       if (!searchTerm.trim()) return blendedRows;
       const term = searchTerm.toLowerCase();
       return blendedRowsWithIndex.filter(row =>
           (row as any)._searchIndex.includes(term)
       );
   }, [blendedRows, blendedRowsWithIndex, searchTerm]);

   // --- ASYNC CALCULATION (STANDARD) ---
   useEffect(() => {
       if (isTemporalMode) {
           setPivotData(null);
           return;
       }

       setIsCalculating(true);
       const timer = setTimeout(() => {
           const result = calculatePivotData({
               rows: filteredRows,
               rowFields, colFields, colGrouping, valField, aggType, metrics, filters,
               sortBy, sortOrder, showSubtotals, showVariations,
               currentDataset: primaryDataset,
               datasets
           });
           setPivotData(result);
           setIsCalculating(false);
       }, 150);
       return () => clearTimeout(timer);
   }, [filteredRows, rowFields, colFields, colGrouping, valField, aggType, metrics, filters, sortBy, sortOrder, showSubtotals, showVariations, primaryDataset, datasets, isTemporalMode]);

   // --- ASYNC CALCULATION (TEMPORAL) ---
   useEffect(() => {
       if (!isTemporalMode || !temporalConfig || !primaryDataset) {
           setTemporalResults([]);
           return;
       }

       const activeMetrics = metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []);

       if (activeMetrics.length === 0 || (temporalConfig?.sources?.length || 0) < 2) {
           setTemporalResults([]);
           return;
       }

       setIsCalculating(true);
       const timer = setTimeout(() => {
           const sourceDataMap = new Map<string, DataRow[]>();

           (temporalConfig.sources || []).forEach(source => {
               const batch = (batches || []).find(b => b.id === source.batchId);
               if (batch && primaryDataset) {
                   const calcFields = primaryDataset.calculatedFields || [];
                   let rows = batch.rows;

                   // BOLT OPTIMIZATION: Consolidated pass for enrichment and search indexing
                   const term = searchTerm.trim().toLowerCase();

                   // Pre-calculate searchable keys once for the entire batch to avoid O(M) work per row
                   const searchableKeys = rows.length > 0
                       ? [...Object.keys(rows[0]), ...calcFields.map(cf => cf.name)].filter(k => !k.startsWith('_'))
                       : [];

                   rows = rows.map(r => {
                       const enriched = { ...r };
                       if (calcFields.length > 0) {
                           calcFields.forEach(cf => {
                               enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                           });
                       }

                       if (term) {
                           // Pre-calculate search index to avoid O(N*M) allocations in filter
                           let searchContent = "";
                           for (let i = 0; i < searchableKeys.length; i++) {
                               const v = enriched[searchableKeys[i]];
                               if (v !== null && v !== undefined && v !== "") {
                                   searchContent += (searchContent ? " " : "") + String(v);
                               }
                           }
                           (enriched as any)._searchIndex = searchContent.toLowerCase();
                       }
                       return enriched;
                   });

                   if (term) {
                       rows = rows.filter(row => (row as any)._searchIndex.includes(term));
                   }

                   sourceDataMap.set(source.id, rows);
               }
           });

           const dateColumn = detectDateColumn(primaryDataset?.fields || []) || 'Date écriture';

           const activeConfig: TemporalComparisonConfig = {
               ...temporalConfig,
               groupByFields: rowFields,
               valueField: activeMetrics[0].field, // Backward compatibility
               aggType: (activeMetrics[0].aggType === 'list' ? 'sum' : activeMetrics[0].aggType) as any, // Backward compatibility
               metrics: activeMetrics.map(m => ({ ...m, aggType: m.aggType === 'list' ? 'sum' : m.aggType })),
               sortBy,
               sortOrder
           };

           const { results, colTotals } = calculateTemporalComparison(sourceDataMap, activeConfig, dateColumn, showSubtotals, filters);
           setTemporalResults(results);
           setTemporalColTotals(colTotals);
           setIsCalculating(false);
       }, 150);

       return () => clearTimeout(timer);
   }, [isTemporalMode, temporalConfig, batches, primaryDataset, rowFields, valField, aggType, metrics, showSubtotals, searchTerm, sortBy, sortOrder, filters]);

   return {
      blendedRows,
      pivotData,
      temporalResults,
      temporalColTotals,
      isCalculating,
      primaryDataset,
      datasetBatches
   };
};
