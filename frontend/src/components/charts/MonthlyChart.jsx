import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MonthlyChart = ({ data }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = svgRef.current.parentElement.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .range([height, 0]);

    const colorScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .range(["#1e293b", "#10b981"]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .attr("color", "#64748b")
      .select(".domain").remove();

    svg.append("g")
      .call(d3.axisLeft(y).ticks(3).tickSize(-width).tickPadding(10))
      .attr("color", "#64748b")
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#1e293b")
        .attr("stroke-dasharray", "3,3"));

    // Bars
    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.month))
      .attr("width", x.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", d => colorScale(d.count))
      .attr("rx", 4)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#34d399");
        
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="d3-tooltip">
              <div class="tooltip-label">Month: ${d.month}</div>
              <div class="tooltip-value">Activity: <span>${d.count} Commits</span></div>
            </div>
          `);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("fill", colorScale(d.count));
        d3.select(tooltipRef.current).style("opacity", 0);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 30)
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count));

  }, [data]);

  return (
    <div className="chart-container">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip-portal"></div>
    </div>
  );
};

export default MonthlyChart;
