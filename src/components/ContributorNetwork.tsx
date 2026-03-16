import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    AreaChart, Area, Legend
} from 'recharts';
import {
    Users, GitCommit, Plus, Minus, Calendar, Link2, Star, Trophy, Award, Medal,
    X, Loader2, FileText, ChevronRight, Network, Clock, FolderOpen
} from 'lucide-react';
import { RepoData, Commit, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ContributorNode {
    name: string;
    login: string | null;
    avatarUrl: string | null;
    commitCount: number;
    insertions: number;
    deletions: number;
    firstCommit: string;
    lastCommit: string;
    files: string[];
}

interface NetworkEdge {
    source: string;
    target: string;
    sharedFiles: string[];
    weight: number;
}

interface NetworkData {
    nodes: ContributorNode[];
    edges: NetworkEdge[];
    topContributors: ContributorNode[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CONTRIBUTOR_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#a78bfa',
];

const BADGE_ICONS = [
    <Trophy key="t" className="w-4 h-4 text-yellow-400" />,
    <Award key="a" className="w-4 h-4 text-zinc-300" />,
    <Medal key="m" className="w-4 h-4 text-amber-600" />,
];

// Removed circular layout function as we use D3 force layout now

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
    const [err, setErr] = useState(false);
    const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const COLORS = ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600'];
    const bg = COLORS[name.charCodeAt(0) % COLORS.length];

    if (url && !err) {
        return (
            <img src={url} alt={name} width={size} height={size}
                className="rounded-full object-cover" style={{ width: size, height: size }}
                onError={() => setErr(true)} />
        );
    }
    return (
        <div className={cn('rounded-full flex items-center justify-center text-white font-bold', bg)}
            style={{ width: size, height: size, fontSize: size * 0.35 }}>
            {initials}
        </div>
    );
}

// ─── Edge Detail Panel (click on edge) ────────────────────────────────────────

function EdgeDetailPanel({ edge, onClose }: { edge: NetworkEdge; onClose: () => void }) {
    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="absolute top-0 right-0 h-full w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-20 flex flex-col"
        >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Connection</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                        <span className="truncate max-w-[90px]">{edge.source}</span>
                        <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[90px]">{edge.target}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors ml-2">
                    <X className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* Stats */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-800">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                        <p className="text-xl font-bold text-emerald-400">{edge.weight}</p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Shared files</p>
                    </div>
                </div>
            </div>

            {/* Full file list */}
            <div className="flex-1 overflow-y-auto p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> All Shared Files
                </p>
                <div className="space-y-1.5">
                    {edge.sharedFiles.map((f, i) => (
                        <div key={f} className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg group hover:border-emerald-500/30 transition-colors">
                            <span className="text-[9px] text-zinc-600 font-mono w-5 shrink-0">#{i + 1}</span>
                            <p className="text-[10px] font-mono text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">{f}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Contributor Detail Panel (click on node) ─────────────────────────────────

function ContributorDetailPanel({ node, commits, onClose }: {
    node: ContributorNode; commits: Commit[]; onClose: () => void;
}) {
    const activityData = useMemo(() => {
        const authorCommits = commits.filter(c => c.author === node.name);
        const dayMap: Record<string, number> = {};
        authorCommits.forEach(c => {
            const day = format(parseISO(c.date), 'MMM dd');
            dayMap[day] = (dayMap[day] || 0) + 1;
        });
        return Object.entries(dayMap).map(([day, count]) => ({ month: day, count })).slice(-20);
    }, [node.name, commits]);

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="absolute top-0 right-0 h-full w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-20 overflow-y-auto flex flex-col"
        >
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar name={node.name} url={node.avatarUrl} size={40} />
                    <div>
                        <h3 className="font-bold text-sm text-zinc-100">{node.name}</h3>
                        {node.login && (
                            <a href={`https://github.com/${node.login}`} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1">
                                @{node.login} <Link2 className="w-2.5 h-2.5" />
                            </a>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Commits', value: node.commitCount, icon: <GitCommit className="w-3.5 h-3.5 text-blue-400" /> },
                        { label: 'Added', value: `+${node.insertions.toLocaleString()}`, icon: <Plus className="w-3.5 h-3.5 text-emerald-400" /> },
                        { label: 'Deleted', value: `-${node.deletions.toLocaleString()}`, icon: <Minus className="w-3.5 h-3.5 text-rose-400" /> },
                    ].map(s => (
                        <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center">
                            <div className="flex justify-center mb-1">{s.icon}</div>
                            <div className="text-sm font-bold text-zinc-100">{s.value}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Active Period
                    </p>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 space-y-1">
                        <div className="flex justify-between">
                            <span className="text-zinc-600">First commit</span>
                            <span>{new Date(node.firstCommit).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-600">Last commit</span>
                            <span>{new Date(node.lastCommit).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {activityData.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Monthly Activity</p>
                        <div className="h-24">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData} margin={{ top: 2, right: 2, left: -24, bottom: 0 }}>
                                    <XAxis dataKey="month" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontSize: 10 }} cursor={{ fill: '#10b98115' }} />
                                    <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Files Touched ({node.files.length})
                    </p>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto">
                        {node.files.slice(0, 30).map(f => (
                            <p key={f} className="text-[10px] font-mono text-zinc-500 truncate">{f}</p>
                        ))}
                        {node.files.length > 30 && (
                            <p className="text-[10px] text-zinc-600">+{node.files.length - 30} more</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Hall of Fame ──────────────────────────────────────────────────────────────

function HallOfFame({ contributors, selectedNode, onSelect }: {
    contributors: ContributorNode[]; selectedNode: string | null; onSelect: (name: string) => void;
}) {
    return (
        <div className="flex flex-col h-full bg-zinc-900/50 border-r border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" /> Hall of Fame
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {contributors.map((c, i) => {
                    const isSelected = selectedNode === c.name;
                    return (
                        <motion.button key={c.name}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => onSelect(c.name)}
                            className={cn(
                                'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left',
                                isSelected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-zinc-800/50 border border-transparent'
                            )}
                        >
                            <div className="relative shrink-0">
                                <Avatar name={c.name} url={c.avatarUrl} size={32} />
                                {i < 3 && <div className="absolute -top-1 -right-1">{BADGE_ICONS[i]}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-200 truncate">{c.name}</p>
                                <p className="text-[10px] text-zinc-500">{c.commitCount} commits</p>
                            </div>
                            <ChevronRight className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-emerald-500' : 'text-zinc-700')} />
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Network Graph (SVG) ───────────────────────────────────────────────────────

import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface D3Node extends d3.SimulationNodeDatum, ContributorNode {}
type D3Link = d3.SimulationLinkDatum<D3Node> & Omit<NetworkEdge, 'source' | 'target'> & {
    source: D3Node | string | number;
    target: D3Node | string | number;
};

function NetworkGraph({ nodes, edges, selectedNode, selectedEdge, onNodeClick, onEdgeClick }: {
    nodes: ContributorNode[];
    edges: NetworkEdge[];
    selectedNode: string | null;
    selectedEdge: NetworkEdge | null;
    onNodeClick: (name: string) => void;
    onEdgeClick: (edge: NetworkEdge) => void;
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [dims, setDims] = useState({ w: 600, h: 500 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const obs = new ResizeObserver(e => {
            if (!e[0]) return;
            const { width, height } = e[0].contentRect;
            setDims({ w: width, h: height });
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const maxEdgeWeight = useMemo(() => Math.max(1, ...edges.map(e => e.weight)), [edges]);
    const maxCommits = useMemo(() => Math.max(1, ...nodes.map(n => n.commitCount)), [nodes]);

    // Graph Data
    const graphData = useMemo(() => {
        const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
        const d3Links: D3Link[] = edges.map(e => ({
            ...e, source: e.source, target: e.target
        }));
        return { nodes: d3Nodes, links: d3Links };
    }, [nodes, edges]);

    useEffect(() => {
        if (!svgRef.current || dims.w === 0 || dims.h === 0 || graphData.nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Add defs
        const defs = svg.append('defs');
        const glow = defs.append('radialGradient')
            .attr('id', 'nodeGlowGrad')
            .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
        glow.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', '0.35');
        glow.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', '0');

        const g = svg.append('g');

        // Zoom setup
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        svg.call(zoom);
        zoomRef.current = zoom;

        // Force simulation
        const margin = 50;
        const simulation = d3.forceSimulation<D3Node>(graphData.nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(graphData.links).id(d => d.name).distance(150))
            .force('charge', d3.forceManyBody().strength(-800))
            .force('center', d3.forceCenter(dims.w / 2, dims.h / 2))
            .force('collision', d3.forceCollide().radius(d => {
                const s = 0.6 + 0.4 * ((d as D3Node).commitCount / maxCommits);
                return Math.max(18, Math.min(32, dims.w / (nodes.length + 5))) * s + 20; // Radius + padding
            }))
            .force('x', d3.forceX(dims.w / 2).strength(0.05))
            .force('y', d3.forceY(dims.h / 2).strength(0.05));

        // Let simulation run a bit before rendering to prevent initial jumpiness
        simulation.tick(30);

        // Render Links
        const linkGroups = g.append('g')
            .selectAll('g')
            .data(graphData.links)
            .enter().append('g')
            .attr('class', 'cursor-pointer')
            .on('click', (event, d) => onEdgeClick({
                source: (d.source as any).name || d.source,
                target: (d.target as any).name || d.target,
                sharedFiles: d.sharedFiles,
                weight: d.weight
            }));

        // Invisible wider hit area
        const hitArea = linkGroups.append('line')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 18);

        // Visible line
        const linkLine = linkGroups.append('line')
            .attr('class', 'transition-all duration-300')
            .attr('stroke-linecap', 'round');

        // Render Nodes
        const nodeRadiusBase = Math.max(18, Math.min(32, dims.w / (nodes.length + 5)));
        
        const nodeGroups = g.append('g')
            .selectAll('g')
            .data(graphData.nodes)
            .enter().append('g')
            .attr('class', 'cursor-pointer')
            .style('transition', 'opacity 0.3s')
            .on('click', (event, d) => onNodeClick(d.name))
            .call(d3.drag<SVGGElement, D3Node>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended) as any);

        const isNodeHighlighted = (name: string) => {
            if (selectedEdge) return selectedEdge.source === name || selectedEdge.target === name;
            if (selectedNode) return selectedNode === name || edges.some(e =>
                (e.source === selectedNode && e.target === name) ||
                (e.target === selectedNode && e.source === name)
            );
            return true;
        };

        const updateVisuals = () => {
            linkLine
                .attr('stroke', d => {
                    const isThisEdge = selectedEdge?.source === ((d.source as any).name || d.source) && 
                                      selectedEdge?.target === ((d.target as any).name || d.target);
                    const dimmed = selectedNode
                        ? !(((d.source as any).name || d.source) === selectedNode || ((d.target as any).name || d.target) === selectedNode)
                        : selectedEdge ? !isThisEdge : false;
                    return isThisEdge ? '#10b981' : dimmed ? '#1f1f23' : '#3f3f46';
                })
                .attr('stroke-width', d => {
                    const isThisEdge = selectedEdge?.source === ((d.source as any).name || d.source) && 
                                      selectedEdge?.target === ((d.target as any).name || d.target);
                    const strokeW = 1.5 + (d.weight / maxEdgeWeight) * 7;
                    return isThisEdge ? strokeW + 1 : strokeW;
                })
                .attr('stroke-opacity', d => {
                    const isThisEdge = selectedEdge?.source === ((d.source as any).name || d.source) && 
                                      selectedEdge?.target === ((d.target as any).name || d.target);
                    const dimmed = selectedNode
                        ? !(((d.source as any).name || d.source) === selectedNode || ((d.target as any).name || d.target) === selectedNode)
                        : selectedEdge ? !isThisEdge : false;
                    return isThisEdge ? 0.9 : dimmed ? 0.2 : 0.55;
                });

            nodeGroups
                .style('opacity', d => isNodeHighlighted(d.name) ? 1 : 0.2);
        };
        updateVisuals();

        // Node Visuals
        nodeGroups.each(function(d) {
            const group = d3.select(this);
            const isSel = selectedNode === d.name;
            const s = 0.6 + 0.4 * (d.commitCount / maxCommits);
            const r = nodeRadiusBase * s;

            if (isSel) {
                group.append('circle').attr('r', r + 10).attr('fill', 'url(#nodeGlowGrad)');
            }
            
            group.append('circle')
                .attr('r', r + 3)
                .attr('fill', isSel ? '#10b981' : '#27272a')
                .attr('stroke', isSel ? '#10b981' : '#52525b')
                .attr('stroke-width', isSel ? 2 : 1.5)
                .attr('class', 'transition-all duration-200');

            // Hardcoded initial Avatar UI inside d3 foreignObject for simplicity and performance
            // In a fuller react/d3 integration, we'd sync coords back to React, but this works well
            group.append('foreignObject')
                .attr('x', -r).attr('y', -r).attr('width', r * 2).attr('height', r * 2)
                .html(`
                    <div style="width:100%; height:100%; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#27272a; color:white; font-size:${r}px; font-weight:bold;">
                        ${d.avatarUrl ? `<img src="${d.avatarUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
                        <div style="display:${d.avatarUrl ? 'none' : 'flex'}; width:100%; height:100%; align-items:center; justify-content:center;">
                            ${d.name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                    </div>
                `);

            group.append('text')
                .attr('y', r + 14).attr('text-anchor', 'middle')
                .attr('fill', isSel ? '#10b981' : '#a1a1aa')
                .attr('font-size', '10px').attr('font-weight', isSel ? '700' : '400')
                .style('pointer-events', 'none').style('user-select', 'none')
                .text(d.name.split(' ')[0]);

            group.append('text')
                .attr('y', r + 25).attr('text-anchor', 'middle')
                .attr('fill', '#52525b').attr('font-size', '9px')
                .style('pointer-events', 'none').style('user-select', 'none')
                .text(`${d.commitCount}c`);
        });

        simulation.on('tick', () => {
            // Constrain nodes within bounds to prevent flying off screen initially
            nodeGroups.attr('transform', d => {
                const s = 0.6 + 0.4 * (d.commitCount / maxCommits);
                const r = nodeRadiusBase * s + margin;
                d.x = Math.max(r, Math.min(dims.w - r, d.x!));
                d.y = Math.max(r, Math.min(dims.h - r, d.y!));
                return `translate(${d.x},${d.y})`;
            });

            hitArea
                .attr('x1', d => (d.source as any).x)
                .attr('y1', d => (d.source as any).y)
                .attr('x2', d => (d.target as any).x)
                .attr('y2', d => (d.target as any).y);

            linkLine
                .attr('x1', d => (d.source as any).x)
                .attr('y1', d => (d.source as any).y)
                .attr('x2', d => (d.target as any).x)
                .attr('y2', d => (d.target as any).y);
        });

        // Add edge badges/labels dynamically on top
        const edgeLabels = linkGroups.append('g');
        edgeLabels.each(function(d) {
            const group = d3.select(this);
            const isThisEdge = selectedEdge?.source === ((d.source as any).name || d.source) && 
                              selectedEdge?.target === ((d.target as any).name || d.target);
            const dimmed = selectedNode
                ? !(((d.source as any).name || d.source) === selectedNode || ((d.target as any).name || d.target) === selectedNode)
                : selectedEdge ? !isThisEdge : false;

            if (isThisEdge) {
                group.append('circle').attr('class', 'badge-bg')
                    .attr('r', 13).attr('fill', '#09090b')
                    .attr('stroke', '#10b981').attr('stroke-width', 1).attr('stroke-opacity', 0.6);
                group.append('text').attr('class', 'badge-text')
                    .attr('y', 4).attr('text-anchor', 'middle')
                    .attr('fill', '#10b981').attr('font-size', '9px').attr('font-weight', '700')
                    .text(d.weight);
            } else if (!dimmed && d.weight > 0) {
                group.append('circle').attr('class', 'badge-bg')
                    .attr('r', 9).attr('fill', '#18181b')
                    .attr('stroke', '#3f3f46').attr('stroke-width', 0.5);
                group.append('text').attr('class', 'badge-text')
                    .attr('y', 3).attr('text-anchor', 'middle')
                    .attr('fill', '#71717a').attr('font-size', '8px')
                    .text(d.weight);
            }
        });

        simulation.on('tick.labels', () => {
            edgeLabels.attr('transform', d => {
                const sx = (d.source as any).x, sy = (d.source as any).y;
                const tx = (d.target as any).x, ty = (d.target as any).y;
                return `translate(${(sx + tx)/2}, ${(sy + ty)/2})`;
            });
        });

        // Drag functions
        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        }
        function dragged(event: any, d: any) {
            d.fx = event.x; d.fy = event.y;
        }
        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        }

        return () => { simulation.stop(); };
    }, [graphData, dims, selectedNode, selectedEdge, onNodeClick, onEdgeClick]);

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-zinc-950/50">
            {/* Zoom Controls Overlay */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button
                    onClick={() => {
                        if (svgRef.current && zoomRef.current) {
                            d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
                        }
                    }}
                    className="p-2.5 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={() => {
                        if (svgRef.current && zoomRef.current) {
                            d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.67);
                        }
                    }}
                    className="p-2.5 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={() => {
                        if (!document.fullscreenElement) {
                            containerRef.current?.requestFullscreen();
                            setIsFullscreen(true);
                        } else {
                            document.exitFullscreen();
                            setIsFullscreen(false);
                        }
                    }}
                    className="p-2.5 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Toggle Fullscreen"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
            
            <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} />
        </div>
    );
}

// ─── Contributor Timeline ──────────────────────────────────────────────────────

function ContributorTimeline({ nodes, commits }: { nodes: ContributorNode[]; commits: Commit[] }) {
    const top10 = useMemo(() => nodes.slice(0, 10), [nodes]);

    const timelineData = useMemo(() => {
        // Build day × contributor matrix
        const dayMap: Record<string, Record<string, number>> = {};
        commits.forEach(c => {
            const day = format(parseISO(c.date), 'MMM dd');
            if (!dayMap[day]) dayMap[day] = {};
            dayMap[day][c.author] = (dayMap[day][c.author] || 0) + 1;
        });
        return Object.entries(dayMap)
            .map(([day, authorCounts]) => ({ month: day, ...authorCounts }))
            .sort((a, b) => {
                const da = new Date(a.month); const db = new Date(b.month);
                return da.getTime() - db.getTime();
            });
    }, [commits]);

    if (timelineData.length === 0) {
        return (
            <div className="h-[500px] flex items-center justify-center text-zinc-600 text-sm">
                Not enough commit data to build a timeline.
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{label}</p>
                {payload.map((p: any) => (
                    <div key={p.dataKey} className="flex items-center gap-2 text-xs mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-zinc-300 truncate max-w-[120px]">{p.dataKey}</span>
                        <span className="text-zinc-100 font-bold ml-auto">{p.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-zinc-100">Contributor Activity Timeline</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Monthly commits per contributor over time</p>
                    </div>
                    <div className="flex flex-wrap gap-2 max-w-xs justify-end">
                        {top10.map((n, i) => (
                            <div key={n.name} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ background: CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length] }} />
                                <span className="text-[10px] text-zinc-400">{n.name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                {top10.map((n, i) => (
                                    <linearGradient key={n.name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length]} stopOpacity={0.02} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="month" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            {top10.map((n, i) => (
                                <Area
                                    key={n.name}
                                    type="monotone"
                                    dataKey={n.name}
                                    stackId="1"
                                    stroke={CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length]}
                                    fill={`url(#grad-${i})`}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Contributor activity ranked bar */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                <h3 className="font-bold text-zinc-100 mb-4 text-sm">All-Time Contribution Share</h3>
                {nodes.map((n, i) => {
                    const pct = Math.round((n.commitCount / nodes.reduce((s, x) => s + x.commitCount, 0)) * 100);
                    return (
                        <div key={n.name} className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Avatar name={n.name} url={n.avatarUrl} size={20} />
                                    <span className="text-xs text-zinc-300">{n.name}</span>
                                </div>
                                <span className="text-xs text-zinc-500 font-mono">{n.commitCount} commits ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.05 }}
                                    className="h-full rounded-full"
                                    style={{ background: CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length] }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type ViewMode = 'network' | 'timeline';

interface ContributorNetworkProps { repoData: RepoData; }

export function ContributorNetwork({ repoData }: ContributorNetworkProps) {
    const [networkData, setNetworkData] = useState<NetworkData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('network');
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);

    const repoId = `${repoData.owner}/${repoData.repoName}`;

    useEffect(() => {
        (async () => {
            setLoading(true); setError(null);
            try {
                const res = await fetch(`/api/contributor-network?repoId=${encodeURIComponent(repoId)}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setNetworkData(data);
            } catch (e: any) { setError(e.message); }
            finally { setLoading(false); }
        })();
    }, [repoId]);

    const handleNodeClick = useCallback((name: string) => {
        setSelectedEdge(null);
        setSelectedNode(prev => prev === name ? null : name);
    }, []);

    const handleEdgeClick = useCallback((edge: NetworkEdge) => {
        setSelectedNode(null);
        setSelectedEdge(prev =>
            prev?.source === edge.source && prev?.target === edge.target ? null : edge
        );
    }, []);

    const closePanel = useCallback(() => {
        setSelectedNode(null);
        setSelectedEdge(null);
    }, []);

    const selectedContributor = useMemo(
        () => networkData?.nodes.find(n => n.name === selectedNode) ?? null,
        [networkData, selectedNode]
    );

    if (loading) return (
        <div className="h-[700px] flex flex-col items-center justify-center gap-4 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-zinc-400 font-mono animate-pulse">Building contributor network...</p>
        </div>
    );

    if (error || !networkData) return (
        <div className="h-[700px] flex flex-col items-center justify-center gap-3 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
            <Users className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-500">{error || 'No data available'}</p>
        </div>
    );

    const { nodes, edges, topContributors } = networkData;

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Stats + view toggle bar */}
            <div className="flex items-center gap-4">
                <div className="grid grid-cols-3 gap-4 flex-1">
                    {[
                        { icon: <Users className="w-5 h-5 text-purple-400" />, label: 'Contributors', value: nodes.length },
                        { icon: <Link2 className="w-5 h-5 text-emerald-400" />, label: 'Connections', value: edges.length },
                        { icon: <Star className="w-5 h-5 text-yellow-400" />, label: 'Top Contributor', value: topContributors[0]?.name.split(' ')[0] ?? '—' },
                    ].map(s => (
                        <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
                            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">{s.icon}</div>
                            <div>
                                <p className="text-xl font-bold">{s.value}</p>
                                <p className="text-xs text-zinc-500">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0">
                    {([['network', 'Network', <Network key="n" className="w-3.5 h-3.5" />], ['timeline', 'Timeline', <Clock key="t" className="w-3.5 h-3.5" />]] as const).map(([mode, label, icon]) => (
                        <button key={mode} onClick={() => { setViewMode(mode as ViewMode); closePanel(); }}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                                viewMode === mode ? 'bg-emerald-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                            )}>
                            {icon}{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main panel */}
            {viewMode === 'network' ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden h-[620px] flex relative">
                    {/* Hall of Fame */}
                    <div className="w-52 shrink-0 h-full">
                        <HallOfFame contributors={topContributors} selectedNode={selectedNode}
                            onSelect={name => { setSelectedEdge(null); handleNodeClick(name); }} />
                    </div>

                    {/* Graph canvas */}
                    <div className="flex-1 h-full relative">
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute top-[-15%] left-[20%] w-[40%] h-[40%] bg-emerald-500/5 blur-[100px] rounded-full" />
                            <div className="absolute bottom-[-15%] right-[10%] w-[35%] h-[35%] bg-blue-500/5 blur-[100px] rounded-full" />
                        </div>

                        {/* Info chip */}
                        <div className="absolute top-4 left-4 z-10">
                            <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-2xl">
                                <p className="text-xs font-bold text-zinc-300">
                                    {selectedEdge
                                        ? `${selectedEdge.source} ↔ ${selectedEdge.target}`
                                        : selectedNode
                                            ? `${selectedNode}'s connections`
                                            : 'Contributor Network'}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                    {selectedEdge
                                        ? 'Click edge again to deselect'
                                        : 'Click node or edge to explore'}
                                </p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/70 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl">
                            <div className="flex items-center gap-4 text-[10px] text-zinc-400">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 bg-zinc-500 rounded" style={{ height: 2 }} />
                                    <span>Shared files</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 bg-emerald-500 rounded" style={{ height: 3 }} />
                                    <span>Selected edge</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span>Selected node</span>
                                </div>
                            </div>
                        </div>

                        <NetworkGraph
                            nodes={nodes} edges={edges}
                            selectedNode={selectedNode} selectedEdge={selectedEdge}
                            onNodeClick={handleNodeClick} onEdgeClick={handleEdgeClick}
                        />
                    </div>

                    {/* Slide-in panels */}
                    <AnimatePresence>
                        {selectedContributor && (
                            <ContributorDetailPanel node={selectedContributor} commits={repoData.commits} onClose={closePanel} />
                        )}
                        {selectedEdge && !selectedContributor && (
                            <EdgeDetailPanel edge={selectedEdge} onClose={closePanel} />
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <ContributorTimeline nodes={nodes} commits={repoData.commits} />
            )}
        </motion.div>
    );
}
