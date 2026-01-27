
import { DashboardWidget, Dataset, ImportBatch, FilterRule, PivotConfig } from '../types';
import { parseSmartNumber, evaluateFormula, generateId } from '../utils';
import { calculatePivotData } from './pivotEngine';
import { transformPivotToChartData, transformPivotToTreemapData, getChartColors, generateGradient } from './pivotToChart';
import { calculateTemporalComparison, detectDateColumn } from '../utils/temporalComparison';

export const applyPivotFilters = (rows: any[], filters: FilterRule[] | undefined, dataset: Dataset) => {
   if (!filters || filters.length === 0) return rows;
   return rows.filter(row => {
      return filters.every((filter: FilterRule) => {
         const rowVal = row[filter.field];
         const fieldUnit = dataset.fieldConfigs?.[filter.field]?.unit;
         if (filter.operator === 'in' && Array.isArray(filter.value)) {
            return filter.value.includes(String(rowVal));
         } else if (filter.operator === 'contains') {
            return String(rowVal || '').includes(String(filter.value));
         } else if (filter.operator === 'gt') {
            return parseSmartNumber(rowVal, fieldUnit) > (filter.value as number);
         } else if (filter.operator === 'lt') {
            return parseSmartNumber(rowVal, fieldUnit) < (filter.value as number);
         } else if (filter.operator === 'eq') {
            return String(rowVal) === String(filter.value);
         } else if (filter.operator === 'starts_with') {
            return String(rowVal || '').startsWith(String(filter.value));
         }
         return true;
      });
   });
};

export const getEffectiveBatches = (batches: ImportBatch[], datasetId: string | undefined, dateRange: { start: string, end: string }) => {
   if (!datasetId) return [];
   let dsBatches = batches.filter(b => b.datasetId === datasetId);
   if (dateRange.start) dsBatches = dsBatches.filter(b => b.date >= dateRange.start);
   if (dateRange.end) dsBatches = dsBatches.filter(b => b.date <= dateRange.end);
   return dsBatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getChartColorsForWidget = (config: any, colorCount: number) => {
   const effectiveColorMode = config.colorMode || 'multi';
   const effectiveColorPalette = config.colorPalette || 'vibrant';
   const effectiveSingleColor = config.singleColor || '#0066cc';
   const effectiveGradientStart = config.gradientStart || '#0066cc';
   const effectiveGradientEnd = config.gradientEnd || '#e63946';

   if (effectiveColorMode === 'single') {
      return Array(Math.max(colorCount, 1)).fill(effectiveSingleColor);
   } else if (effectiveColorMode === 'gradient') {
      return generateGradient(effectiveGradientStart, effectiveGradientEnd, Math.max(colorCount, 1));
   } else {
      return getChartColors(Math.max(colorCount, 1), effectiveColorPalette);
   }
};
