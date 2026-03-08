import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ComplexityTrendChart = ({ data }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 20, right: 40, bottom: 40, left: 50 };
    const width = svgRef.current.parentElement.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse dates
    const formattedData = data.map(d => ({
      date: new Date(d.date),
      additions: d.additions,
      deletions: d.deletions,
      filesChanged: d.filesChanged,
      commits: d.commits
    })).sort((a, b) => a.date - b.date);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(formattedData, d => Math.max(d.additions, d.deletions)) * 1.1])
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(width / 100).tickSize(0).tickPadding(10))
      .attr("color", "#64748b")
      .select(".domain").remove();

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickPadding(10))
      .attr("color", "#64748b")
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#1e293b")
        .attr("stroke-dasharray", "3,3"));

    // Line generators
    const lineAdditions = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.additions))
      .curve(d3.curveMonotoneX);

    const lineDeletions = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.deletions))
      .curve(d3.curveMonotoneX);

    // Add additions line
    const pathAdd = svg.append("path")
      .datum(formattedData)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2)
      .attr("d", lineAdditions);

    // Add deletions line
    const pathDel = svg.append("path")
      .datum(formattedData)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("d", lineDeletions);

    // Animation
    [pathAdd, pathDel].forEach(path => {
      const totalLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeCubic)
        .attr("stroke-dashoffset", 0);
    });

    // Interaction
    const focus = svg.append("g").style("display", "none");
    focus.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", height).attr("stroke", "#1e293b").attr("stroke-dasharray", "3,3");
    focus.append("circle").attr("class", "add-dot").attr("r", 4).attr("fill", "#10b981");
    focus.append("circle").attr("class", "del-dot").attr("r", 4).attr("fill", "#ef4444");

    svg.append("rect")
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
        focus.select(".add-dot").attr("transform", `translate(0,${y(d.additions)})`);
        focus.select(".del-dot").attr("transform", `translate(0,${y(d.deletions)})`);

        const tooltip = d3.select(tooltipRef.current);
        tooltip.style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="d3-tooltip">
              <div class="tooltip-date">${d3.timeFormat("%b %d, %Y")(d.date)}</div>
              <div class="tooltip-value" style="color: #10b981">+ ${d.additions} insertions</div>
              <div class="tooltip-value" style="color: #ef4444">- ${d.deletions} deletions</div>
              <div class="tooltip-label">${d.commits} commits, ${d.filesChanged} files</div>
            </div>
          `);
      });

  }, [data]);

  return (
    <div className="chart-container">
      <div className="flex items-center gap-4 mb-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
          <span className="text-[10px] text-slate-500 uppercase">Insertions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
          <span className="text-[10px] text-slate-500 uppercase">Deletions</span>
        </div>
      </div>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip-portal"></div>
    </div>
  );
};

export default ComplexityTrendChart;
