import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const HourlyChart = ({ data }) => {
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
      .domain(data.map(d => d.hour))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .range([height, 0]);

    // Color scale for heat intensity
    const colorScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .range(["#1e293b", "#38bdf8"]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 3))).tickSize(0).tickPadding(10))
      .attr("color", "#64748b")
      .select(".domain").remove();

    // X-axis label
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 30)
      .attr("fill", "#475569")
      .style("font-size", "10px")
      .text("Hour of Day →");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(3).tickSize(-width).tickPadding(10))
      .attr("color", "#64748b")
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#1e293b")
        .attr("stroke-dasharray", "3,3"));

    // Y-axis label
    svg.append("text")
      .attr("text-anchor", "start")
      .attr("x", -margin.left + 10)
      .attr("y", -10)
      .attr("fill", "#475569")
      .style("font-size", "10px")
      .text("↑ Commits");

    // Bars
    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.hour))
      .attr("width", x.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", d => colorScale(d.count))
      .attr("rx", 4)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#7dd3fc");
        
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="d3-tooltip">
              <div class="tooltip-label">Time: ${d.hour}</div>
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
      .delay((d, i) => i * 20)
      .attr("y", d => y(d.count))
      .attr("height", d => height - y(d.count));

    // Data labels (Values on top of bars)
    svg.selectAll(".label")
      .data(data.filter(d => d.count > 0))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => x(d.hour) + x.bandwidth() / 2)
      .attr("y", d => y(d.count) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .style("font-size", "9px")
      .style("opacity", 0)
      .text(d => d.count)
      .transition()
      .duration(800)
      .delay((d, i) => i * 20)
      .style("opacity", 1);

  }, [data]);

  return (
    <div className="chart-container">
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Activity Heatmap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Low</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
              <div 
                key={i} 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: d3.interpolateRgb("#1e293b", "#38bdf8")(v) }}
              ></div>
            ))}
          </div>
          <span className="text-[10px] text-slate-500">High</span>
        </div>
      </div>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip-portal"></div>
    </div>
  );
};

export default HourlyChart;
