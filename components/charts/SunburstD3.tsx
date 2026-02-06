import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  category?: string;
}

interface SunburstD3Props {
  data: HierarchyNode;
  width: number;
  height: number;
  unit?: string;
  title?: string;
  rowFields?: string[];
  colors?: string[];
}

export const SunburstD3: React.FC<SunburstD3Props> = ({
  data,
  width,
  height,
  unit = '',
  title,
  rowFields = [],
  colors = []
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const radius = Math.min(width, height) / 2;

    // Use provided colors or default D3 scheme
    const colorScale = colors.length > 0
      ? d3.scaleOrdinal(colors)
      : d3.scaleOrdinal(d3.schemeCategory10);

    // Create Hierarchy
    const hierarchy = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Assign unique colors to level 1 nodes
    const level1Nodes = hierarchy.children || [];
    const colorMap = new Map<string, string>();
    level1Nodes.forEach((node, idx) => {
      colorMap.set(node.data.name, colors[idx % colors.length] || colorScale(idx.toString()));
    });

    // Partition Layout
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchy);
    const totalValue = root.value || 1;

    // Arc Generator
    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .style("width", "100%")
      .style("height", "100%")
      .style("font", "10px sans-serif");

    const tooltip = d3.select(tooltipRef.current);

    // Draw Arcs
    const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().filter(d => d.depth))
      .join("path")
      .attr("fill", d => {
        // Get base color from level 1 ancestor
        let ancestor: any = d;
        while (ancestor.depth > 1) ancestor = ancestor.parent;

        // Get the base color for this level 1 category
        const baseColor = colorMap.get(ancestor.data.name) || colorScale(ancestor.data.name);

        // Adjust brightness based on depth - lighter for deeper levels
        if (d.depth === 1) {
          return baseColor;
        } else if (d.depth === 2) {
          // Level 2: slightly lighter
          return d3.color(baseColor)?.brighter(0.3)?.formatHex() || baseColor;
        } else if (d.depth === 3) {
          // Level 3: even lighter
          return d3.color(baseColor)?.brighter(0.6)?.formatHex() || baseColor;
        }
        return baseColor;
      })
      .attr("d", arc)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).style("opacity", 0.7);

        const value = d.value?.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        const percent = ((d.value || 0) / totalValue * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

        const levelLabel = rowFields[d.depth - 1] || `Niveau ${d.depth}`;

        let content = `
          <div class="font-bold text-sm mb-1 text-gray-800">${d.data.name}</div>
          <div class="text-xs text-gray-600">Niveau: ${levelLabel}</div>
          <div class="text-xs text-gray-600">Valeur: <span class="font-semibold text-blue-600">${value} ${unit}</span></div>
          <div class="text-xs text-gray-600">Part: <span class="font-medium text-gray-800">${percent}%</span></div>
        `;

        if (d.depth > 1 && d.parent) {
          content += `<div class="mt-2 text-xs text-gray-400 border-t pt-1">Parent: ${d.parent.data.name}</div>`;
        }

        tooltip
          .style("opacity", 1)
          .html(content)
          .style("left", `${event.clientX + 10}px`)
          .style("top", `${event.clientY + 10}px`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.clientX + 10}px`)
          .style("top", `${event.clientY + 10}px`);
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).style("opacity", 1);
        tooltip.style("opacity", 0);
      });

    // Add Labels for large arcs
    svg.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
      .join("text")
      .attr("transform", function(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .attr("class", "text-xs fill-white font-medium drop-shadow-md")
      .text(d => {
        const name = d.data.name || '';
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
      });

    // Center Text (Total)
    if (title) {
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.5em")
        .attr("class", "text-xs font-semibold fill-gray-600 uppercase tracking-wide")
        .text(title);
    }

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", title ? "0.8em" : "0")
      .attr("class", "text-2xl font-bold fill-gray-800")
      .text("Total");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", title ? "2.2em" : "1.5em")
      .attr("class", "text-base fill-gray-600 font-medium")
      .text(`${root.value?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${unit}`);

  }, [data, width, height, unit, title, rowFields, colors]);

  return (
    <div className="relative flex justify-center items-center w-full h-full">
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none bg-white border border-gray-200 shadow-xl rounded-lg px-3 py-2 z-50 opacity-0 transition-opacity duration-200"
      />
    </div>
  );
};
