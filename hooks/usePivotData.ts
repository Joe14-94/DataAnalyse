
import { useMemo, useState, useEffect } from 'react';
import { useBatches, useDatasets } from '../context/DataContext';
import { PivotSourceConfig, Dataset, DataRow, TemporalComparisonConfig, TemporalComparisonResult, FilterRule, PivotResult, AggregationType, DateGrouping, SortBy, SortOrder, PivotMetric } from '../types';
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
   const [temporalColTotals, setTemporalColTotals] = useState<{ [sourceId: string]: number }>({});
   const [isCalculating, setIsCalculating] = useState(false);

   const primarySourceConfig = sources.find(s => s.isPrimary);
   const primaryDataset = (primarySourceConfig ? datasets.find(d => d.id === primarySourceConfig.datasetId) : null) || null;

   const datasetBatches = useMemo(() => {
       if (!primaryDataset) return [];
       return batches
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

   const filteredRows = useMemo(() => {
       if (!searchTerm.trim()) return blendedRows;
       const term = searchTerm.toLowerCase();
       return blendedRows.filter(row =>
           Object.values(row).some(val =>
               String(val ?? '').toLowerCase().includes(term)
           )
       );
   }, [blendedRows, searchTerm]);

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

       if (rowFields.length === 0 || !valField || temporalConfig.sources.length < 2) {
           setTemporalResults([]);
           return;
       }

       setIsCalculating(true);
       const timer = setTimeout(() => {
           const sourceDataMap = new Map<string, DataRow[]>();

           temporalConfig.sources.forEach(source => {
               const batch = batches.find(b => b.id === source.batchId);
               if (batch && primaryDataset) {
                   const calcFields = primaryDataset.calculatedFields || [];
                   let rows = batch.rows;

                   if (calcFields.length > 0) {
                       rows = rows.map(r => {
                           const enriched = { ...r };
                           calcFields.forEach(cf => {
                               enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                           });
                           return enriched;
                       });
                   }

                   if (searchTerm.trim()) {
                       const term = searchTerm.toLowerCase();
                       rows = rows.filter(row =>
                           Object.values(row).some(val =>
                               String(val ?? '').toLowerCase().includes(term)
                           )
                       );
                   }

                   sourceDataMap.set(source.id, rows);
               }
           });

           const dateColumn = detectDateColumn(primaryDataset.fields) || 'Date écriture';
           const validAggType = aggType === 'list' ? 'sum' : aggType;
           const activeConfig: TemporalComparisonConfig = {
               ...temporalConfig,
               groupByFields: rowFields,
               valueField: valField,
               aggType: validAggType as any,
               sortBy,
               sortOrder
           };

           const { results, colTotals } = calculateTemporalComparison(sourceDataMap, activeConfig, dateColumn, showSubtotals, filters);
           setTemporalResults(results);
           setTemporalColTotals(colTotals);
           setIsCalculating(false);
       }, 150);

       return () => clearTimeout(timer);
   }, [isTemporalMode, temporalConfig, batches, primaryDataset, rowFields, valField, aggType, showSubtotals, searchTerm]);

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
