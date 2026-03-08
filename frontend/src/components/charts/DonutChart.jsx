import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DonutChart = ({ data, colors, onHover, onLeave }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = svgRef.current.parentElement.clientWidth;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 20;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    const hoverArc = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius + 5);

    const path = svg.selectAll("path")
      .data(pie(data))
      .enter()
      .append("path")
      .attr("fill", (d, i) => colors[i % colors.length])
      .attr("d", arc)
      .attr("stroke", "#0f172a")
      .style("stroke-width", "2px")
      .style("cursor", "pointer");

    // Animation
    path.transition()
      .duration(1000)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t));
        };
      });

    // Interactions
    path.on("mouseover", function(event, d) {
      const total = d3.sum(data, d => d.value);
      const percentage = ((d.data.value / total) * 100).toFixed(1);

      d3.select(this)
        .transition()
        .duration(200)
        .attr("d", hoverArc)
        .style("filter", "drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))");

      if (onHover) {
        onHover({
          name: d.data.name,
          value: d.data.value,
          percentage
        });
      }
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("d", arc)
        .style("filter", "none");
      
      if (onLeave) onLeave();
    });

    // Center text
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .attr("fill", "#64748b")
      .style("font-size", "10px")
      .text("TOTAL");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.8em")
      .attr("fill", "#fff")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text(d3.sum(data, d => d.value));

  }, [data, colors, onHover, onLeave]);

  return (
    <div className="chart-container flex flex-col items-center">
      <div className="flex flex-wrap justify-center gap-4 mb-4 w-full px-4">
        {data.map((d, i) => {
          const total = d3.sum(data, d => d.value);
          const percentage = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={d.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[i % colors.length] }}
              ></div>
              <span className="text-xs text-slate-400 truncate max-w-[100px]">{d.name}</span>
              <span className="text-[10px] text-slate-500">({percentage}%)</span>
            </div>
          );
        })}
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DonutChart;
