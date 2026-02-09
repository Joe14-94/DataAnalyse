import { useReducer, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getSafeLogo } from '../utils';
import {
  ChartType,
  ColorPalette,
  ColorMode,
  transformPivotToChartData,
  transformPivotToTreemapData,
  transformPivotToSunburstData,
  transformPivotToHierarchicalTreemap,
  generateChartMetadata,
  getChartColors,
  generateGradient,
  sunburstDataToD3Hierarchy
} from '../logic/pivotToChart';
import { PivotResult, PivotConfig, TemporalComparisonConfig } from '../types';
import { useWidgets, useDatasets } from '../context/DataContext';

interface UseChartModalLogicProps {
    pivotData: PivotResult;
    pivotConfig: PivotConfig;
    isTemporalMode: boolean;
    temporalComparison: TemporalComparisonConfig | null;
    selectedBatchId?: string;
    onClose: () => void;
}

interface ChartModalState {
    showExportMenu: boolean;
    selectedChartType: ChartType;
    limit: number;
    sortBy: 'name' | 'value' | 'none';
    sortOrder: 'asc' | 'desc';
    hierarchyLevel: number | undefined;
    updateMode: 'fixed' | 'latest';
    colorMode: ColorMode;
    colorPalette: ColorPalette;
    singleColor: string;
    gradientStart: string;
    gradientEnd: string;
    treemapDrillPath: string[];
    sunburstTitle: string;
    showCenterTotal: boolean;
    showSunburstLegend: boolean;
}

type ChartModalAction =
    | { type: 'SET_EXPORT_MENU'; payload: boolean }
    | { type: 'SET_CHART_TYPE'; payload: ChartType }
    | { type: 'SET_LIMIT'; payload: number }
    | { type: 'SET_SORT_BY'; payload: 'name' | 'value' | 'none' }
    | { type: 'SET_SORT_ORDER'; payload: 'asc' | 'desc' }
    | { type: 'SET_HIERARCHY_LEVEL'; payload: number | undefined }
    | { type: 'SET_UPDATE_MODE'; payload: 'fixed' | 'latest' }
    | { type: 'SET_COLOR_MODE'; payload: ColorMode }
    | { type: 'SET_COLOR_PALETTE'; payload: ColorPalette }
    | { type: 'SET_SINGLE_COLOR'; payload: string }
    | { type: 'SET_GRADIENT_START'; payload: string }
    | { type: 'SET_GRADIENT_END'; payload: string }
    | { type: 'SET_TREEMAP_DRILL_PATH'; payload: string[] }
    | { type: 'SET_SUNBURST_TITLE'; payload: string }
    | { type: 'SET_SHOW_CENTER_TOTAL'; payload: boolean }
    | { type: 'SET_SHOW_SUNBURST_LEGEND'; payload: boolean }
    | { type: 'RESET_INITIAL'; payload: Partial<ChartModalState> };

const initialState: ChartModalState = {
    showExportMenu: false,
    selectedChartType: 'bar',
    limit: 0,
    sortBy: 'value',
    sortOrder: 'desc',
    hierarchyLevel: undefined,
    updateMode: 'latest',
    colorMode: 'multi',
    colorPalette: 'default',
    singleColor: '#0066cc',
    gradientStart: '#0066cc',
    gradientEnd: '#e63946',
    treemapDrillPath: [],
    sunburstTitle: 'Analyse de la répartition',
    showCenterTotal: true,
    showSunburstLegend: true,
};

function chartModalReducer(state: ChartModalState, action: ChartModalAction): ChartModalState {
    switch (action.type) {
        case 'SET_EXPORT_MENU': return { ...state, showExportMenu: action.payload };
        case 'SET_CHART_TYPE': return { ...state, selectedChartType: action.payload, treemapDrillPath: [] };
        case 'SET_LIMIT': return { ...state, limit: action.payload };
        case 'SET_SORT_BY': return { ...state, sortBy: action.payload };
        case 'SET_SORT_ORDER': return { ...state, sortOrder: action.payload };
        case 'SET_HIERARCHY_LEVEL': return { ...state, hierarchyLevel: action.payload };
        case 'SET_UPDATE_MODE': return { ...state, updateMode: action.payload };
        case 'SET_COLOR_MODE': return { ...state, colorMode: action.payload };
        case 'SET_COLOR_PALETTE': return { ...state, colorPalette: action.payload };
        case 'SET_SINGLE_COLOR': return { ...state, singleColor: action.payload };
        case 'SET_GRADIENT_START': return { ...state, gradientStart: action.payload };
        case 'SET_GRADIENT_END': return { ...state, gradientEnd: action.payload };
        case 'SET_TREEMAP_DRILL_PATH': return { ...state, treemapDrillPath: action.payload };
        case 'SET_SUNBURST_TITLE': return { ...state, sunburstTitle: action.payload };
        case 'SET_SHOW_CENTER_TOTAL': return { ...state, showCenterTotal: action.payload };
        case 'SET_SHOW_SUNBURST_LEGEND': return { ...state, showSunburstLegend: action.payload };
        case 'RESET_INITIAL': return { ...state, ...action.payload };
        default: return state;
    }
}

export const useChartModalLogic = ({
    pivotData,
    pivotConfig,
    isTemporalMode,
    temporalComparison,
    selectedBatchId,
    onClose
}: UseChartModalLogicProps) => {
    const navigate = useNavigate();
    const { addDashboardWidget } = useWidgets();
    const { currentDatasetId } = useDatasets();
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const [state, dispatch] = useReducer(chartModalReducer, initialState);

    // Générer les métadonnées du graphique
    const metadata = useMemo(() => {
        return generateChartMetadata(pivotConfig, pivotData);
    }, [pivotConfig, pivotData]);

    // Initialisation
    useEffect(() => {
        dispatch({ type: 'RESET_INITIAL', payload: { selectedChartType: metadata.suggestedType } });
    }, [metadata.suggestedType]);

    // Transformer les données
    const chartData = useMemo(() => {
        if (state.selectedChartType === 'treemap') {
            return transformPivotToTreemapData(pivotData, pivotConfig, state.hierarchyLevel);
        } else if (state.selectedChartType === 'sunburst') {
            return [];
        } else {
            return transformPivotToChartData(pivotData, pivotConfig, {
                chartType: state.selectedChartType,
                limit: state.limit,
                excludeSubtotals: true,
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
                showOthers: state.limit > 0,
                hierarchyLevel: state.hierarchyLevel
            });
        }
    }, [pivotData, pivotConfig, state.selectedChartType, state.limit, state.sortBy, state.sortOrder, state.hierarchyLevel]);

    const colors = useMemo(() => {
        const count = Math.max(metadata.seriesNames.length, chartData?.length || 0, 1);
        if (state.colorMode === 'single') return Array(count).fill(state.singleColor);
        if (state.colorMode === 'gradient') return generateGradient(state.gradientStart, state.gradientEnd, count);
        return getChartColors(count, state.colorPalette);
    }, [state.colorMode, state.colorPalette, state.singleColor, state.gradientStart, state.gradientEnd, metadata.seriesNames.length, chartData?.length]);

    const sunburstData = useMemo(() => {
        if (state.selectedChartType !== 'sunburst') return null;
        const level1Keys = new Set<string>();
        pivotData.displayRows.forEach((row: any) => {
            if (row.keys && row.keys.length > 0) level1Keys.add(row.keys[0]);
        });

        let colorCount = level1Keys.size;
        if (state.limit > 0 && colorCount > state.limit) colorCount = state.limit + 1;

        const baseColors = state.colorMode === 'single'
            ? Array(colorCount).fill(state.singleColor)
            : state.colorMode === 'gradient'
                ? generateGradient(state.gradientStart, state.gradientEnd, colorCount)
                : getChartColors(colorCount, state.colorPalette);

        return transformPivotToSunburstData(pivotData, pivotConfig, baseColors, {
            limit: state.limit > 0 ? state.limit : undefined,
            showOthers: state.limit > 0
        });
    }, [pivotData, pivotConfig, state.selectedChartType, state.limit, state.colorMode, state.colorPalette, state.singleColor, state.gradientStart, state.gradientEnd]);

    const sunburstColors = useMemo(() => {
        if (state.selectedChartType !== 'sunburst' || !sunburstData) return colors;
        const colorCount = sunburstData.tree.length;
        if (state.colorMode === 'single') return Array(colorCount).fill(state.singleColor);
        if (state.colorMode === 'gradient') return generateGradient(state.gradientStart, state.gradientEnd, colorCount);
        return getChartColors(colorCount, state.colorPalette);
    }, [state.selectedChartType, sunburstData, state.colorMode, state.colorPalette, state.singleColor, state.gradientStart, state.gradientEnd, colors]);

    const d3HierarchyData = useMemo(() => {
        if (!sunburstData) return null;
        return sunburstDataToD3Hierarchy(sunburstData);
    }, [sunburstData]);

    const hierarchicalTreemapData = useMemo(() => {
        if (state.selectedChartType !== 'treemap') return null;
        const baseColors = state.colorMode === 'single'
            ? Array(9).fill(state.singleColor)
            : state.colorMode === 'gradient'
                ? generateGradient(state.gradientStart, state.gradientEnd, 9)
                : getChartColors(9, state.colorPalette);
        return transformPivotToHierarchicalTreemap(pivotData, pivotConfig, baseColors, {
            limit: state.limit > 0 ? state.limit : undefined,
            showOthers: state.limit > 0
        });
    }, [pivotData, pivotConfig, state.selectedChartType, state.limit, state.colorMode, state.colorPalette, state.singleColor, state.gradientStart, state.gradientEnd]);

    const currentTreemapData = useMemo(() => {
        if (!hierarchicalTreemapData) return null;
        if (state.treemapDrillPath.length === 0) return hierarchicalTreemapData;

        let current: any[] = hierarchicalTreemapData;
        for (const segment of state.treemapDrillPath) {
            const found = current.find((n: any) => n.name === segment);
            if (found?.children) current = found.children;
            else break;
        }
        return current;
    }, [hierarchicalTreemapData, state.treemapDrillPath]);

    const handleTreemapDrill = useCallback((name: string) => {
        const current = state.treemapDrillPath.length === 0
            ? hierarchicalTreemapData
            : (() => {
                let data: any[] = hierarchicalTreemapData || [];
                for (const seg of state.treemapDrillPath) {
                    const found = data.find((n: any) => n.name === seg);
                    if (found?.children) data = found.children;
                }
                return data;
            })();
        const node = current?.find((n: any) => n.name === name);
        if (node?.children && node.children.length > 0) {
            dispatch({ type: 'SET_TREEMAP_DRILL_PATH', payload: [...state.treemapDrillPath, name] });
        }
    }, [hierarchicalTreemapData, state.treemapDrillPath]);

    const handleTreemapBreadcrumb = useCallback((index: number) => {
        dispatch({ type: 'SET_TREEMAP_DRILL_PATH', payload: state.treemapDrillPath.slice(0, index) });
    }, [state.treemapDrillPath]);

    const handleChartTypeChange = useCallback((type: ChartType) => {
        dispatch({ type: 'SET_CHART_TYPE', payload: type });
    }, []);

    const handleCreateWidget = useCallback(() => {
        if (!currentDatasetId) return;
        const hasFilters = pivotConfig.filters && pivotConfig.filters.length > 0;
        const shouldUseSpecificBatch = hasFilters || state.updateMode === 'fixed';

        const newWidget = {
            title: `Graphique TCD : ${pivotConfig.valField}`,
            type: 'chart' as const,
            size: 'md' as const,
            height: 'lg' as const,
            config: {
                metric: (pivotConfig.aggType === 'list' ? 'count' : pivotConfig.aggType) as 'count' | 'sum' | 'avg' | 'distinct',
                chartType: state.selectedChartType,
                source: {
                    datasetId: currentDatasetId,
                    mode: isTemporalMode ? 'temporal' as const : (shouldUseSpecificBatch ? 'specific' : 'latest') as 'latest' | 'specific',
                    batchId: (!isTemporalMode && shouldUseSpecificBatch) ? selectedBatchId : undefined
                },
                pivotChart: {
                    pivotConfig,
                    isTemporalMode,
                    temporalComparison,
                    updateMode: (shouldUseSpecificBatch ? 'fixed' : state.updateMode) as 'fixed' | 'latest',
                    chartType: state.selectedChartType,
                    hierarchyLevel: state.hierarchyLevel,
                    limit: state.limit > 0 ? state.limit : undefined,
                    sortBy: state.sortBy,
                    sortOrder: state.sortOrder,
                    colorMode: state.colorMode,
                    colorPalette: state.colorPalette,
                    singleColor: state.singleColor,
                    gradientStart: state.gradientStart,
                    gradientEnd: state.gradientEnd,
                    sunburstConfig: state.selectedChartType === 'sunburst' ? {
                        title: state.sunburstTitle,
                        showCenterTotal: state.showCenterTotal,
                        showLegend: state.showSunburstLegend
                    } : undefined
                }
            }
        };

        addDashboardWidget(newWidget);
        onClose();
        navigate('/dashboard');
    }, [currentDatasetId, pivotConfig, state, isTemporalMode, temporalComparison, selectedBatchId, addDashboardWidget, onClose, navigate]);

    const handleOpenInAnalytics = useCallback(() => {
        navigate('/analytics', {
            state: {
                fromPivotChart: {
                    pivotData,
                    pivotConfig,
                    chartType: state.selectedChartType,
                    chartData
                }
            }
        });
    }, [navigate, pivotData, pivotConfig, state.selectedChartType, chartData]);

    const handleExportHTML = useCallback((companyLogo?: string) => {
        if (!chartContainerRef.current) return;

        const title = `Graphique TCD - ${pivotConfig.valField}`;

        // Special handling for Sunburst with D3.js
        if (state.selectedChartType === 'sunburst' && d3HierarchyData) {
            const dataJson = JSON.stringify(d3HierarchyData);
            const colorsJson = JSON.stringify(sunburstColors);
            const rowFieldsJson = JSON.stringify(pivotConfig.rowFields);
            const unit = pivotConfig.valField || '';
            const safeLogo = getSafeLogo(companyLogo);

            const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; display: flex; align-items: center; gap: 20px; }
    .logo { height: 40px; width: auto; object-fit: contain; }
    h1 { margin: 0; color: #1e293b; font-size: 24px; flex: 1; }
    .metadata { margin-top: 10px; font-size: 12px; color: #64748b; }
    .chart-container { margin: 30px 0; display: flex; justify-content: center; align-items: center; min-height: 600px; }
    .tooltip { position: fixed; pointer-events: none; background: white; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 8px; padding: 12px; z-index: 9999; opacity: 0; transition: opacity 0.2s; }
    .tooltip .font-bold { font-weight: 600; }
    .tooltip .text-sm { font-size: 14px; }
    .tooltip .text-xs { font-size: 12px; }
    .tooltip .mb-1 { margin-bottom: 4px; }
    .tooltip .mt-2 { margin-top: 8px; }
    .tooltip .pt-1 { padding-top: 4px; }
    .tooltip .border-t { border-top: 1px solid #e2e8f0; }
    .tooltip .text-gray-800 { color: #1e293b; }
    .tooltip .text-gray-600 { color: #475569; }
    .tooltip .text-gray-400 { color: #94a3b8; }
    .tooltip .text-blue-600 { color: #2563eb; }
    .tooltip .font-semibold { font-weight: 600; }
    .tooltip .font-medium { font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${safeLogo ? `<img src="${safeLogo}" class="logo" alt="Logo" />` : ''}
      <h1>${title}</h1>
    </div>
    <div class="metadata">
      <p>Champ: ${pivotConfig.valField} | Agrégation: ${pivotConfig.aggType}</p>
      <p>Exporté le: ${new Date().toLocaleString('fr-FR')}</p>
    </div>
    <div class="chart-container" id="chart-container">
      <svg id="sunburst-svg"></svg>
      <div id="tooltip" class="tooltip"></div>
    </div>
  </div>

  <script>
    const data = ${dataJson};
    const colors = ${colorsJson};
    const rowFields = ${rowFieldsJson};
    const unit = '${unit}';
    const sunburstTitle = '${state.sunburstTitle || ''}';
    const width = 800;
    const height = 800;

    // Render Sunburst
    const radius = Math.min(width, height) / 2;
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const hierarchy = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const level1Nodes = hierarchy.children || [];
    const colorMap = new Map();
    level1Nodes.forEach((node, idx) => {
      colorMap.set(node.data.name, colors[idx % colors.length] || colorScale(idx.toString()));
    });

    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchy);
    const totalValue = root.value || 1;

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    const svg = d3.select('#sunburst-svg')
      .attr('viewBox', \`-\${width / 2} -\${height / 2} \${width} \${height}\`)
      .style('width', '100%')
      .style('height', '100%')
      .style('font', '10px sans-serif');

    const tooltip = d3.select('#tooltip');

    svg.append('g')
      .selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('fill', d => {
        let ancestor = d;
        while (ancestor.depth > 1) ancestor = ancestor.parent;
        const baseColor = colorMap.get(ancestor.data.name) || colorScale(ancestor.data.name);

        if (d.depth === 1) return baseColor;
        else if (d.depth === 2) return d3.color(baseColor)?.brighter(0.3)?.formatHex() || baseColor;
        else if (d.depth === 3) return d3.color(baseColor)?.brighter(0.6)?.formatHex() || baseColor;
        return baseColor;
      })
      .attr('d', arc)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).style('opacity', 0.7);

        const value = d.value?.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const percent = ((d.value || 0) / totalValue * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
        const levelLabel = rowFields[d.depth - 1] || \`Niveau \${d.depth}\`;

        let content = \`
          <div class="font-bold text-sm mb-1 text-gray-800">\${d.data.name}</div>
          <div class="text-xs text-gray-600">Niveau: \${levelLabel}</div>
          <div class="text-xs text-gray-600">Valeur: <span class="font-semibold text-blue-600">\${value} \${unit}</span></div>
          <div class="text-xs text-gray-600">Part: <span class="font-medium text-gray-800">\${percent}%</span></div>
        \`;

        if (d.depth > 1 && d.parent) {
          content += \`<div class="mt-2 text-xs text-gray-400 border-t pt-1">Parent: \${d.parent.data.name}</div>\`;
        }

        tooltip
          .style('opacity', 1)
          .html(content)
          .style('left', \`\${event.clientX + 10}px\`)
          .style('top', \`\${event.clientY + 10}px\`);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', \`\${event.clientX + 10}px\`)
          .style('top', \`\${event.clientY + 10}px\`);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).style('opacity', 1);
        tooltip.style('opacity', 0);
      });

    svg.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
      .join('text')
      .attr('transform', function(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return \`rotate(\${x - 90}) translate(\${y},0) rotate(\${x < 180 ? 0 : 180})\`;
      })
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)')
      .text(d => {
        const name = d.data.name || '';
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
      });

    if (sunburstTitle) {
      svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('fill', '#475569')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.05em')
        .text(sunburstTitle);
    }

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', sunburstTitle ? '0.8em' : '0')
      .attr('font-size', '24px')
      .attr('font-weight', '700')
      .attr('fill', '#1e293b')
      .text('Total');

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', sunburstTitle ? '2.2em' : '1.5em')
      .attr('font-size', '16px')
      .attr('font-weight', '500')
      .attr('fill', '#475569')
      .text(\`\${root.value?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} \${unit}\`);
  </script>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `graphique_sunburst_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            dispatch({ type: 'SET_EXPORT_MENU', payload: false });
            return;
        }

        const chartHtml = chartContainerRef.current.innerHTML;
        const safeLogo = getSafeLogo(companyLogo);
        const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/recharts@2/dist/recharts.global.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; display: flex; align-items: center; gap: 20px; }
    .logo { height: 40px; width: auto; object-fit: contain; }
    h1 { margin: 0; color: #1e293b; font-size: 24px; flex: 1; }
    .metadata { margin-top: 10px; font-size: 12px; color: #64748b; }
    .chart-container { margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${safeLogo ? `<img src="${safeLogo}" class="logo" alt="Logo" />` : ''}
      <h1>${title}</h1>
    </div>
    <div class="metadata">
      <p>Champ: ${pivotConfig.valField} | Agrégation: ${pivotConfig.aggType}</p>
      <p>Exporté le: ${new Date().toLocaleString('fr-FR')}</p>
    </div>
    <div class="chart-container">
      ${chartHtml}
    </div>
  </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graphique_tcd_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        dispatch({ type: 'SET_EXPORT_MENU', payload: false });
    }, [pivotConfig, state.selectedChartType, d3HierarchyData, sunburstColors, state.sunburstTitle]);

    const handleExportPNG = useCallback(async () => {
        if (!chartContainerRef.current) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(chartContainerRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `graphique_tcd_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            dispatch({ type: 'SET_EXPORT_MENU', payload: false });
        } catch (error) {
            console.error('Erreur export PNG:', error);
        }
    }, []);

    const handleExportPDF = useCallback(async (mode: 'A4' | 'adaptive', companyLogo?: string) => {
        if (!chartContainerRef.current) return;

        try {
            const [{ jsPDF }, html2canvas] = await Promise.all([
                import('jspdf'),
                import('html2canvas').then(m => m.default)
            ]);
            const canvas = await html2canvas(chartContainerRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');

            let pdf: any;
            if (mode === 'A4') {
                pdf = new jsPDF('p', 'mm', 'a4');
            } else {
                const height = (canvas.height * 210) / canvas.width;
                pdf = new jsPDF('p', 'mm', [210, height]);
            }

            const imgWidth = 210 - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            const safeLogo = getSafeLogo(companyLogo);
            if (safeLogo) {
                pdf.addImage(safeLogo, 'PNG', 10, 10, 25, 12);
            }

            pdf.setFontSize(14);
            pdf.text(`Graphique TCD - ${pivotConfig.valField}`, safeLogo ? 40 : 10, 18);
            pdf.setFontSize(10);
            pdf.text(`Champ: ${pivotConfig.valField} | Agrégation: ${pivotConfig.aggType}`, safeLogo ? 40 : 10, 25);

            pdf.addImage(imgData, 'PNG', 10, 35, imgWidth, imgHeight);
            pdf.save(`graphique_tcd_${new Date().toISOString().split('T')[0]}.pdf`);
            dispatch({ type: 'SET_EXPORT_MENU', payload: false });
        } catch (error) {
            console.error('Erreur export PDF:', error);
        }
    }, [pivotConfig]);

    const handleExportXLSX = useCallback(() => {
        let exportData: any[] = [];
        let dataCount = 0;

        if (state.selectedChartType === 'sunburst' && sunburstData) {
            const flattenNode = (node: any, level: number = 1, parentPath: string[] = []): any[] => {
                const currentPath = [...parentPath, node.name];
                const rows: any[] = [];
                const row: any = {
                    'Niveau': level,
                    'Chemin': currentPath.join(' > '),
                    'Nom': node.name,
                    'Valeur': node.value || 0
                };
                if (level > 1 && parentPath.length > 0) {
                    row['Parent'] = parentPath[parentPath.length - 1];
                }
                rows.push(row);
                if (node.children && node.children.length > 0) {
                    node.children.forEach((child: any) => {
                        rows.push(...flattenNode(child, level + 1, currentPath));
                    });
                }
                return rows;
            };
            exportData = sunburstData.tree.flatMap((topNode: any) => flattenNode(topNode));
            dataCount = exportData.length;
        } else if (chartData && chartData.length > 0) {
            exportData = chartData;
            dataCount = chartData.length;
        } else {
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Données du graphique');

        const metadata = [
            ['Métadonnées du graphique'],
            ['Champ valeur', pivotConfig.valField],
            ['Type d\'agrégation', pivotConfig.aggType],
            ['Type de graphique', state.selectedChartType],
            ['Date d\'export', new Date().toLocaleString('fr-FR')],
            [],
            ['Champs de ligne', pivotConfig.rowFields.join(', ')],
            ['Champs de colonne', pivotConfig.colFields.join(', ')],
            ['Nombre de lignes', dataCount]
        ];

        const metaSheet = XLSX.utils.aoa_to_sheet(metadata);
        XLSX.utils.book_append_sheet(workbook, metaSheet, 'Métadonnées');

        XLSX.writeFile(workbook, `graphique_tcd_${new Date().toISOString().split('T')[0]}.xlsx`);
        dispatch({ type: 'SET_EXPORT_MENU', payload: false });
    }, [pivotConfig, state.selectedChartType, sunburstData, chartData]);

    return {
        chartContainerRef,
        state,
        dispatch,
        metadata,
        chartData,
        colors,
        sunburstData,
        sunburstColors,
        d3HierarchyData,
        hierarchicalTreemapData,
        currentTreemapData,
        handleTreemapDrill,
        handleTreemapBreadcrumb,
        handleChartTypeChange,
        handleCreateWidget,
        handleOpenInAnalytics,
        handleExportHTML,
        handleExportPNG,
        handleExportPDF,
        handleExportXLSX
    };
};
