import { useReducer, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { parseSmartNumber, calculateLinearRegression, formatDateFr, exportView, getSafeLogo } from '../utils';
import { FilterRule, ColorMode, ColorPalette, ChartType as WidgetChartType, DataRow } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { getChartColors, generateGradient } from '../logic/pivotToChart';
import * as XLSX from 'xlsx';

export type AnalysisMode = 'snapshot' | 'trend';
export type ChartType = 'bar' | 'column' | 'stacked-bar' | 'stacked-column' | 'percent-bar' | 'percent-column' | 'pie' | 'donut' | 'area' | 'stacked-area' | 'radar' | 'treemap' | 'kpi' | 'line' | 'sunburst' | 'radial' | 'funnel';
export type MetricType = 'count' | 'distinct' | 'sum' | 'min' | 'max';

interface AnalysisStudioState {
    mode: AnalysisMode;
    selectedBatchId: string;
    startDate: string;
    endDate: string;
    dimension: string;
    metric: MetricType;
    valueField: string;
    metric2: MetricType | 'none';
    valueField2: string;
    segment: string;
    chartType: ChartType;
    limit: number;
    sortOrder: 'desc' | 'asc' | 'alpha';
    isCumulative: boolean;
    showTable: boolean;
    showForecast: boolean;
    filters: FilterRule[];
    isSaving: boolean;
    analysisName: string;
    successMessage: string | null;
    showExportMenu: boolean;
    chartTitle: string;
    customUnit: string;
    colorMode: ColorMode;
    colorPalette: ColorPalette;
    singleColor: string;
    gradientStart: string;
    gradientEnd: string;
}

type AnalysisStudioAction =
    | { type: 'SET_MODE'; payload: AnalysisMode }
    | { type: 'SET_BATCH_ID'; payload: string }
    | { type: 'SET_DATES'; payload: { start?: string, end?: string } }
    | { type: 'SET_DIMENSION'; payload: string }
    | { type: 'SET_METRIC'; payload: { target: 1 | 2, metric: MetricType | 'none' } }
    | { type: 'SET_VALUE_FIELD'; payload: { target: 1 | 2, field: string } }
    | { type: 'SET_SEGMENT'; payload: string }
    | { type: 'SET_CHART_TYPE'; payload: ChartType }
    | { type: 'SET_LIMIT'; payload: number }
    | { type: 'SET_SORT_ORDER'; payload: 'desc' | 'asc' | 'alpha' }
    | { type: 'TOGGLE_BOOLEAN'; payload: keyof AnalysisStudioState }
    | { type: 'SET_FILTERS'; payload: FilterRule[] }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SET_ANALYSIS_NAME'; payload: string }
    | { type: 'SET_SUCCESS_MESSAGE'; payload: string | null }
    | { type: 'SET_EXPORT_MENU'; payload: boolean }
    | { type: 'SET_CHART_TITLE'; payload: string }
    | { type: 'SET_CUSTOM_UNIT'; payload: string }
    | { type: 'SET_COLOR_CONFIG'; payload: Partial<AnalysisStudioState> }
    | { type: 'LOAD_ANALYSIS'; payload: Partial<AnalysisStudioState> };

const initialState: AnalysisStudioState = {
    mode: 'snapshot',
    selectedBatchId: '',
    startDate: '',
    endDate: '',
    dimension: '',
    metric: 'count',
    valueField: '',
    metric2: 'none',
    valueField2: '',
    segment: '',
    chartType: 'bar',
    limit: 10,
    sortOrder: 'desc',
    isCumulative: false,
    showTable: false,
    showForecast: false,
    filters: [],
    isSaving: false,
    analysisName: '',
    successMessage: null,
    showExportMenu: false,
    chartTitle: '',
    customUnit: '',
    colorMode: 'multi',
    colorPalette: 'default',
    singleColor: '#60a5fa',
    gradientStart: '#60a5fa',
    gradientEnd: '#f87171',
};

function analysisStudioReducer(state: AnalysisStudioState, action: AnalysisStudioAction): AnalysisStudioState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.payload, chartType: action.payload === 'trend' ? 'line' : 'bar' };
        case 'SET_BATCH_ID':
            return { ...state, selectedBatchId: action.payload };
        case 'SET_DATES':
            return { ...state, ...action.payload };
        case 'SET_DIMENSION':
            return { ...state, dimension: action.payload };
        case 'SET_METRIC':
            return action.payload.target === 1
                ? { ...state, metric: action.payload.metric as MetricType }
                : { ...state, metric2: action.payload.metric };
        case 'SET_VALUE_FIELD':
            return action.payload.target === 1
                ? { ...state, valueField: action.payload.field }
                : { ...state, valueField2: action.payload.field };
        case 'SET_SEGMENT':
            return { ...state, segment: action.payload };
        case 'SET_CHART_TYPE':
            return { ...state, chartType: action.payload };
        case 'SET_LIMIT':
            return { ...state, limit: action.payload };
        case 'SET_SORT_ORDER':
            return { ...state, sortOrder: action.payload };
        case 'TOGGLE_BOOLEAN':
            return { ...state, [action.payload]: !state[action.payload] } as AnalysisStudioState;
        case 'SET_FILTERS':
            return { ...state, filters: action.payload };
        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };
        case 'SET_ANALYSIS_NAME':
            return { ...state, analysisName: action.payload };
        case 'SET_SUCCESS_MESSAGE':
            return { ...state, successMessage: action.payload };
        case 'SET_EXPORT_MENU':
            return { ...state, showExportMenu: action.payload };
        case 'SET_CHART_TITLE':
            return { ...state, chartTitle: action.payload };
        case 'SET_CUSTOM_UNIT':
            return { ...state, customUnit: action.payload };
        case 'SET_COLOR_CONFIG':
            return { ...state, ...action.payload };
        case 'LOAD_ANALYSIS':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

export const useAnalysisStudioLogic = () => {
    const [state, dispatch] = useReducer(analysisStudioReducer, initialState);
    const { batches, currentDataset, addDashboardWidget, savedAnalyses, saveAnalysis, companyLogo, datasets, currentDatasetId, switchDataset } = useData();
    const fields = useMemo(() => currentDataset ? currentDataset.fields : [], [currentDataset]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.fromPivotChart) {
            const { pivotConfig, chartType: incomingChartType } = location.state.fromPivotChart;
            const updates: Partial<AnalysisStudioState> = {};

            if (pivotConfig.rowFields && pivotConfig.rowFields.length > 0) {
                updates.dimension = pivotConfig.rowFields[0];
            }
            if (pivotConfig.valField) {
                updates.valueField = pivotConfig.valField;
                updates.metric = pivotConfig.aggType === 'sum' ? 'sum' : 'count';
            }
            if (incomingChartType) {
                updates.chartType = (incomingChartType === 'column' ? 'column' :
                                    incomingChartType === 'bar' ? 'bar' :
                                    incomingChartType === 'pie' ? 'pie' :
                                    incomingChartType === 'area' ? 'area' :
                                    incomingChartType === 'radar' ? 'radar' :
                                    incomingChartType === 'treemap' ? 'treemap' : 'bar');
            }
            if (pivotConfig.filters) {
                updates.filters = pivotConfig.filters;
            }

            dispatch({ type: 'LOAD_ANALYSIS', payload: updates });
            window.history.replaceState({}, document.title);
        }

        if (!state.selectedBatchId && batches.length > 0) {
            dispatch({ type: 'SET_BATCH_ID', payload: batches[batches.length - 1].id });
        }

        if (batches.length > 0) {
            const sortedDates = batches.map(b => b.date).sort();
            if (!state.startDate) dispatch({ type: 'SET_DATES', payload: { start: sortedDates[0] } });
            if (!state.endDate) dispatch({ type: 'SET_DATES', payload: { end: sortedDates[sortedDates.length - 1] } });
        }

        if (fields.length > 0 && (!state.dimension || !fields.includes(state.dimension))) {
            dispatch({ type: 'SET_DIMENSION', payload: fields[0] });
        }
    }, [batches, fields, location.state, state.selectedBatchId, state.startDate, state.endDate, state.dimension]);

    useEffect(() => {
        if (state.successMessage) {
            const timer = setTimeout(() => dispatch({ type: 'SET_SUCCESS_MESSAGE', payload: null }), 3000);
            return () => clearTimeout(timer);
        }
    }, [state.successMessage]);

    const currentBatch = useMemo(() =>
        batches.find(b => b.id === state.selectedBatchId) || batches[batches.length - 1],
    [batches, state.selectedBatchId]);

    const isDateMetric = useMemo(() => {
        if (!['sum', 'min', 'max'].includes(state.metric) || !state.valueField) return false;
        return currentDataset?.fieldConfigs?.[state.valueField]?.type === 'date';
    }, [state.metric, state.valueField, currentDataset]);

    const isDateMetric2 = useMemo(() => {
        if (state.metric2 === 'none') return false;
        if (!['sum', 'min', 'max'].includes(state.metric2) || !state.valueField2) return false;
        return currentDataset?.fieldConfigs?.[state.valueField2]?.type === 'date';
    }, [state.metric2, state.valueField2, currentDataset]);

    const numericFields = useMemo(() => {
        if (!currentDataset) return [];
        const configuredNumeric = Object.entries(currentDataset.fieldConfigs || {})
            .filter(([, config]) => config.type === 'number')
            .map(([name]) => name);

        if (configuredNumeric.length > 0) {
            return configuredNumeric.filter(f => fields.includes(f));
        }

        if (!currentBatch || currentBatch.rows.length === 0) return [];
        const sample = currentBatch.rows.slice(0, 20);
        return fields.filter(f => {
            return sample.some((r: DataRow) => {
                const val = r[f];
                if (val === undefined || val === '' || val === null) return false;
                return parseSmartNumber(val) !== 0 || val === '0' || val === 0;
            });
        });
    }, [currentBatch, fields, currentDataset]);

    useEffect(() => {
        if (state.metric === 'sum' && !state.valueField && numericFields.length > 0) {
            dispatch({ type: 'SET_VALUE_FIELD', payload: { target: 1, field: numericFields[0] } });
        }
    }, [state.metric, numericFields, state.valueField]);

    useEffect(() => {
        if (state.metric2 === 'sum' && !state.valueField2 && numericFields.length > 0) {
            dispatch({ type: 'SET_VALUE_FIELD', payload: { target: 2, field: numericFields[0] } });
        }
    }, [state.metric2, numericFields, state.valueField2]);

    const getValue = useCallback((row: DataRow, fieldName: string): number => {
        const raw = row[fieldName];
        const unit = currentDataset?.fieldConfigs?.[fieldName]?.unit;
        return parseSmartNumber(raw, unit);
    }, [currentDataset]);

    const handleExportToDashboard = useCallback(() => {
        if (!currentDataset) return;

        let widgetType: 'chart' | 'kpi' = 'chart';
        let widgetChartType: WidgetChartType | undefined = undefined;

        if (state.chartType === 'kpi') {
            widgetType = 'kpi';
        } else {
            if (['bar', 'column', 'line', 'area', 'pie', 'donut', 'radial', 'radar', 'treemap', 'funnel'].includes(state.chartType)) {
                widgetChartType = state.chartType as WidgetChartType;
            } else {
                widgetChartType = 'bar';
            }
        }

        const title = `${state.metric === 'sum' ? 'Somme' : (state.metric === 'distinct' ? 'Distinct' : 'Compte')} par ${state.dimension}`;

        addDashboardWidget({
            title: title,
            type: widgetType,
            size: 'md',
            height: 'md',
            config: {
                source: {
                    datasetId: currentDataset.id,
                    mode: 'latest'
                },
                metric: state.metric === 'distinct' ? 'distinct' : (state.metric === 'sum' ? 'sum' : 'count'),
                dimension: state.dimension,
                valueField: state.metric === 'sum' ? state.valueField : undefined,
                chartType: widgetChartType,
                showTrend: state.mode === 'snapshot',
                limit: state.limit
            }
        });

        dispatch({ type: 'SET_SUCCESS_MESSAGE', payload: "Le graphique a été ajouté au tableau de bord." });
    }, [currentDataset, state, addDashboardWidget]);

    const handleSaveAnalysis = useCallback(() => {
        if (!state.analysisName.trim() || !currentDataset) return;
        saveAnalysis({
            name: state.analysisName,
            type: 'analytics',
            datasetId: currentDataset.id,
            config: {
                mode: state.mode,
                selectedBatchId: state.selectedBatchId,
                startDate: state.startDate,
                endDate: state.endDate,
                dimension: state.dimension,
                metric: state.metric,
                valueField: state.valueField,
                metric2: state.metric2,
                valueField2: state.valueField2,
                segment: state.segment,
                chartType: state.chartType,
                limit: state.limit,
                sortOrder: state.sortOrder,
                isCumulative: state.isCumulative,
                filters: state.filters,
                showForecast: state.showForecast,
                colorMode: state.colorMode,
                colorPalette: state.colorPalette,
                singleColor: state.singleColor,
                gradientStart: state.gradientStart,
                gradientEnd: state.gradientEnd,
                chartTitle: state.chartTitle,
                customUnit: state.customUnit
            }
        });
        dispatch({ type: 'SET_ANALYSIS_NAME', payload: '' });
        dispatch({ type: 'SET_SAVING', payload: false });
        dispatch({ type: 'SET_SUCCESS_MESSAGE', payload: "Vue d'analyse sauvegardée avec succès." });
    }, [state, currentDataset, saveAnalysis]);

    const handleLoadAnalysis = useCallback((id: string) => {
        const analysis = savedAnalyses.find(a => a.id === id);
        if (!analysis || !analysis.config) return;
        const c = analysis.config;

        if (analysis.datasetId && analysis.datasetId !== currentDatasetId) {
            switchDataset(analysis.datasetId);
        }

        dispatch({ type: 'LOAD_ANALYSIS', payload: c });
    }, [savedAnalyses, currentDatasetId, switchDataset]);

    const snapshotData = useMemo(() => {
        if (state.mode !== 'snapshot' || !currentBatch || !state.dimension) return { data: [], series: [] };

        const filteredRows = (currentBatch.rows as DataRow[]).filter((row) => {
            if (state.filters.length === 0) return true;
            return state.filters.every(f => {
                const rowVal = row[f.field];
                const strRowVal = String(rowVal || '').toLowerCase();
                const strFilterVal = String(f.value || '').toLowerCase();

                if (f.operator === 'in') {
                    if (Array.isArray(f.value)) return f.value.length === 0 || f.value.includes(String(rowVal));
                    return true;
                }
                if (f.operator === 'starts_with') {
                    const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                    return values.length === 0 || values.some(v => strRowVal.startsWith(v));
                }
                if (f.operator === 'contains') {
                    const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                    return values.length === 0 || values.some(v => strRowVal.includes(v));
                }
                if (f.operator === 'eq') return strRowVal === strFilterVal;
                if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
                if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
                return true;
            });
        });

        interface AggregationItem {
            name: string;
            count: number;
            distinctSet: Set<string>;
            sum: number;
            min: number;
            max: number;
            count2: number;
            distinctSet2: Set<string>;
            sum2: number;
            min2: number;
            max2: number;
            [key: string]: number | string | Set<string>;
        }

        const agg: Record<string, AggregationItem> = {};
        filteredRows.forEach((row) => {
            const dimVal = String(row[state.dimension] || 'Non défini');
            if (!agg[dimVal]) agg[dimVal] = {
                name: dimVal,
                count: 0, distinctSet: new Set(), sum: 0, min: Infinity, max: -Infinity,
                count2: 0, distinctSet2: new Set(), sum2: 0, min2: Infinity, max2: -Infinity
            };

            agg[dimVal].count++;
            if (state.metric === 'distinct') agg[dimVal].distinctSet.add(row.id);
            if (['sum', 'min', 'max'].includes(state.metric) && state.valueField) {
                const val = getValue(row, state.valueField);
                agg[dimVal].sum += val;
                if (val < agg[dimVal].min) agg[dimVal].min = val;
                if (val > agg[dimVal].max) agg[dimVal].max = val;
            }

            if (state.metric2 !== 'none') {
                agg[dimVal].count2++;
                if (state.metric2 === 'distinct') agg[dimVal].distinctSet2.add(row.id);
                if (['sum', 'min', 'max'].includes(state.metric2) && state.valueField2) {
                    const val = getValue(row, state.valueField2);
                    agg[dimVal].sum2 += val;
                    if (val < agg[dimVal].min2) agg[dimVal].min2 = val;
                    if (val > agg[dimVal].max2) agg[dimVal].max2 = val;
                }
            }

            if (state.segment) {
                const segVal = String(row[state.segment] !== undefined ? row[state.segment] : 'N/A');
                if (!agg[dimVal][segVal]) agg[dimVal][segVal] = 0;
                const currentSegVal = agg[dimVal][segVal] as number;
                if (state.metric === 'sum' && state.valueField) agg[dimVal][segVal] = currentSegVal + getValue(row, state.valueField);
                else agg[dimVal][segVal] = currentSegVal + 1;
            }
        });

        let result = Object.values(agg).map((item) => {
            const { distinctSet, distinctSet2, ...rest } = item;
            let finalVal = 0;
            if (state.metric === 'distinct') finalVal = distinctSet.size;
            else if (state.metric === 'sum') finalVal = parseFloat(item.sum.toFixed(2));
            else if (state.metric === 'min') finalVal = item.min === Infinity ? 0 : item.min;
            else if (state.metric === 'max') finalVal = item.max === -Infinity ? 0 : item.max;
            else finalVal = item.count;

            let finalVal2 = 0;
            if (state.metric2 === 'distinct') finalVal2 = distinctSet2.size;
            else if (state.metric2 === 'sum') finalVal2 = parseFloat(item.sum2.toFixed(2));
            else if (state.metric2 === 'min') finalVal2 = item.min2 === Infinity ? 0 : item.min2;
            else if (state.metric2 === 'max') finalVal2 = item.max2 === -Infinity ? 0 : item.max2;
            else if (state.metric2 === 'count') finalVal2 = item.count2;

            return { ...rest, value: finalVal, value2: finalVal2, size: finalVal };
        });

        if (state.sortOrder === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));
        else if (state.sortOrder === 'asc') result.sort((a, b) => a.value - b.value);
        else result.sort((a, b) => b.value - a.value);

        if (state.limit > 0) result = result.slice(0, state.limit);

        if (state.isCumulative) {
            let runningTotal = 0;
            result = result.map(item => {
                runningTotal += item.value;
                return { ...item, cumulative: parseFloat(runningTotal.toFixed(2)) };
            });
        }

        const series = state.segment ? Array.from(new Set(filteredRows.map(r => String(r[state.segment] !== undefined ? r[state.segment] : 'N/A')))).sort() : [];

        return { data: result as (typeof result[0] & { [key: string]: number | string })[], series };
    }, [state, currentBatch, getValue]);

    const trendData = useMemo(() => {
        if (state.mode !== 'trend' || !state.dimension) return { data: [], series: [] };

        const targetBatches = batches
            .filter(b => b.datasetId === currentDataset?.id)
            .filter(b => b.date >= state.startDate && b.date <= state.endDate)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (targetBatches.length === 0) return { data: [], series: [] };

        const globalCounts: Record<string, number> = {};

        targetBatches.forEach(batch => {
            const batchRows = (batch.rows as DataRow[]).filter((row) => {
                if (state.filters.length === 0) return true;
                return state.filters.every(f => {
                    const rowVal = row[f.field];
                    const strRowVal = String(rowVal || '').toLowerCase();
                    const strFilterVal = String(f.value || '').toLowerCase();

                    if (f.operator === 'in') {
                        if (Array.isArray(f.value)) return f.value.length === 0 || f.value.includes(String(rowVal));
                        return true;
                    }
                    if (f.operator === 'starts_with') {
                        const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                        return values.length === 0 || values.some(v => strRowVal.startsWith(v));
                    }
                    if (f.operator === 'contains') {
                        const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                        return values.length === 0 || values.some(v => strRowVal.includes(v));
                    }
                    if (f.operator === 'eq') return strRowVal === strFilterVal;
                    if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
                    if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
                    return true;
                });
            });

            batchRows.forEach((row) => {
                const val = String(row[state.dimension] || 'Non défini');
                let increment = 1;
                if (state.metric === 'sum' && state.valueField) increment = getValue(row, state.valueField);
                globalCounts[val] = (globalCounts[val] || 0) + increment;
            });
        });

        const topSeries = Object.entries(globalCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, state.limit)
            .map(e => e[0]);

        const timeData = targetBatches.map(batch => {
            const batchRows = (batch.rows as DataRow[]).filter((row) => {
                if (state.filters.length === 0) return true;
                return state.filters.every(f => {
                    const rowVal = row[f.field];
                    const strRowVal = String(rowVal || '').toLowerCase();
                    const strFilterVal = String(f.value || '').toLowerCase();

                    if (f.operator === 'in') {
                        if (Array.isArray(f.value)) return f.value.length === 0 || f.value.includes(String(rowVal));
                        return true;
                    }
                    if (f.operator === 'starts_with') {
                        const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                        return values.length === 0 || values.some(v => strRowVal.startsWith(v));
                    }
                    if (f.operator === 'contains') {
                        const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                        return values.length === 0 || values.some(v => strRowVal.includes(v));
                    }
                    if (f.operator === 'eq') return strRowVal === strFilterVal;
                    if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
                    if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
                    return true;
                });
            });

            interface TimePoint {
                date: string;
                displayDate: string;
                total: number | null;
                total2: number;
                forecast?: number;
                [key: string]: number | string | null | undefined;
            }

            const point: TimePoint = {
                date: batch.date,
                displayDate: formatDateFr(batch.date),
                total: 0,
                total2: 0
            };

            topSeries.forEach(s => {
                point[s] = 0;
                if (state.metric2 !== 'none') point[s + '_m2'] = 0;
            });

            batchRows.forEach((row) => {
                const val = String(row[state.dimension] || 'Non défini');
                if (topSeries.includes(val)) {
                    let qty = 1;
                    if (['sum', 'min', 'max'].includes(state.metric) && state.valueField) qty = getValue(row, state.valueField);

                    if (state.metric === 'min') {
                        point[val] = (point[val] === 0 || point[val] === undefined) ? qty : Math.min(point[val] as number, qty);
                    } else if (state.metric === 'max') {
                        point[val] = (point[val] === 0 || point[val] === undefined) ? qty : Math.max(point[val] as number, qty);
                    } else {
                        point[val] = parseFloat((( (point[val] as number) || 0) + qty).toFixed(2));
                    }

                    if (state.metric2 !== 'none') {
                        let qty2 = 1;
                        if (['sum', 'min', 'max'].includes(state.metric2) && state.valueField2) qty2 = getValue(row, state.valueField2);

                        const m2Key = val + '_m2';
                        if (state.metric2 === 'min') {
                            point[m2Key] = (point[m2Key] === 0 || point[m2Key] === undefined) ? qty2 : Math.min(point[m2Key] as number, qty2);
                        } else if (state.metric2 === 'max') {
                            point[m2Key] = (point[m2Key] === 0 || point[m2Key] === undefined) ? qty2 : Math.max(point[m2Key] as number, qty2);
                        } else {
                            point[m2Key] = parseFloat((( (point[m2Key] as number) || 0) + qty2).toFixed(2));
                        }
                    }
                }

                let mainVal = 1;
                if (['sum', 'min', 'max'].includes(state.metric) && state.valueField) mainVal = getValue(row, state.valueField);

                if (state.metric === 'min') {
                    point.total = (point.total === 0 || point.total === null) ? mainVal : Math.min(point.total, mainVal);
                } else if (state.metric === 'max') {
                    point.total = (point.total === 0 || point.total === null) ? mainVal : Math.max(point.total, mainVal);
                } else {
                    (point.total as number) += mainVal;
                }

                if (state.metric2 !== 'none') {
                    let secVal = 1;
                    if (['sum', 'min', 'max'].includes(state.metric2) && state.valueField2) secVal = getValue(row, state.valueField2);

                    if (state.metric2 === 'min') {
                        point.total2 = (point.total2 === 0) ? secVal : Math.min(point.total2, secVal);
                    } else if (state.metric2 === 'max') {
                        point.total2 = (point.total2 === 0) ? secVal : Math.max(point.total2, secVal);
                    } else {
                        point.total2 += secVal;
                    }
                }
            });

            point.total = parseFloat((point.total as number).toFixed(2));
            if (state.metric2 !== 'none' && point.total2 !== undefined) point.total2 = parseFloat(point.total2.toFixed(2));
            return point;
        });

        if (state.showForecast && timeData.length >= 2) {
            const totals = timeData.map(d => d.total).filter((v): v is number => v !== null);
            const { slope, intercept } = calculateLinearRegression(totals);
            timeData.forEach((d, i) => {
                d.forecast = parseFloat((intercept + slope * i).toFixed(2));
            });
            const nextIndex = timeData.length;
            const nextTotal = intercept + slope * nextIndex;
            const nextDate = new Date(targetBatches[targetBatches.length-1].date);
            nextDate.setMonth(nextDate.getMonth() + 1);
            timeData.push({
                date: 'prediction',
                displayDate: '(Proj.)',
                total: null,
                total2: 0,
                forecast: parseFloat(nextTotal.toFixed(2))
            });
        }

        return { data: timeData, series: topSeries };
    }, [state, batches, currentDataset, getValue]);

    const chartColors = useMemo(() => {
        const dataCount = state.mode === 'snapshot' ? (state.segment ? snapshotData.series.length : snapshotData.data.length) : trendData.series.length;
        const count = Math.max(dataCount, 1);

        if (state.colorMode === 'single') {
            return Array(count).fill(state.singleColor);
        } else if (state.colorMode === 'gradient') {
            return generateGradient(state.gradientStart, state.gradientEnd, count);
        } else {
            return getChartColors(count, state.colorPalette);
        }
    }, [state.colorMode, state.colorPalette, state.singleColor, state.gradientStart, state.gradientEnd, snapshotData, trendData, state.mode, state.segment]);

    const insightText = useMemo(() => {
        const unitLabel = (state.metric === 'sum' && state.valueField && currentDataset?.fieldConfigs?.[state.valueField]?.unit)
            ? ` ${currentDataset.fieldConfigs[state.valueField].unit}`
            : '';

        if (state.mode === 'snapshot') {
            if (!snapshotData.data || snapshotData.data.length === 0) return "Aucune donnée.";
            const top = snapshotData.data[0];
            let text = `En date du ${formatDateFr(currentBatch?.date || '')}, "${top.name}" domine avec ${top.value.toLocaleString()}${unitLabel}.`;

            if (state.metric2 !== 'none' && top.value2 !== undefined) {
                const unitLabel2 = state.customUnit ? ` ${state.customUnit}` : (state.metric2 === 'sum' && state.valueField2 && currentDataset?.fieldConfigs?.[state.valueField2]?.unit)
                    ? ` ${currentDataset.fieldConfigs[state.valueField2].unit}`
                    : '';
                text += ` La métrique secondaire affiche ${top.value2.toLocaleString()}${unitLabel2}.`;
            }
            return text;
        } else {
            if (trendData.data.length === 0) return "Aucune donnée sur la période.";
            const validPoints = trendData.data.filter((d) => d.date !== 'prediction');
            if (validPoints.length === 0) return "Données insuffisantes.";
            const first = validPoints[0];
            const last = validPoints[validPoints.length - 1];
            const growth = parseFloat(((last.total as number) - (first.total as number)).toFixed(2));
            let text = `Sur la période, le volume a évolué de ${growth > 0 ? '+' : ''}${growth.toLocaleString()}${unitLabel}.`;

            if (state.metric2 !== 'none') {
                const growth2 = parseFloat(((last.total2 || 0) - (first.total2 || 0)).toFixed(2));
                const unitLabel2 = state.customUnit ? ` ${state.customUnit}` : (state.metric2 === 'sum' && state.valueField2 && currentDataset?.fieldConfigs?.[state.valueField2]?.unit)
                    ? ` ${currentDataset.fieldConfigs[state.valueField2].unit}`
                    : '';
                text += ` La métrique secondaire a varié de ${growth2 > 0 ? '+' : ''}${growth2.toLocaleString()}${unitLabel2}.`;
            }
            return text;
        }
    }, [state.mode, snapshotData, trendData, currentBatch, state.metric, state.valueField, state.metric2, state.valueField2, currentDataset, state.customUnit]);

    const handleExportInteractiveHTML = useCallback(() => {
        const title = state.chartTitle || `${state.mode === 'snapshot' ? 'Analyse' : 'Évolution'} ${state.dimension}`;
        const unit = state.customUnit || (state.metric === 'sum' && state.valueField ? currentDataset?.fieldConfigs?.[state.valueField]?.unit : '');

        interface PlotlyTrace {
            x: string[];
            y: (number | null)[];
            name: string;
            type: string;
            fill?: string;
            orientation?: 'v' | 'h';
            marker?: { color: string | string[] };
            mode?: string;
            yaxis?: string;
            line?: { color: string; width: number; dash?: string };
            hole?: number;
        }

        const plotlyData: PlotlyTrace[] = [];
        const layout: Record<string, any> = {
            title: title,
            font: { family: 'Inter, system-ui, sans-serif', size: 12 },
            showlegend: true,
            template: 'plotly_white',
            margin: { t: 80, b: 80, l: 80, r: 80 }
        };

        if (state.mode === 'snapshot') {
            const labels = snapshotData.data.map((d) => d.name);
            if (state.segment && snapshotData.series.length > 0) {
                snapshotData.series.forEach((s: string, idx: number) => {
                    plotlyData.push({
                        x: labels,
                        y: snapshotData.data.map((d) => (d[s] as number) || 0),
                        name: s,
                        type: state.chartType.includes('bar') ? 'bar' : (state.chartType.includes('area') ? 'scatter' : 'bar'),
                        fill: state.chartType.includes('area') ? 'tonexty' : undefined,
                        orientation: state.chartType.includes('bar') && !state.chartType.includes('column') ? 'h' : 'v',
                        marker: { color: chartColors[idx % chartColors.length] }
                    });
                });
                if (state.chartType.includes('stacked') || state.chartType.includes('percent')) {
                    layout.barmode = 'stack';
                    if (state.chartType.includes('percent')) layout.barnorm = 'percent';
                }
            } else {
                plotlyData.push({
                    x: labels,
                    y: snapshotData.data.map((d) => d.value),
                    name: state.metric === 'sum' ? state.valueField : 'Valeur 1',
                    type: state.chartType.includes('bar') ? 'bar' : (state.chartType.includes('area') ? 'scatter' : (state.chartType.includes('pie') || state.chartType.includes('donut') ? 'pie' : 'bar')),
                    marker: { color: chartColors as string[] },
                    hole: state.chartType === 'donut' ? 0.4 : undefined,
                    orientation: state.chartType.includes('bar') && !state.chartType.includes('column') ? 'h' : 'v'
                });
                if (state.metric2 !== 'none') {
                    plotlyData.push({
                        x: labels,
                        y: snapshotData.data.map((d) => d.value2),
                        name: state.metric2 === 'sum' ? state.valueField2 : 'Valeur 2',
                        type: 'scatter',
                        mode: 'lines+markers',
                        yaxis: 'y2',
                        line: { color: '#6366f1', width: 3 }
                    });
                    layout.yaxis2 = { title: 'Secondaire', overlaying: 'y', side: 'right' };
                }
            }
        } else {
            const dates = trendData.data.map((d) => d.displayDate);
            trendData.series.forEach((s: string, idx: number) => {
                plotlyData.push({
                    x: dates,
                    y: trendData.data.map((d) => (d[s] as number) || 0),
                    name: s,
                    type: state.chartType.includes('column') ? 'bar' : 'scatter',
                    mode: 'lines+markers',
                    fill: state.chartType.includes('area') ? 'tonexty' : undefined,
                    marker: { color: chartColors[idx % chartColors.length] }
                });
            });
            if (state.metric2 !== 'none') {
                plotlyData.push({
                    x: dates,
                    y: trendData.data.map((d) => d.total2 || 0),
                    name: state.metric2 === 'sum' ? `Total ${state.valueField2}` : 'Total 2',
                    type: 'scatter',
                    mode: 'lines+markers',
                    yaxis: 'y2',
                    line: { color: '#6366f1', width: 3, dash: 'dash' }
                });
                layout.yaxis2 = { title: 'Secondaire', overlaying: 'y', side: 'right' };
            }
            if (state.chartType.includes('stacked') || state.chartType.includes('percent')) {
                layout.barmode = 'stack';
            }
        }

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .header { border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; padding-bottom: 15px; display: flex; align-items: center; gap: 20px; }
    .logo { height: 40px; width: auto; object-fit: contain; }
    h1 { font-size: 1.5rem; color: #1e293b; margin: 0; flex: 1; }
    .metadata { font-size: 0.875rem; color: #64748b; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${getSafeLogo(companyLogo) ? `<img src="${getSafeLogo(companyLogo)}" class="logo" alt="Logo" />` : ''}
      <h1>${title}</h1>
    </div>
    <div class="metadata">Exporté le ${new Date().toLocaleDateString()} | Unité: ${unit || 'Standard'}</div>
    <div id="chart" style="width:100%;height:600px;"></div>
  </div>
  <script>
    const data = ${JSON.stringify(plotlyData)};
    const layout = ${JSON.stringify(layout)};
    Plotly.newPlot('chart', data, layout, {responsive: true});
  </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = (`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
    }, [state, companyLogo, snapshotData, trendData, currentDataset, chartColors]);

    const handleExport = useCallback(async (format: 'pdf' | 'html' | 'png' | 'xlsx', pdfMode: 'A4' | 'adaptive' = 'adaptive') => {
        dispatch({ type: 'SET_EXPORT_MENU', payload: false });
        const title = state.chartTitle || `${state.mode === 'snapshot' ? 'Analyse' : 'Évolution'} ${state.dimension}`;

        if (format === 'pdf') {
            exportView(format, 'analytics-export-container', title, companyLogo, pdfMode);
        } else if (format === 'html') {
            handleExportInteractiveHTML();
        } else if (format === 'png') {
            const element = document.getElementById('analytics-export-container');
            if (element) {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `analyse_${new Date().toISOString().split('T')[0]}.png`;
                link.click();
            }
        } else if (format === 'xlsx') {
            const data = state.mode === 'snapshot' ? snapshotData.data : trendData.data;
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
            XLSX.writeFile(workbook, `analyse_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    }, [state, companyLogo, snapshotData, trendData, handleExportInteractiveHTML]);

    return {
        state,
        dispatch,
        batches,
        currentDataset,
        datasets,
        currentDatasetId,
        switchDataset,
        fields,
        numericFields,
        currentBatch,
        snapshotData,
        trendData,
        chartColors,
        insightText,
        companyLogo,
        savedAnalyses,
        isDateMetric,
        isDateMetric2,
        handlers: {
            handleExportToDashboard,
            handleSaveAnalysis,
            handleLoadAnalysis,
            handleExport,
            navigate
        }
    };
};
