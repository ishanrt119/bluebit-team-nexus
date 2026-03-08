import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const HeatmapTreemap = ({ data, onFileClick, onCellHover, onCellLeave }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = svgRef.current.parentElement.clientWidth;
    const height = 400;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Build hierarchy
    // Ensure all parent folders are present in the data
    const pathSet = new Set(data.map(d => d.path));
    // Add a virtual root node to avoid "multiple roots" error
    const VIRTUAL_ROOT = "__ROOT__";
    const fullData = [{ path: VIRTUAL_ROOT, count: 0 }, ...data];
    pathSet.add(VIRTUAL_ROOT);
    
    data.forEach(d => {
      const parts = d.path.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const parentPath = parts.slice(0, i).join('/');
        if (!pathSet.has(parentPath)) {
          fullData.push({ path: parentPath, count: 0 });
          pathSet.add(parentPath);
        }
      }
    });

    const root = d3.stratify()
      .id(d => d.path)
      .parentId(d => {
        if (d.path === VIRTUAL_ROOT) return null;
        const parts = d.path.split('/');
        if (parts.length === 1) return VIRTUAL_ROOT;
        return parts.slice(0, -1).join('/');
      })
      (fullData);

    root.sum(d => d.count || 0)
      .sort((a, b) => b.value - a.value);

    const treemap = d3.treemap()
      .size([width, height])
      .padding(1)
      .round(true);

    treemap(root);

    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data, d => d.count) || 1])
      .interpolator(d3.interpolateYlOrRd); // Yellow to Orange to Red for "hotness"

    // Add Legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - legendWidth - 20;
    const legendY = height - 30;

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickSize(legendHeight + 2)
      .tickFormat(d3.format("d"));

    const gradientId = "heatmap-gradient";
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", gradientId);

    linearGradient.selectAll("stop")
      .data(d3.range(0, 1.1, 0.1))
      .enter().append("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => colorScale(d * colorScale.domain()[1]));

    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`);

    legend.append("g")
      .attr("transform", `translate(0, 0)`)
      .call(legendAxis)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll("text").attr("fill", "#94a3b8").style("font-size", "10px"));

    legend.append("text")
      .attr("x", 0)
      .attr("y", -5)
    
      .attr("fill", "#94a3b8")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .text("Activity Level (Changes)");

    const leaf = svg.selectAll(".leaf")
      .data(root.leaves())
      .enter().append("g")
      .attr("class", "leaf")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    leaf.append("rect")
      .attr("id", d => d.data.path)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => colorScale(d.data.count))
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 2);
        if (onCellHover) {
          onCellHover({
            path: d.data.path,
            commitCount: d.data.count,
            lastModified: new Date() // Simplified for now
          });
        }
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "none");
        if (onCellLeave) onCellLeave();
      })
      .on("click", (event, d) => onFileClick && onFileClick(d.data.path));

    leaf.append("text")
      .attr("x", 5)
      .attr("y", 15)
      .attr("fill", "black")
      .attr("fill", "#0f172a")
      .style("font-weight", "500")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text(d => {
        const name = d.data.path.split('/').pop();
        return (d.x1 - d.x0 > name.length * 6) ? name : "";
      });

  }, [data, onCellHover, onCellLeave]);

  return (
    <div className="chart-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default HeatmapTreemap;
