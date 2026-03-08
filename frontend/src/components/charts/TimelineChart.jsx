import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TimelineChart = ({ data }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = svgRef.current.parentElement.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse("%m/%d/%Y");
    const formattedData = data.map(d => ({
      date: parseDate(d.date) || new Date(d.date),
      count: d.count
    })).sort((a, b) => a.date - b.date);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(formattedData, d => d.count) * 1.1])
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSize(0).tickPadding(10))
      .attr("color", "#64748b")
      .select(".domain").remove();

    // X-axis label
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 35)
      .attr("fill", "#475569")
      .style("font-size", "10px")
      .text("Time →");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickPadding(10))
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

    // Gradient
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "timeline-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.3);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0);

    // Area generator
    const area = d3.area()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.count))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    // Add area
    const areaPath = svg.append("path")
      .datum(formattedData)
      .attr("fill", "url(#timeline-gradient)")
      .attr("d", area);

    // Add line
    const path = svg.append("path")
      .datum(formattedData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Animation
    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubic)
      .attr("stroke-dashoffset", 0);

    areaPath
      .attr("opacity", 0)
      .transition()
      .delay(500)
      .duration(1000)
      .attr("opacity", 1);

    // Tooltip interaction
    const focus = svg.append("g")
      .style("display", "none");

    // Vertical line (crosshair)
    focus.append("line")
      .attr("class", "x-hover-line hover-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");

    focus.append("circle")
      .attr("r", 5)
      .attr("fill", "#10b981")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    const overlay = svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => {
        focus.style("display", "none");
        d3.select(tooltipRef.current).style("opacity", 0);
      })
      .on("mousemove", (event) => {
        const bisectDate = d3.bisector(d => d.date).left;
        const x0 = x.invert(d3.pointer(event)[0]);
        const i = bisectDate(formattedData, x0, 1);
        const d0 = formattedData[i - 1];
        const d1 = formattedData[i];
        const d = x0 - d0.date > d1.date - x0 ? d1 : d0;

        focus.attr("transform", `translate(${x(d.date)},0)`);
        focus.select("circle").attr("transform", `translate(0,${y(d.count)})`);

        const tooltip = d3.select(tooltipRef.current);
        tooltip.style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="d3-tooltip">
              <div class="tooltip-date">${d3.timeFormat("%b %d, %Y")(d.date)}</div>
              <div class="tooltip-value">Activity: <span>${d.count} Commits</span></div>
            </div>
          `);
      });

  }, [data]);

  return (
    <div className="chart-container">
      <div className="flex items-center gap-2 mb-4 px-4">
        <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Commit History</span>
      </div>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip-portal"></div>
    </div>
  );
};

export default TimelineChart;
