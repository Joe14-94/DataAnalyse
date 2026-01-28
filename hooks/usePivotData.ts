
import { useMemo, useState, useEffect } from 'react';
import { useBatches, useDatasets } from '../context/DataContext';
import { PivotSourceConfig, Dataset, DataRow, TemporalComparisonConfig, TemporalComparisonResult, FilterRule, PivotResult, AggregationType, DateGrouping, SortBy, SortOrder, PivotMetric } from '../types';
import { evaluateFormula } from '../utils';
import { calculatePivotData } from '../logic/pivotEngine';
import { calculateTemporalComparison, detectDateColumn } from '../utils/temporalComparison';

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
}

export const usePivotData = ({
   sources, selectedBatchId, rowFields, colFields, colGrouping, valField, aggType, metrics, filters, sortBy, sortOrder, showSubtotals, showVariations, isTemporalMode, temporalConfig
}: UsePivotDataProps) => {
   const { batches } = useBatches();
   const { datasets } = useDatasets();

   const [pivotData, setPivotData] = useState<PivotResult | null>(null);
   const [temporalResults, setTemporalResults] = useState<TemporalComparisonResult[]>([]);
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
               const secDS = datasets.find(d => d.id === src.datasetId);
               const join = src.joinConfig;

               if (secDS && join) {
                   const secBatches = batches
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
   }, [currentBatch, sources, primaryDataset, datasets, batches]);

   // --- ASYNC CALCULATION (STANDARD) ---
   useEffect(() => {
       if (isTemporalMode) {
           setPivotData(null);
           return;
       }

       setIsCalculating(true);
       const timer = setTimeout(() => {
           const result = calculatePivotData({
               rows: blendedRows,
               rowFields, colFields, colGrouping, valField, aggType, metrics, filters,
               sortBy, sortOrder, showSubtotals, showVariations,
               currentDataset: primaryDataset,
               datasets
           });
           setPivotData(result);
           setIsCalculating(false);
       }, 150);
       return () => clearTimeout(timer);
   }, [blendedRows, rowFields, colFields, colGrouping, valField, aggType, metrics, filters, sortBy, sortOrder, showSubtotals, showVariations, primaryDataset, datasets, isTemporalMode]);

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
                   sourceDataMap.set(source.id, rows);
               }
           });

           const dateColumn = detectDateColumn(primaryDataset.fields) || 'Date écriture';
           const validAggType = aggType === 'list' ? 'sum' : aggType;
           const activeConfig: TemporalComparisonConfig = {
               ...temporalConfig,
               groupByFields: rowFields,
               valueField: valField,
               aggType: validAggType as any
           };

           const results = calculateTemporalComparison(sourceDataMap, activeConfig, dateColumn, showSubtotals);
           setTemporalResults(results);
           setIsCalculating(false);
       }, 150);

       return () => clearTimeout(timer);
   }, [isTemporalMode, temporalConfig, batches, primaryDataset, rowFields, valField, aggType, showSubtotals]);

   return {
      blendedRows,
      pivotData,
      temporalResults,
      isCalculating,
      primaryDataset,
      datasetBatches
   };
};
