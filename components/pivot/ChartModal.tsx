import React, { useState, useMemo, useRef, useCallback } from 'react';
import { X, BarChart3, TrendingUp, Download, ExternalLink, PlusSquare, ChevronDown, ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LabelList
} from 'recharts';
import { TreemapContent } from '../ui/TreemapContent';
import { SunburstD3 } from '../charts/SunburstD3';
import {
  ChartType,
  ColorPalette,
  ColorMode,
  ChartDataPoint,
  SunburstData,
  SunburstRingItem,
  transformPivotToChartData,
  transformPivotToTreemapData,
  transformPivotToSunburstData,
  transformPivotToHierarchicalTreemap,
  generateChartMetadata,
  getChartColors,
  formatChartValue,
  getChartTypeConfig,
  getAvailableHierarchyLevels,
  getSingleColors,
  generateGradient,
  sunburstDataToD3Hierarchy
} from '../../logic/pivotToChart';
import { PivotResult, PivotConfig, TemporalComparisonConfig } from '../../types';
import { useWidgets, useDatasets } from '../../context/DataContext';


interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  pivotData: PivotResult;
  pivotConfig: PivotConfig;
  isTemporalMode?: boolean;
  temporalComparison?: TemporalComparisonConfig | null;
  selectedBatchId?: string;
}

export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  pivotData,
  pivotConfig,
  isTemporalMode = false,
  temporalComparison = null,
  selectedBatchId
}) => {
  const navigate = useNavigate();
  const { addDashboardWidget } = useWidgets();
  const { currentDatasetId } = useDatasets();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Logs de debug
  console.log('=== ChartModal rendu ===');
  console.log('isOpen:', isOpen);
  console.log('pivotData:', pivotData);
  console.log('pivotConfig:', pivotConfig);

  // Générer les métadonnées du graphique
  const metadata = useMemo(() => {
    const meta = generateChartMetadata(pivotConfig, pivotData);
    console.log('Métadonnées générées:', meta);
    return meta;
  }, [pivotConfig, pivotData]);

  // Calculer le nombre de niveaux de hiérarchie disponibles
  const availableLevels = useMemo(() => {
    return getAvailableHierarchyLevels(pivotData);
  }, [pivotData]);

  // State pour les options
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(metadata.suggestedType);
  const [limit, setLimit] = useState<number>(0); // 0 = pas de limite
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'none'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hierarchyLevel, setHierarchyLevel] = useState<number | undefined>(undefined);
  const [updateMode, setUpdateMode] = useState<'fixed' | 'latest'>('latest');

  // Nouveaux états pour les modes de coloration
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('default');
  const [singleColor, setSingleColor] = useState<string>('#0066cc'); // Bleu par défaut
  const [gradientStart, setGradientStart] = useState<string>('#0066cc'); // Bleu
  const [gradientEnd, setGradientEnd] = useState<string>('#e63946'); // Rouge

  // Etat pour le drill-down treemap
  const [treemapDrillPath, setTreemapDrillPath] = useState<string[]>([]);

  // États pour la configuration Sunburst
  const [sunburstTitle, setSunburstTitle] = useState<string>('Analyse de la répartition');
  const [showCenterTotal, setShowCenterTotal] = useState<boolean>(true);
  const [showSunburstLegend, setShowSunburstLegend] = useState<boolean>(true);

  // Transformer les données
  const chartData = useMemo(() => {
    console.log('=== Transformation des données pour graphique ===');
    console.log('selectedChartType:', selectedChartType);
    console.log('Options:', { limit, sortBy, sortOrder, hierarchyLevel });

    let data;
    if (selectedChartType === 'treemap') {
      data = transformPivotToTreemapData(pivotData, pivotConfig, hierarchyLevel);
      console.log('Données treemap transformées:', data);
    } else if (selectedChartType === 'sunburst') {
      // Sunburst/treemap hiérarchique - pas de transformation ici, traité séparément
      data = [];
    } else {
      data = transformPivotToChartData(pivotData, pivotConfig, {
        chartType: selectedChartType,
        limit,
        excludeSubtotals: true,
        sortBy,
        sortOrder,
        showOthers: limit > 0,
        hierarchyLevel
      });
      console.log('Données graphique transformées:', data);
    }

    return data;
  }, [pivotData, pivotConfig, selectedChartType, limit, sortBy, sortOrder, hierarchyLevel, colorMode, colorPalette, singleColor, gradientStart, gradientEnd]);

  // Calculer les couleurs à utiliser en fonction du mode
  const colors = useMemo(() => {
    const count = Math.max(metadata.seriesNames.length, chartData?.length || 0, 1);

    if (colorMode === 'single') {
      // Mode couleur unique : retourner la même couleur pour tous
      return Array(count).fill(singleColor);
    } else if (colorMode === 'gradient') {
      // Mode gradient : générer un gradient entre les deux couleurs
      return generateGradient(gradientStart, gradientEnd, count);
    } else {
      // Mode multi-couleurs : utiliser la palette sélectionnée
      return getChartColors(count, colorPalette);
    }
  }, [colorMode, colorPalette, singleColor, gradientStart, gradientEnd, metadata.seriesNames.length, chartData?.length]);

  // Données sunburst (calculées séparément car structure différente)
  const sunburstData = useMemo<SunburstData | null>(() => {
    if (selectedChartType !== 'sunburst') return null;

    // Calculate expected level 1 count from pivot data directly
    // without calling the transformation function
    const level1Keys = new Set<string>();
    pivotData.data.forEach(row => {
      if (row.keys.length > 0) {
        level1Keys.add(row.keys[0]);
      }
    });

    // Apply limit if set
    let colorCount = level1Keys.size;
    if (limit > 0 && colorCount > limit) {
      colorCount = limit + 1; // +1 for "Autres"
    }

    const baseColors = colorMode === 'single'
      ? Array(colorCount).fill(singleColor)
      : colorMode === 'gradient'
        ? generateGradient(gradientStart, gradientEnd, colorCount)
        : getChartColors(colorCount, colorPalette);

    const result = transformPivotToSunburstData(pivotData, pivotConfig, baseColors, {
      limit: limit > 0 ? limit : undefined,
      showOthers: limit > 0
    });

    console.log('🌞 Sunburst Data:', {
      result,
      ringsCount: result?.rings?.length,
      colorCount,
      baseColors,
      tree: result?.tree
    });
    return result;
  }, [pivotData, pivotConfig, selectedChartType, limit, colorMode, colorPalette, singleColor, gradientStart, gradientEnd]);

  // Couleurs spécifiques pour Sunburst
  const sunburstColors = useMemo(() => {
    if (selectedChartType !== 'sunburst' || !sunburstData) return colors;
    const colorCount = sunburstData.tree.length;
    if (colorMode === 'single') {
      return Array(colorCount).fill(singleColor);
    } else if (colorMode === 'gradient') {
      return generateGradient(gradientStart, gradientEnd, colorCount);
    } else {
      return getChartColors(colorCount, colorPalette);
    }
  }, [selectedChartType, sunburstData, colorMode, colorPalette, singleColor, gradientStart, gradientEnd, colors]);

  // Données treemap hiérarchique
  const hierarchicalTreemapData = useMemo(() => {
    if (selectedChartType !== 'treemap') return null;
    const baseColors = colorMode === 'single'
      ? Array(9).fill(singleColor)
      : colorMode === 'gradient'
        ? generateGradient(gradientStart, gradientEnd, 9)
        : getChartColors(9, colorPalette);
    return transformPivotToHierarchicalTreemap(pivotData, pivotConfig, baseColors, {
      limit: limit > 0 ? limit : undefined,
      showOthers: limit > 0
    });
  }, [pivotData, pivotConfig, selectedChartType, limit, colorMode, colorPalette, singleColor, gradientStart, gradientEnd]);

  // Données treemap après drill-down
  const currentTreemapData = useMemo(() => {
    if (!hierarchicalTreemapData) return null;
    if (treemapDrillPath.length === 0) return hierarchicalTreemapData;

    // Naviguer dans l'arbre selon le chemin de drill-down
    let current: any[] = hierarchicalTreemapData;
    for (const segment of treemapDrillPath) {
      const found = current.find((n: any) => n.name === segment);
      if (found?.children) {
        current = found.children;
      } else {
        break;
      }
    }
    return current;
  }, [hierarchicalTreemapData, treemapDrillPath]);

  // Handlers treemap drill-down
  const handleTreemapDrill = useCallback((name: string) => {
    // Vérifier que ce noeud a des enfants avant de drill
    const current = treemapDrillPath.length === 0
      ? hierarchicalTreemapData
      : (() => {
          let data: any[] = hierarchicalTreemapData || [];
          for (const seg of treemapDrillPath) {
            const found = data.find((n: any) => n.name === seg);
            if (found?.children) data = found.children;
          }
          return data;
        })();
    const node = current?.find((n: any) => n.name === name);
    if (node?.children && node.children.length > 0) {
      setTreemapDrillPath(prev => [...prev, name]);
    }
  }, [hierarchicalTreemapData, treemapDrillPath]);

  const handleTreemapBreadcrumb = useCallback((index: number) => {
    setTreemapDrillPath(prev => prev.slice(0, index));
  }, []);

  // Reset drill path quand on change de type
  const handleChartTypeChange = useCallback((type: ChartType) => {
    setSelectedChartType(type);
    setTreemapDrillPath([]);
  }, []);

  // Export handlers
  const handleExportHTML = () => {
    if (!chartContainerRef.current) return;

    const title = `Graphique TCD - ${pivotConfig.valField}`;

    // Special handling for Sunburst with D3.js
    if (selectedChartType === 'sunburst' && d3HierarchyData) {
      const dataJson = JSON.stringify(d3HierarchyData);
      const colorsJson = JSON.stringify(sunburstColors);
      const rowFieldsJson = JSON.stringify(pivotConfig.rowFields);
      const unit = pivotConfig.valField || '';

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
    .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
    h1 { margin: 0; color: #1e293b; font-size: 24px; }
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
      <h1>${title}</h1>
      <div class="metadata">
        <p>Champ: ${pivotConfig.valField}</p>
        <p>Agrégation: ${pivotConfig.aggType}</p>
        <p>Exporté le: ${new Date().toLocaleString('fr-FR')}</p>
      </div>
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
    const sunburstTitle = '${sunburstTitle || ''}';
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
      .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name);

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
      setShowExportMenu(false);
      return;
    }

    // Standard HTML export for other chart types
    const chartHtml = chartContainerRef.current.innerHTML;
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
    .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
    h1 { margin: 0; color: #1e293b; font-size: 24px; }
    .metadata { margin-top: 10px; font-size: 12px; color: #64748b; }
    .chart-container { margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <div class="metadata">
        <p>Champ: ${pivotConfig.valField}</p>
        <p>Agrégation: ${pivotConfig.aggType}</p>
        <p>Exporté le: ${new Date().toLocaleString('fr-FR')}</p>
      </div>
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
    setShowExportMenu(false);
  };

  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = await html2canvas(chartContainerRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `graphique_tcd_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Erreur export PNG:', error);
    }
  };

  const handleExportPDF = async (mode: 'A4' | 'adaptive') => {
    if (!chartContainerRef.current) return;

    try {
      const jsPDF = (await import('jspdf')).jsPDF;
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

      pdf.addText(`Graphique TCD - ${pivotConfig.valField}`, 10, 15);
      pdf.setFontSize(10);
      pdf.addText(`Champ: ${pivotConfig.valField} | Agrégation: ${pivotConfig.aggType}`, 10, 25);
      pdf.addImage(imgData, 'PNG', 10, 35, imgWidth, imgHeight);
      pdf.save(`graphique_tcd_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Erreur export PDF:', error);
    }
  };

  const handleExportXLSX = () => {
    if (!chartData || chartData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(chartData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Données du graphique');

    // Ajouter une feuille de métadonnées
    const metadata = [
      ['Métadonnées du graphique'],
      ['Champ valeur', pivotConfig.valField],
      ['Type d\'agrégation', pivotConfig.aggType],
      ['Type de graphique', selectedChartType],
      ['Date d\'export', new Date().toLocaleString('fr-FR')],
      [],
      ['Champs de ligne', pivotConfig.rowFields.join(', ')],
      ['Champs de colonne', pivotConfig.colFields.join(', ')],
      ['Nombre de lignes', chartData.length]
    ];

    const metaSheet = XLSX.utils.aoa_to_sheet(metadata);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Métadonnées');

    XLSX.writeFile(workbook, `graphique_tcd_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const handleCreateWidget = () => {
    try {
      if (!currentDatasetId) {
        console.error('Aucun dataset courant sélectionné');
        return;
      }

      const newWidget = {
        title: `Graphique TCD : ${pivotConfig.valField}`,
        type: 'chart' as const,
        size: 'md' as const,
        height: 'lg' as const,
        config: {
          metric: (pivotConfig.aggType === 'list' ? 'count' : pivotConfig.aggType) as 'count' | 'sum' | 'avg' | 'distinct',
          chartType: selectedChartType,
          source: {
            datasetId: currentDatasetId,
            mode: isTemporalMode ? 'temporal' as const : (updateMode === 'latest' ? 'latest' : 'specific') as 'latest' | 'specific',
            batchId: (!isTemporalMode && updateMode === 'fixed') ? selectedBatchId : undefined
          },
          pivotChart: {
            pivotConfig: {
              rowFields: pivotConfig.rowFields,
              colFields: pivotConfig.colFields,
              colGrouping: pivotConfig.colGrouping,
              valField: pivotConfig.valField,
              aggType: pivotConfig.aggType,
              filters: pivotConfig.filters,
              sortBy: pivotConfig.sortBy,
              sortOrder: pivotConfig.sortOrder,
              showSubtotals: pivotConfig.showSubtotals
            },
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
            sunburstConfig: selectedChartType === 'sunburst' ? {
              title: sunburstTitle,
              showCenterTotal,
              showLegend: showSunburstLegend
            } : undefined
          }
        }
      };

      addDashboardWidget(newWidget);
      console.log('Widget créé avec succès');
      setShowExportMenu(false);
      onClose();

      // Naviguer vers le dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la création du widget:', error);
    }
  };

  if (!isOpen) {
    console.log('ChartModal fermé');
    return null;
  }

  console.log('ChartModal ouvert - Affichage du contenu');
  console.log('chartData final avant rendu:', chartData);
  console.log('chartData est vide?', !chartData || chartData.length === 0);

  // Styles pour le tooltip
  const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Pour le Treemap, le nom est dans payload[0].payload.name
    const title = label || payload[0].payload.name || '';

    return (
      <div style={tooltipStyle}>
        {title && <p className="font-semibold text-slate-800 mb-1">{title}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-xs">
            {entry.name === 'value' || entry.name === 'size' ? 'Valeur' : entry.name}: <span className="font-bold">{formatChartValue(entry.value, pivotConfig)}</span>
          </p>
        ))}
      </div>
    );
  };

  // Custom tooltip pour sunburst (affiche le chemin hierarchique + %)
  const SunburstTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as SunburstRingItem;
    if (!data || !data.path) return null;

    const pctTotal = data.grandTotal > 0 ? ((data.value / data.grandTotal) * 100).toFixed(1) : '0';
    const pctParent = data.parentTotal > 0 ? ((data.value / data.parentTotal) * 100).toFixed(1) : '0';

    // Déterminer le niveau (0-indexed devient 1-indexed pour affichage)
    const level = data.path.length;
    const levelLabel = pivotConfig.rowFields[level - 1] || `Niveau ${level}`;

    return (
      <div style={{...tooltipStyle, minWidth: '180px'}}>
        <p className="font-bold text-slate-900 mb-2 text-sm border-b border-slate-200 pb-1">{data.name}</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Niveau:</span> {levelLabel}
          </p>
          <p className="text-xs text-slate-700">
            <span className="font-semibold">Valeur:</span> <span className="font-bold text-brand-600">{formatChartValue(data.value, pivotConfig)}</span>
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Part:</span> {pctTotal}% du total
          </p>
          {data.parentName !== 'Total' && (
            <p className="text-xs text-slate-600">
              <span className="font-semibold">Parent:</span> {data.parentName} ({pctParent}%)
            </p>
          )}
        </div>
        {data.path.length > 1 && (
          <p className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
            {data.path.join(' › ')}
          </p>
        )}
      </div>
    );
  };

  // Custom tooltip pour treemap hierarchique
  const TreemapTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const path = data.path || (treemapDrillPath.length > 0 ? [...treemapDrillPath, data.name] : [data.name]);
    const value = data.value || data.size || 0;

    return (
      <div style={tooltipStyle}>
        <p className="font-semibold text-slate-800 mb-1 text-xs">{path.join(' > ')}</p>
        <p className="text-xs text-slate-700">
          Valeur: <span className="font-bold">{formatChartValue(value, pivotConfig)}</span>
        </p>
        {data.children && (
          <p className="text-xs text-brand-600 mt-1">Cliquer pour explorer</p>
        )}
      </div>
    );
  };

  // Determine si on a des données à afficher
  const hasData = selectedChartType === 'sunburst'
    ? (sunburstData && sunburstData.rings.length > 0 && sunburstData.totalValue > 0)
    : selectedChartType === 'treemap'
      ? (currentTreemapData && currentTreemapData.length > 0)
      : (chartData && chartData.length > 0);

  // Rendu du graphique selon le type
  const renderChart = () => {
    console.log('=== renderChart appelé ===');
    console.log('selectedChartType:', selectedChartType);
    console.log('chartData:', chartData);
    console.log('chartData length:', chartData?.length);
    console.log('metadata:', metadata);
    console.log('colors:', colors);

    try {
      const chartMargin = { top: 20, right: 30, left: 20, bottom: 60 };

      switch (selectedChartType) {
      case 'bar':
      case 'stacked-bar':
      case 'percent-bar': {
        const isStacked = selectedChartType === 'stacked-bar' || selectedChartType === 'percent-bar';
        const isPercent = selectedChartType === 'percent-bar';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ ...chartMargin, left: 140 }} stackOffset={isPercent ? 'expand' : undefined}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                domain={isPercent ? [0, 1] : [0, 'auto']}
                tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
              />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries || isStacked ? (
                metadata.seriesNames.map((series, idx) => (
                  <Bar key={series} dataKey={series} stackId={isStacked ? 'a' : undefined} fill={colors[idx % colors.length]} radius={!isStacked ? [0, 4, 4, 0] : 0}>
                    {isStacked && <LabelList dataKey={series} position="center" formatter={(val: any) => val !== 0 ? formatChartValue(val, pivotConfig) : ''} style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />}
                  </Bar>
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
              {(metadata.isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'column':
      case 'stacked-column':
      case 'percent-column': {
        const isStacked = selectedChartType === 'stacked-column' || selectedChartType === 'percent-column';
        const isPercent = selectedChartType === 'percent-column';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal" margin={chartMargin} stackOffset={isPercent ? 'expand' : undefined}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                domain={isPercent ? [0, 1] : [0, 'auto']}
                tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
              />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries || isStacked ? (
                metadata.seriesNames.map((series, idx) => (
                  <Bar key={series} dataKey={series} stackId={isStacked ? 'a' : undefined} fill={colors[idx % colors.length]} radius={!isStacked ? [4, 4, 0, 0] : 0}>
                    {isStacked && <LabelList dataKey={series} position="center" formatter={(val: any) => val !== 0 ? formatChartValue(val, pivotConfig) : ''} style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />}
                  </Bar>
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
              {(metadata.isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series, idx) => (
                    <Line
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stroke={colors[idx]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
      case 'stacked-area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series, idx) => (
                    <Area
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stackId={selectedChartType === 'stacked-area' ? 'a' : undefined}
                      stroke={colors[idx]}
                      fill={colors[idx]}
                      fillOpacity={0.6}
                    />
                  ))}
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors[0]}
                  fill={colors[0]}
                  fillOpacity={0.6}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={selectedChartType === 'donut' ? '45%' : 0}
                outerRadius="75%"
                paddingAngle={2}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
                labelLine={true}
                label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', bottom: 0 }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series, idx) => (
                    <Radar
                      key={series}
                      name={series}
                      dataKey={series}
                      stroke={colors[idx]}
                      fill={colors[idx]}
                      fillOpacity={0.6}
                    />
                  ))}
                </>
              ) : (
                <Radar
                  dataKey="value"
                  stroke={colors[0]}
                  fill={colors[0]}
                  fillOpacity={0.6}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'sunburst': {
        if (!sunburstData || !sunburstData.tree || sunburstData.tree.length === 0) {
          return <div className="flex items-center justify-center h-full text-slate-400">Aucune donnée hierarchique</div>;
        }

        // Convertir les données pour D3
        const d3HierarchyData = sunburstDataToD3Hierarchy(sunburstData);

        return (
          <div className="relative w-full h-full flex flex-col">
            {/* Légende avec noms de colonnes */}
            {showSunburstLegend && pivotConfig.rowFields.length > 0 && (
              <div className="flex justify-center mb-2">
                <div className="flex gap-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Niveaux:</div>
                  {pivotConfig.rowFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-3 h-3 rounded-sm border border-slate-300"
                        style={{
                          backgroundColor: sunburstColors[idx % sunburstColors.length]
                        }}
                      />
                      <span className="text-slate-700 font-medium">{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Graphique Sunburst D3 */}
            <div className="flex-1" style={{ minHeight: '500px' }}>
              <SunburstD3
                data={d3HierarchyData}
                width={800}
                height={800}
                unit={pivotConfig.valField || ''}
                title={sunburstTitle}
                rowFields={pivotConfig.rowFields}
                colors={sunburstColors}
              />
            </div>
          </div>
        );
      }

      case 'treemap': {
        if (!currentTreemapData || currentTreemapData.length === 0) {
          return <div className="flex items-center justify-center h-full text-slate-400">Aucune donnée</div>;
        }

        // Vérifier si on a des données hiérarchiques (avec children)
        const isHierarchical = currentTreemapData.some((d: any) => d.children && d.children.length > 0);

        return (
          <div className="h-full flex flex-col">
            {/* Breadcrumb pour drill-down */}
            {treemapDrillPath.length > 0 && (
              <div className="flex items-center gap-1 mb-2 px-1 text-xs">
                <button
                  onClick={() => handleTreemapBreadcrumb(0)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 text-brand-600 font-medium transition-colors"
                >
                  <Home className="w-3 h-3" />
                  Racine
                </button>
                {treemapDrillPath.map((segment, idx) => (
                  <React.Fragment key={idx}>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <button
                      onClick={() => handleTreemapBreadcrumb(idx + 1)}
                      className={`px-2 py-1 rounded transition-colors ${idx === treemapDrillPath.length - 1 ? 'bg-brand-100 text-brand-700 font-semibold' : 'hover:bg-brand-50 text-brand-600'}`}
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={currentTreemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#60a5fa"
                  content={<TreemapContent colors={colors} onClick={isHierarchical ? handleTreemapDrill : undefined} />}
                >
                  <Tooltip content={isHierarchical ? <TreemapTooltip /> : <CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Type de graphique non supporté</div>;
      }
    } catch (error) {
      console.error('Erreur dans renderChart:', error);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-red-500 text-center">
            <p className="text-lg font-semibold mb-2">Erreur lors du rendu du graphique</p>
            <p className="text-sm">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
            <p className="text-xs mt-2">Consultez la console (F12) pour plus de détails.</p>
          </div>
        </div>
      );
    }
  };

  const handleOpenInAnalytics = () => {
    navigate('/analytics', {
      state: {
        fromPivotChart: {
          pivotData,
          pivotConfig,
          chartType: selectedChartType,
          chartData
        }
      }
    });
  };

  const handleExportImage = () => {
    // TODO: Implémenter l'export en image (nécessite html2canvas ou domtoimage)
    alert('Fonctionnalité d\'export en image à venir');
  };

  const chartTypeOptions: ChartType[] = [
    'column', 'bar', 'stacked-column', 'stacked-bar', 'percent-column', 'percent-bar',
    'line', 'area', 'stacked-area', 'pie', 'donut', 'radar', 'sunburst', 'treemap'
  ];

  const isHierarchicalType = selectedChartType === 'sunburst' || selectedChartType === 'treemap';

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Visualisation graphique</h2>
              <p className="text-xs text-slate-500">
                {metadata.totalDataPoints} point{metadata.totalDataPoints > 1 ? 's' : ''} de données
                {metadata.isMultiSeries && ` | ${metadata.seriesNames.length} séries`}
                {sunburstData && selectedChartType === 'sunburst' && ` | ${sunburstData.rings.length} niveaux`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInAnalytics}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-brand-600 text-white rounded-lg hover:from-purple-700 hover:to-brand-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir dans Analytics
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-4">
          {/* Type de graphique */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Type:</label>
            <select
              value={selectedChartType}
              onChange={(e) => handleChartTypeChange(e.target.value as ChartType)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              {chartTypeOptions.map((type) => {
                const config = getChartTypeConfig(type);
                return (
                  <option key={type} value={type}>
                    {config.label}
                    {type === metadata.suggestedType && ' ★'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Top N (pour sunburst/treemap : limite les categories de premier niveau) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">
              {isHierarchicalType ? 'Limiter (Niv.1):' : 'Limiter à:'}
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              <option value={0}>Tout afficher</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={20}>Top 20</option>
            </select>
          </div>

          {/* Niveau de hiérarchie (seulement pour les types non-hierarchiques) */}
          {availableLevels > 1 && !isHierarchicalType && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Niveau:</label>
              <select
                value={hierarchyLevel === undefined ? '' : hierarchyLevel}
                onChange={(e) => setHierarchyLevel(e.target.value === '' ? undefined : Number(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              >
                <option value="">Tous les niveaux</option>
                {Array.from({ length: availableLevels }, (_, i) => (
                  <option key={i} value={i}>
                    Niveau {i + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tri (masqué pour sunburst/treemap/pie/donut) */}
          {!isHierarchicalType && selectedChartType !== 'pie' && selectedChartType !== 'donut' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Trier par:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'value' | 'none')}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                  <option value="value">Valeur</option>
                  <option value="name">Nom</option>
                  <option value="none">Aucun</option>
                </select>
              </div>

              {sortBy !== 'none' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Ordre:</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  >
                    <option value="desc">Décroissant</option>
                    <option value="asc">Croissant</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* Mode de coloration */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Mode couleur:</label>
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              <option value="multi">Plusieurs couleurs</option>
              <option value="single">Couleur unique</option>
              <option value="gradient">Dégradé</option>
            </select>
          </div>

          {/* Palette pour mode multi */}
          {colorMode === 'multi' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Palette:</label>
              <select
                value={colorPalette}
                onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              >
                <option value="default">Défaut</option>
                <option value="pastel">Pastel</option>
                <option value="vibrant">Vibrant</option>
              </select>
            </div>
          )}

          {/* Couleur unique pour mode single */}
          {colorMode === 'single' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Couleur:</label>
              <input
                type="color"
                value={singleColor}
                onChange={(e) => setSingleColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-xs text-slate-500">{singleColor}</span>
            </div>
          )}

          {/* Gradient pour mode gradient */}
          {colorMode === 'gradient' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Début:</label>
                <input
                  type="color"
                  value={gradientStart}
                  onChange={(e) => setGradientStart(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <span className="text-xs text-slate-500">{gradientStart}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Fin:</label>
                <input
                  type="color"
                  value={gradientEnd}
                  onChange={(e) => setGradientEnd(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <span className="text-xs text-slate-500">{gradientEnd}</span>
              </div>
            </>
          )}

          {/* Options Sunburst */}
          {selectedChartType === 'sunburst' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Titre:</label>
                <input
                  type="text"
                  value={sunburstTitle}
                  onChange={(e) => setSunburstTitle(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="Titre du graphique"
                  style={{ minWidth: '200px' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-center-total"
                  checked={showCenterTotal}
                  onChange={(e) => setShowCenterTotal(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="show-center-total" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Total au centre
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-sunburst-legend"
                  checked={showSunburstLegend}
                  onChange={(e) => setShowSunburstLegend(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="show-sunburst-legend" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Légende niveaux
                </label>
              </div>
            </>
          )}

          {/* Badge suggestion */}
          <div className="ml-auto flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg shadow-sm">
                <input
                   type="checkbox"
                   id="auto-update-modal"
                   checked={updateMode === 'latest'}
                   onChange={e => setUpdateMode(e.target.checked ? 'latest' : 'fixed')}
                   className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="auto-update-modal" className="text-xs font-bold text-brand-800 cursor-pointer select-none">
                   Mise à jour automatique
                </label>
             </div>
             {selectedChartType === metadata.suggestedType && (
               <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                 <TrendingUp className="w-3 h-3" />
                 Recommandé
               </div>
             )}
          </div>
        </div>

        {/* Chart */}
        <div className="p-6 overflow-hidden" style={{ height: '600px' }}>
          <div className="h-full w-full" ref={chartContainerRef}>
            {!hasData ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-slate-400 text-center">
                  <p className="text-lg font-semibold mb-2">Aucune donnée à afficher</p>
                  <p className="text-sm">Les données du pivot sont vides ou invalides.</p>
                  <p className="text-xs mt-2 text-slate-500">Consultez la console (F12) pour plus de détails.</p>
                </div>
              </div>
            ) : (
              renderChart()
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-semibold">{getChartTypeConfig(selectedChartType).bestFor}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Create Widget Button */}
            <button
              onClick={handleCreateWidget}
              className="px-3 py-1.5 text-xs bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors flex items-center gap-1 border border-brand-300"
              title="Ajouter ce graphique au tableau de bord"
            >
              <PlusSquare className="w-3 h-3" />
              Créer widget
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Exporter
                <ChevronDown className="w-3 h-3" />
              </button>

              {showExportMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={handleExportHTML}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100"
                  >
                    HTML
                  </button>
                  <button
                    onClick={handleExportPNG}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100"
                  >
                    PNG (Haute résolution)
                  </button>
                  <button
                    onClick={() => handleExportPDF('adaptive')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100"
                  >
                    PDF (Adaptatif)
                  </button>
                  <button
                    onClick={() => handleExportPDF('A4')}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100"
                  >
                    PDF (A4)
                  </button>
                  <button
                    onClick={handleExportXLSX}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700"
                  >
                    XLSX (Excel)
                  </button>
                </div>
              )}
            </div>

            {/* Open in Analytics */}
            <button
              onClick={handleOpenInAnalytics}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-1"
              title="Ouvrir dans Analytics"
            >
              <ExternalLink className="w-3 h-3" />
              Analytics
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
