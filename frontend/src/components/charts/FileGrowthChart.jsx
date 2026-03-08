import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const FileGrowthChart = ({ data, selectedFiles }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0 || !selectedFiles || selectedFiles.length === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    // Process data for selected files
    // We need to calculate cumulative lines for each file
    const fileData = selectedFiles.map(filePath => {
      let currentLines = 0;
      const history = data
        .filter(commit => commit.files && commit.files.some(f => f.path === filePath))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(commit => {
          const fileStats = commit.files.find(f => f.path === filePath);
          currentLines += (fileStats.additions - fileStats.deletions);
          return {
            date: new Date(commit.date),
            lines: Math.max(0, currentLines),
            additions: fileStats.additions,
            deletions: fileStats.deletions,
            message: commit.message,
            author: commit.author,
            hash: commit.hash
          };
        });
      return { path: filePath, history };
    });

    const margin = { top: 40, right: 150, bottom: 50, left: 60 };
    const width = svgRef.current.parentElement.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const allHistory = fileData.flatMap(f => f.history);
    const x = d3.scaleTime()
      .domain(d3.extent(allHistory, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(allHistory, d => d.lines) * 1.1 || 100])
      .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr("color", "#64748b")
      .call(g => g.select(".domain").attr("stroke", "#1e293b"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#1e293b"));

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#64748b")
      .call(g => g.select(".domain").attr("stroke", "#1e293b"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#1e293b"));

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Lines
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.lines))
      .curve(d3.curveMonotoneX);

    fileData.forEach((file, i) => {
      const path = svg.append("path")
        .datum(file.history)
        .attr("fill", "none")
        .attr("stroke", color(i))
        .attr("stroke-width", 2)
        .attr("d", line);

      // Animation
      const totalLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1500)
        .attr("stroke-dashoffset", 0);

      // Points
      svg.selectAll(`.dot-${i}`)
        .data(file.history)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.lines))
        .attr("r", 4)
        .attr("fill", color(i))
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("r", 6).attr("stroke-width", 2);
          
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style("opacity", 1)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px")
            .html(`
              <div class="d3-tooltip" style="border-left: 4px solid ${color(i)}">
                <div class="tooltip-date">${d.date.toLocaleDateString()}</div>
                <div class="tooltip-label">${file.path}</div>
                <div class="tooltip-value" style="font-size: 12px; margin-top: 4px;">${d.message}</div>
                <div class="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>Lines: ${d.lines}</span>
                  <span class="text-emerald-400">+${d.additions}</span>
                  <span class="text-rose-400">-${d.deletions}</span>
                </div>
              </div>
            `);
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4).attr("stroke-width", 1);
          d3.select(tooltipRef.current).style("opacity", 0);
        });
    });

    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 0)`);

    fileData.forEach((file, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      
      legendRow.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", color(i));
      
      legendRow.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .attr("fill", "#94a3b8")
        .style("font-size", "10px")
        .text(file.path.split('/').pop());
    });

  }, [data, selectedFiles]);

  return (
    <div className="chart-container relative">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip-portal"></div>
    </div>
  );
};

export default FileGrowthChart;
