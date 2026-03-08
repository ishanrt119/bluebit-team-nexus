import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BranchVisualization = ({ commits }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!commits || commits.length === 0) return;

    const width = 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Prepare data for D3
    const nodes = commits.map(c => ({
      id: c.hash,
      author: c.author,
      message: c.message,
      branch: c.branch,
      date: new Date(c.date)
    }));

    // Simple parent relationship (assuming linear for now, or based on branch)
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        links.push({ source: nodes[i].id, target: nodes[i+1].id });
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(30))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#1e293b');

    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 5)
      .attr('fill', d => d.branch === 'main' ? '#10b981' : '#38bdf8')
      .on('mouseover', (event, d) => {
        // Show diff preview
        console.log('Hovered commit:', d.id);
        // Here you would trigger the diff preview panel
      })
      .on('mouseout', () => {
        // Hide diff preview
      });

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });

  }, [commits]);

  return (
    <div className="graph-3d-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default BranchVisualization;
