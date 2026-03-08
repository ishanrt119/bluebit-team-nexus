import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ComplexityHotspotsChart = ({ data, onFileClick }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const chartData = data.slice(0, 10);
    const margin = { top: 10, right: 40, bottom: 20, left: 120 };
    const width = svgRef.current.parentElement.clientWidth - margin.left - margin.right;
    const height = chartData.length * 30;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.count) || 1])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(chartData.map(d => d.path))
      .range([0, height])
      .padding(0.4);

    const colorScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.count) || 1])
      .range(["#1e293b", "#38bdf8"]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-height).tickPadding(10))
      .attr("color", "#64748b")
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#1e293b")
        .attr("stroke-dasharray", "3,3"));

    svg.append("g")
      .call(d3.axisLeft(y)
        .tickSize(0)
        .tickPadding(10)
        .tickFormat(d => {
          const name = d.split('/').pop();
          return name.length > 15 ? name.substring(0, 12) + '...' : name;
        }))
      .attr("color", "#94a3b8")
      .select(".domain").remove();

    // Bars
    svg.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", d => y(d.path))
      .attr("width", 0)
      .attr("height", y.bandwidth())
      .attr("fill", d => colorScale(d.count))
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#7dd3fc");
        
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="d3-tooltip">
              <div class="tooltip-label">File: ${d.path}</div>
              <div class="tooltip-value">Changes: <span>${d.count}</span></div>
            </div>
          `);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("fill", colorScale(d.count));
        d3.select(tooltipRef.current).style("opacity", 0);
      })
      .on("click", (event, d) => onFileClick && onFileClick(d.path))
      .transition()
      .duration(800)
      .delay((d, i) => i * 40)
      .attr("width", d => x(d.count));

    // Values on bars
    svg.selectAll(".value")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", d => x(d.count) + 5)
      .attr("y", d => y(d.path) + y.bandwidth() / 2)
      .attr("dy", ".35em")
      .attr("fill", "#64748b")
      .style("font-size", "10px")
      .text(d => d.count);

  }, [data]);

  return (
    <div className="chart-container">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip-portal"></div>
    </div>
  );
};

export default ComplexityHotspotsChart;
