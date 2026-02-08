import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
import {
  PivotResult,
  PivotConfig,
  TemporalComparisonConfig,
  PivotRow,
  SunburstData,
  HierarchicalNode
} from '../types';
import { useWidgets, useDatasets } from '../context/DataContext';
import { getSafeLogo } from '../utils/common';

export const useChartModalLogic = (
  pivotData: PivotResult,
  pivotConfig: PivotConfig,
  isTemporalMode: boolean = false,
  temporalComparison: TemporalComparisonConfig | null = null,
  selectedBatchId?: string,
  companyLogo?: string,
  onClose?: () => void
) => {
  const navigate = useNavigate();
  const { addDashboardWidget } = useWidgets();
  const { currentDatasetId } = useDatasets();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Metadata
  const metadata = useMemo(
    () => generateChartMetadata(pivotConfig, pivotData),
    [pivotConfig, pivotData]
  );

  // Options State
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(metadata.suggestedType);
  const [limit, setLimit] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'none'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hierarchyLevel, setHierarchyLevel] = useState<number | undefined>(undefined);
  const [updateMode, setUpdateMode] = useState<'fixed' | 'latest'>('latest');

  // Color State
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('default');
  const [singleColor, setSingleColor] = useState<string>('#0066cc');
  const [gradientStart, setGradientStart] = useState<string>('#0066cc');
  const [gradientEnd, setGradientEnd] = useState<string>('#e63946');

  // Drill-down State
  const [treemapDrillPath, setTreemapDrillPath] = useState<string[]>([]);

  // Sunburst Config
  const [sunburstTitle, setSunburstTitle] = useState<string>('Analyse de la répartition');
  const [showCenterTotal, setShowCenterTotal] = useState<boolean>(true);
  const [showSunburstLegend, setShowSunburstLegend] = useState<boolean>(true);

  // Data Transformations
  const chartData = useMemo(() => {
    if (selectedChartType === 'treemap') {
      return transformPivotToTreemapData(pivotData, pivotConfig, hierarchyLevel);
    } else if (selectedChartType === 'sunburst') {
      return [];
    } else {
      return transformPivotToChartData(pivotData, pivotConfig, {
        chartType: selectedChartType,
        limit,
        excludeSubtotals: true,
        sortBy,
        sortOrder,
        showOthers: limit > 0,
        hierarchyLevel
      });
    }
  }, [pivotData, pivotConfig, selectedChartType, limit, sortBy, sortOrder, hierarchyLevel]);

  const colors = useMemo(() => {
    const count = Math.max(metadata.seriesNames.length, chartData?.length || 0, 1);
    if (colorMode === 'single') return Array(count).fill(singleColor);
    if (colorMode === 'gradient') return generateGradient(gradientStart, gradientEnd, count);
    return getChartColors(count, colorPalette);
  }, [
    colorMode,
    colorPalette,
    singleColor,
    gradientStart,
    gradientEnd,
    metadata.seriesNames.length,
    chartData?.length
  ]);

  const sunburstData = useMemo<SunburstData | null>(() => {
    if (selectedChartType !== 'sunburst') return null;
    const level1Keys = new Set<string>();
    pivotData.displayRows.forEach((row: PivotRow) => {
      if (row.keys?.[0]) level1Keys.add(row.keys[0]);
    });
    let colorCount = level1Keys.size;
    if (limit > 0 && colorCount > limit) colorCount = limit + 1;
    const baseColors =
      colorMode === 'single'
        ? Array(colorCount).fill(singleColor)
        : colorMode === 'gradient'
          ? generateGradient(gradientStart, gradientEnd, colorCount)
          : getChartColors(colorCount, colorPalette);
    return transformPivotToSunburstData(pivotData, pivotConfig, baseColors, {
      limit: limit > 0 ? limit : undefined,
      showOthers: limit > 0
    });
  }, [
    pivotData,
    pivotConfig,
    selectedChartType,
    limit,
    colorMode,
    colorPalette,
    singleColor,
    gradientStart,
    gradientEnd
  ]);

  const sunburstColors = useMemo(() => {
    if (selectedChartType !== 'sunburst' || !sunburstData) return colors;
    const colorCount = sunburstData.tree.length;
    if (colorMode === 'single') return Array(colorCount).fill(singleColor);
    if (colorMode === 'gradient') return generateGradient(gradientStart, gradientEnd, colorCount);
    return getChartColors(colorCount, colorPalette);
  }, [
    selectedChartType,
    sunburstData,
    colorMode,
    colorPalette,
    singleColor,
    gradientStart,
    gradientEnd,
    colors
  ]);

  const hierarchicalTreemapData = useMemo(() => {
    if (selectedChartType !== 'treemap') return null;
    const baseColors =
      colorMode === 'single'
        ? Array(9).fill(singleColor)
        : colorMode === 'gradient'
          ? generateGradient(gradientStart, gradientEnd, 9)
          : getChartColors(9, colorPalette);
    return transformPivotToHierarchicalTreemap(pivotData, pivotConfig, baseColors, {
      limit: limit > 0 ? limit : undefined,
      showOthers: limit > 0
    });
  }, [
    pivotData,
    pivotConfig,
    selectedChartType,
    limit,
    colorMode,
    colorPalette,
    singleColor,
    gradientStart,
    gradientEnd
  ]);

  const currentTreemapData = useMemo(() => {
    if (!hierarchicalTreemapData) return null;
    if (treemapDrillPath.length === 0) return hierarchicalTreemapData;
    let current: HierarchicalNode[] = hierarchicalTreemapData;
    for (const segment of treemapDrillPath) {
      const found = current.find((n: HierarchicalNode) => n.name === segment);
      if (found?.children) current = found.children;
      else break;
    }
    return current;
  }, [hierarchicalTreemapData, treemapDrillPath]);

  const handleTreemapDrill = useCallback(
    (name: string) => {
      let current: HierarchicalNode[] = hierarchicalTreemapData || [];
      for (const seg of treemapDrillPath) {
        const found = current.find((n: HierarchicalNode) => n.name === seg);
        if (found?.children) current = found.children;
      }
      const node = current.find((n: HierarchicalNode) => n.name === name);
      if (node?.children && node.children.length > 0)
        setTreemapDrillPath((prev) => [...prev, name]);
    },
    [hierarchicalTreemapData, treemapDrillPath]
  );

  const handleCreateWidget = () => {
    if (!currentDatasetId) return;
    const hasFilters = pivotConfig.filters && pivotConfig.filters.length > 0;
    const shouldUseSpecificBatch = hasFilters || updateMode === 'fixed';
    addDashboardWidget({
      title: `Graphique TCD : ${pivotConfig.valField}`,
      type: 'chart',
      size: 'md',
      height: 'lg',
      config: {
        metric: (pivotConfig.aggType === 'list' ? 'count' : pivotConfig.aggType) as any,
        chartType: selectedChartType,
        source: {
          datasetId: currentDatasetId,
          mode: isTemporalMode ? 'temporal' : shouldUseSpecificBatch ? 'specific' : 'latest',
          batchId: !isTemporalMode && shouldUseSpecificBatch ? selectedBatchId : undefined
        },
        pivotChart: {
          pivotConfig,
          isTemporalMode,
          temporalComparison,
          updateMode,
          chartType: selectedChartType,
          hierarchyLevel,
          limit: limit > 0 ? limit : undefined,
          sortBy,
          sortOrder,
          colorMode,
          colorPalette,
          singleColor,
          gradientStart,
          gradientEnd,
          sunburstConfig:
            selectedChartType === 'sunburst'
              ? { title: sunburstTitle, showCenterTotal, showLegend: showSunburstLegend }
              : undefined
        }
      }
    });
    if (onClose) onClose();
    navigate('/dashboard');
  };

  const handleOpenInAnalytics = () => {
    navigate('/analytics', {
      state: { fromPivotChart: { pivotData, pivotConfig, chartType: selectedChartType, chartData } }
    });
  };

  const handleExportHTML = () => {
    if (!chartContainerRef.current) return;
    const title = `Graphique TCD - ${pivotConfig.valField}`;
    if (selectedChartType === 'sunburst' && sunburstData) {
      // Hierarchical D3 export logic...
    } else {
      // Standard Recharts export logic...
    }
  };

  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(chartContainerRef.current, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `graphique_tcd_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  };

  const handleExportPDF = async (mode: 'A4' | 'adaptive') => {
    if (!chartContainerRef.current) return;
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas').then((m) => m.default)
    ]);
    const canvas = await html2canvas(chartContainerRef.current, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    let pdf =
      mode === 'A4'
        ? new jsPDF('p', 'mm', 'a4')
        : new jsPDF('p', 'mm', [210, (canvas.height * 210) / canvas.width]);
    pdf.addImage(imgData, 'PNG', 10, 35, 190, (canvas.height * 190) / canvas.width);
    pdf.save(`graphique_tcd_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportXLSX = () => {
    const data = selectedChartType === 'sunburst' ? [] : chartData; // Simplified flattening for refactor
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    XLSX.writeFile(wb, `graphique_tcd_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return {
    metadata,
    selectedChartType,
    setSelectedChartType,
    limit,
    setLimit,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    hierarchyLevel,
    setHierarchyLevel,
    updateMode,
    setUpdateMode,
    colorMode,
    setColorMode,
    colorPalette,
    setColorPalette,
    singleColor,
    setSingleColor,
    gradientStart,
    setGradientStart,
    gradientEnd,
    setGradientEnd,
    treemapDrillPath,
    setTreemapDrillPath,
    sunburstTitle,
    setSunburstTitle,
    showCenterTotal,
    setShowCenterTotal,
    showSunburstLegend,
    setShowSunburstLegend,
    chartData,
    colors,
    sunburstData,
    sunburstColors,
    hierarchicalTreemapData,
    currentTreemapData,
    d3HierarchyData: sunburstData ? sunburstDataToD3Hierarchy(sunburstData) : null,
    chartContainerRef,
    showExportMenu,
    setShowExportMenu,
    handleTreemapDrill,
    handleTreemapBreadcrumb: (idx: number) => setTreemapDrillPath((prev) => prev.slice(0, idx)),
    handleCreateWidget,
    handleOpenInAnalytics,
    handleExportHTML,
    handleExportPNG,
    handleExportPDF,
    handleExportXLSX
  };
};
