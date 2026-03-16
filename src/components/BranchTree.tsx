import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitBranch, 
  GitMerge, 
  GitCommit, 
  Users, 
  Clock, 
  ChevronRight,
  Info,
  ExternalLink,
  Activity
} from 'lucide-react';
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

    // 3. Draw Branch Lines
    data.branches.forEach(branch => {
      const x = branchX.get(branch.name)!;
      const branchCommits = data.commits.filter(c => commitBranch.get(c.sha) === branch.name);
      
      if (branchCommits.length > 0) {
        const yMin = timeScale(new Date(d3.min(branchCommits, d => d.date)!));
        const yMax = timeScale(new Date(d3.max(branchCommits, d => d.date)!));

        // Vertical line for branch
        g.append("line")
          .attr("x1", x)
          .attr("y1", yMin)
          .attr("x2", x)
          .attr("y2", yMax)
          .attr("stroke", branch.color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,4")
          .attr("opacity", 0.3);

        // Branch Label at top
        g.append("text")
          .attr("x", x)
          .attr("y", -40)
          .attr("text-anchor", "middle")
          .attr("fill", branch.color)
          .attr("class", "text-[10px] font-bold uppercase tracking-widest")
          .text(branch.name);
          
        g.append("circle")
          .attr("cx", x)
          .attr("cy", -25)
          .attr("r", 4)
          .attr("fill", branch.color);
      }
    });

    // 4. Draw Merge Arcs
    const lineGenerator = d3.line<[number, number]>().curve(d3.curveBasis);

    data.commits.forEach(commit => {
      if (commit.parentShas && commit.parentShas.length > 1) {
        const targetX = branchX.get(commitBranch.get(commit.sha)!)!;
        const targetY = timeScale(new Date(commit.date));

        commit.parentShas.slice(1).forEach(parentSha => {
          const parent = commitMap.get(parentSha);
          if (parent) {
            const sourceX = branchX.get(commitBranch.get(parentSha)!)!;
            const sourceY = timeScale(new Date(parent.date));

            const points: [number, number][] = [
              [sourceX, sourceY],
              [sourceX, (sourceY + targetY) / 2],
              [targetX, (sourceY + targetY) / 2],
              [targetX, targetY]
            ];

            g.append("path")
              .attr("d", lineGenerator(points))
              .attr("fill", "none")
              .attr("stroke", "rgba(255,255,255,0.1)")
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "5,5")
              .attr("class", "merge-path");
          }
        });
      }
    });

    // 5. Draw Commit Nodes
    const nodes = g.selectAll(".commit-node")
      .data(data.commits)
      .enter()
      .append("g")
      .attr("class", "commit-node")
      .attr("transform", d => {
        const x = branchX.get(commitBranch.get(d.sha)!) || 0;
        const y = timeScale(new Date(d.date));
        return `translate(${x},${y})`;
      })
      .on("mouseenter", (event, d) => {
        const branch = data.branches.find(b => b.name === commitBranch.get(d.sha));
        setHoveredNode({ ...d, branchName: branch?.name, branchColor: branch?.color });
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on("mouseleave", () => setHoveredNode(null))
      .on("click", (event, d) => onCommitClick(d));

    // Determine if it's a branch head
    const branchHeads = new Set(data.branches.map(b => b.commit));

    nodes.append("circle")
      .attr("r", d => {
        if (branchHeads.has(d.sha)) return 8;
        if (d.parentShas && d.parentShas.length > 1) return 7;
        return 5;
      })
      .attr("fill", d => {
        const branch = data.branches.find(b => b.name === commitBranch.get(d.sha));
        if (branchHeads.has(d.sha)) return "none";
        return branch?.color || "#555";
      })
      .attr("stroke", d => {
        const branch = data.branches.find(b => b.name === commitBranch.get(d.sha));
        return branch?.color || "#555";
      })
      .attr("stroke-width", d => branchHeads.has(d.sha) ? 3 : 2)
      .attr("class", "cursor-pointer transition-all hover:scale-125");

    // Add special symbol for merges
    nodes.filter(d => d.parentShas && d.parentShas.length > 1)
      .append("circle")
      .attr("r", 3)
      .attr("fill", "#fff");

    // Add label for branch heads
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
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-50 pointer-events-none"
              style={{ left: tooltipPos.x + 20, top: tooltipPos.y - 40 }}
            >
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[240px] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredNode.branchColor }} />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{hoveredNode.branchName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600">{hoveredNode.sha.substring(0, 7)}</span>
                </div>
                
                <p className="text-sm font-medium text-zinc-100 leading-tight">{hoveredNode.message}</p>
                
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs text-zinc-400">{hoveredNode.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs text-zinc-400">{new Date(hoveredNode.date).toLocaleDateString()}</span>
                  </div>
                </div>

                {hoveredNode.parentShas && hoveredNode.parentShas.length > 1 && (
                  <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2">
                    <GitMerge className="w-3 h-3 text-purple-500" />
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Merge Commit</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
