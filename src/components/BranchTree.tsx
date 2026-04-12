import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Commit, cn } from '../lib/utils';

interface BranchData {
  name: string;
  commit: string;
  color: string;
  protected: boolean;
}

interface MergeData {
  sha: string;
  parents: string[];
  message: string;
  author: string;
  date: string;
}

interface BranchTreeProps {
  repoId: string;
  onCommitClick: (commit: Commit) => void;
}

export function BranchTree({ repoId, onCommitClick }: BranchTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{
    branches: BranchData[];
    commits: Commit[];
    merges: MergeData[];
    stats: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/repo/branches?repoId=${repoId}`);
        const result = await res.json();
        setData(result);
      } catch (e) {
        console.error("Failed to fetch branch data", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [repoId]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = Math.max(800, data.commits.length * 40);
    svg.attr("height", height);

    const margin = { top: 100, right: 50, bottom: 50, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Scales
    const timeScale = d3.scaleTime()
      .domain(d3.extent(data.commits, d => new Date(d.date)) as [Date, Date])
      .range([innerHeight, 0]);

    // Assign X positions to branches
    const branchX = new Map<string, number>();
    data.branches.forEach((b, i) => {
      branchX.set(b.name, (i * (innerWidth / Math.max(1, data.branches.length - 1))) || 0);
    });

    // 2. Process Commits to assign them to branches
    // We'll use a simplified mapping: find the branch head each commit is reachable from.
    // For this visualization, we'll try to keep commits on their "originating" branch.
    const commitMap = new Map<string, any>();
    data.commits.forEach(c => commitMap.set(c.sha, { ...c }));

    // Heuristic: Assign each commit to the first branch that contains it
    const commitBranch = new Map<string, string>();

    // Sort branches: main first, then others
    const sortedBranches = [...data.branches].sort((a, b) => {
      if (a.name === 'main' || a.name === 'master') return -1;
      if (b.name === 'main' || b.name === 'master') return 1;
      return 0;
    });

    sortedBranches.forEach(branch => {
      let currentSha = branch.commit;
      const visited = new Set<string>();
      const queue = [currentSha];

      while (queue.length > 0) {
        const sha = queue.shift()!;
        if (visited.has(sha)) continue;
        visited.add(sha);

        if (!commitBranch.has(sha)) {
          commitBranch.set(sha, branch.name);
        }

        const commit = commitMap.get(sha);
        if (commit && commit.parentShas) {
          queue.push(...commit.parentShas);
        }
      }
    });

    nodes.filter(d => branchHeads.has(d.sha))
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", d => {
        const branch = data.branches.find(b => b.commit === d.sha);
        return branch?.color || "#fff";
      })
      .attr("class", "text-[8px] font-bold uppercase tracking-widest")
      .text(d => {
        const branch = data.branches.find(b => b.commit === d.sha);
        return branch?.name || "";
      });

    // 6. Time Axis
    const axis = d3.axisLeft(timeScale)
      .ticks(10)
      .tickFormat(d3.timeFormat("%b %d") as any);

    svg.append("g")
      .attr("transform", `translate(${margin.left - 50},${margin.top})`)
      .attr("class", "time-axis")
      .call(axis)
      .selectAll("text")
      .attr("fill", "#555")
      .attr("font-size", "10px");

  }, [data]);

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-zinc-900/50 rounded-3xl border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Building Branch Tree...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <GitBranch className="w-5 h-5 text-blue-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Branches</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.branchCount}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <GitMerge className="w-5 h-5 text-purple-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Merges</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.mergeCount}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Open PRs</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.openPRs}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Contributors</span>
          </div>
          <p className="text-3xl font-bold">{data.stats.contributors}</p>
        </div>
      </div>

      {/* Branch Visualization */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-emerald-500" />
              Branch Tree
            </h2>
            <p className="text-sm text-zinc-500">Visualizing parallel development and merge history</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-black" />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Merge</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto custom-scrollbar">
          <svg
            ref={svgRef}
            className="w-full min-w-[800px]"
            style={{ minHeight: '600px' }}
          />
        </div>

        {/* Tooltip */}
        
}
