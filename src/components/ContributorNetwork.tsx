import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
    Users, GitCommit, Plus, Minus, Calendar, Link2, Star, Trophy, Award, Medal,
    X, Loader2, FileText, ChevronRight
} from 'lucide-react';
import { RepoData, cn } from '../lib/utils';
import { format, parseISO, startOfWeek } from 'date-fns';

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

// ─── Layout Helpers ────────────────────────────────────────────────────────────

function computeCircularPositions(
    names: string[],
    cx: number,
    cy: number,
    radius: number
): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    const count = names.length;
    if (count === 0) return positions;
    if (count === 1) {
        positions[names[0]] = { x: cx, y: cy };
        return positions;
    }
    names.forEach((name, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        positions[name] = {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
        };
    });
    return positions;
}

const BADGE_ICONS = [
    <Trophy key="trophy" className="w-4 h-4 text-yellow-400" />,
    <Award key="award" className="w-4 h-4 text-zinc-300" />,
    <Medal key="medal" className="w-4 h-4 text-amber-600" />,
];

// ─── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
    const [error, setError] = useState(false);
    const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600'];
    const color = colors[name.charCodeAt(0) % colors.length];

    if (url && !error) {
        return (
            <img
                src={url}
                alt={name}
                width={size}
                height={size}
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
                onError={() => setError(true)}
            />
        );
    }
    return (
        <div
            className={cn('rounded-full flex items-center justify-center text-white font-bold', color)}
            style={{ width: size, height: size, fontSize: size * 0.35 }}
        >
            {initials}
        </div>
    );
}

// ─── Network SVG Graph ─────────────────────────────────────────────────────────

function NetworkGraph({
    nodes,
    edges,
    selectedNode,
    highlightedNode,
    onNodeClick,
}: {
    nodes: ContributorNode[];
    edges: NetworkEdge[];
    selectedNode: string | null;
    highlightedNode: string | null;
    onNodeClick: (name: string) => void;
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{
        x: number; y: number; edge: NetworkEdge;
    } | null>(null);
    const [dims, setDims] = useState({ w: 600, h: 500 });

    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ w: width, h: height });
        });
        if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement);
        return () => obs.disconnect();
    }, []);

    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const radius = Math.min(cx, cy) * 0.65;
    const nodeRadius = Math.max(20, Math.min(34, dims.w / (nodes.length + 4)));

    const positions = useMemo(
        () => computeCircularPositions(nodes.map(n => n.name), cx, cy, radius),
        [nodes, cx, cy, radius]
    );

    const maxEdgeWeight = useMemo(
        () => Math.max(1, ...edges.map(e => e.weight)),
        [edges]
    );
    const maxCommits = useMemo(
        () => Math.max(1, ...nodes.map(n => n.commitCount)),
        [nodes]
    );

    const isHighlighted = (name: string) =>
        !highlightedNode || highlightedNode === name ||
        edges.some(e =>
            (e.source === highlightedNode && e.target === name) ||
            (e.target === highlightedNode && e.source === name)
        );

    return (
        <div className="relative w-full h-full">
            <svg
                ref={svgRef}
                className="w-full h-full"
                viewBox={`0 0 ${dims.w} ${dims.h}`}
                onMouseLeave={() => setTooltip(null)}
            >
                <defs>
                    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </radialGradient>
                    {nodes.map(n => (
                        <clipPath key={`clip-${n.name}`} id={`clip-${n.name.replace(/\s/g, '_')}`}>
                            <circle cx="0" cy="0" r={nodeRadius - 2} />
                        </clipPath>
                    ))}
                </defs>

                {/* Edges */}
                {edges.map((edge, i) => {
                    const src = positions[edge.source];
                    const tgt = positions[edge.target];
                    if (!src || !tgt) return null;

                    const strokeW = 1 + (edge.weight / maxEdgeWeight) * 6;
                    const isEdgeHighlighted = !highlightedNode ||
                        edge.source === highlightedNode || edge.target === highlightedNode;
                    const midX = (src.x + tgt.x) / 2;
                    const midY = (src.y + tgt.y) / 2;

                    return (
                        <g key={`edge-${i}`}>
                            <line
                                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                                stroke={isEdgeHighlighted ? '#10b981' : '#27272a'}
                                strokeWidth={strokeW}
                                strokeOpacity={isEdgeHighlighted ? 0.6 : 0.15}
                                strokeLinecap="round"
                                className="transition-all duration-300 cursor-pointer"
                                onMouseEnter={e => {
                                    const rect = svgRef.current!.getBoundingClientRect();
                                    const scaleX = dims.w / rect.width;
                                    const scaleY = dims.h / rect.height;
                                    setTooltip({
                                        x: (e.clientX - rect.left) * scaleX,
                                        y: (e.clientY - rect.top) * scaleY,
                                        edge
                                    });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                            />
                            {/* Weight label on edge midpoint */}
                            {isEdgeHighlighted && edge.weight > 0 && (
                                <g>
                                    <circle cx={midX} cy={midY} r={10} fill="#18181b" stroke="#10b981" strokeWidth={0.5} strokeOpacity={0.4} />
                                    <text
                                        x={midX} y={midY + 4}
                                        textAnchor="middle"
                                        fill="#10b981"
                                        fontSize={9}
                                        opacity={0.8}
                                    >
                                        {edge.weight}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                    const pos = positions[node.name];
                    if (!pos) return null;
                    const scale = 0.6 + 0.4 * (node.commitCount / maxCommits);
                    const r = nodeRadius * scale;
                    const isSelected = selectedNode === node.name;
                    const dimmed = !isHighlighted(node.name);

                    return (
                        <g
                            key={node.name}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            className="cursor-pointer"
                            onClick={() => onNodeClick(node.name)}
                            style={{ opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.3s' }}
                        >
                            {/* Glow ring (selected) */}
                            {isSelected && (
                                <circle r={r + 8} fill="url(#nodeGlow)" />
                            )}
                            <circle
                                r={r + 3}
                                fill={isSelected ? '#10b981' : '#27272a'}
                                stroke={isSelected ? '#10b981' : '#3f3f46'}
                                strokeWidth={2}
                                className="transition-all duration-200"
                            />
                            {/* Avatar via foreignObject */}
                            <foreignObject x={-r} y={-r} width={r * 2} height={r * 2}>
                                <div
                                    className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                                    style={{ borderRadius: '50%' }}
                                >
                                    <Avatar name={node.name} url={node.avatarUrl} size={r * 2} />
                                </div>
                            </foreignObject>

                            {/* Name label */}
                            <text
                                y={r + 14}
                                textAnchor="middle"
                                fill={isSelected ? '#10b981' : '#a1a1aa'}
                                fontSize={10}
                                fontWeight={isSelected ? '700' : '400'}
                                className="pointer-events-none select-none"
                            >
                                {node.name.split(' ')[0]}
                            </text>
                            <text
                                y={r + 25}
                                textAnchor="middle"
                                fill="#52525b"
                                fontSize={9}
                                className="pointer-events-none select-none"
                            >
                                {node.commitCount}c
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Edge Tooltip */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute pointer-events-none z-30"
                        style={{
                            left: `${(tooltip.x / dims.w) * 100}%`,
                            top: `${(tooltip.y / dims.h) * 100}%`,
                            transform: 'translate(-50%, -110%)',
                        }}
                    >
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl min-w-[180px]">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2">
                                {tooltip.edge.weight} shared files
                            </p>
                            <div className="flex items-center gap-2 mb-2 text-xs text-zinc-300">
                                <span className="font-medium">{tooltip.edge.source}</span>
                                <Link2 className="w-3 h-3 text-zinc-600" />
                                <span className="font-medium">{tooltip.edge.target}</span>
                            </div>
                            <div className="space-y-0.5">
                                {tooltip.edge.sharedFiles.slice(0, 5).map(f => (
                                    <p key={f} className="text-[9px] font-mono text-zinc-500 truncate max-w-[180px]">
                                        {f}
                                    </p>
                                ))}
                                {tooltip.edge.sharedFiles.length > 5 && (
                                    <p className="text-[9px] text-zinc-600">+{tooltip.edge.sharedFiles.length - 5} more</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Activity Chart ─────────────────────────────────────────────────────────────

function ActivityChart({ node, commits }: { node: ContributorNode; commits: any[] }) {
    const data = useMemo(() => {
        const authorCommits = commits.filter(c => c.author === node.name);
        const weekMap: Record<string, number> = {};
        authorCommits.forEach(c => {
            const week = format(startOfWeek(parseISO(c.date)), 'MMM dd');
            weekMap[week] = (weekMap[week] || 0) + 1;
        });
        return Object.entries(weekMap)
            .map(([week, count]) => ({ week, count }))
            .slice(-12);
    }, [node.name, commits]);

    if (data.length === 0) return (
        <div className="h-24 flex items-center justify-center text-zinc-600 text-xs">No activity data</div>
    );

    return (
        <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="week" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11 }}
                        cursor={{ fill: '#10b98115' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function ContributorDetailPanel({
    node,
    commits,
    onClose,
}: {
    node: ContributorNode;
    commits: any[];
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="absolute top-0 right-0 h-full w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-20 overflow-y-auto flex flex-col"
        >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar name={node.name} url={node.avatarUrl} size={40} />
                    <div>
                        <h3 className="font-bold text-sm text-zinc-100">{node.name}</h3>
                        {node.login && (
                            <a
                                href={`https://github.com/${node.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1"
                            >
                                @{node.login} <Link2 className="w-2.5 h-2.5" />
                            </a>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            <div className="p-5 space-y-6 flex-1">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Commits', value: node.commitCount, icon: <GitCommit className="w-3.5 h-3.5 text-blue-400" /> },
                        { label: 'Added', value: `+${node.insertions.toLocaleString()}`, icon: <Plus className="w-3.5 h-3.5 text-emerald-400" /> },
                        { label: 'Deleted', value: `-${node.deletions.toLocaleString()}`, icon: <Minus className="w-3.5 h-3.5 text-rose-400" /> },
                    ].map(s => (
                        <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center">
                            <div className="flex items-center justify-center mb-1">{s.icon}</div>
                            <div className="text-sm font-bold text-zinc-100">{s.value}</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Dates */}
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

                {/* Activity chart */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Commit Activity</p>
                    <ActivityChart node={node} commits={commits} />
                </div>

                {/* Files touched */}
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

function HallOfFame({
    contributors,
    selectedNode,
    onSelect,
}: {
    contributors: ContributorNode[];
    selectedNode: string | null;
    onSelect: (name: string) => void;
}) {
    return (
        <div className="flex flex-col h-full bg-zinc-900/50 border-r border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Hall of Fame
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {contributors.map((c, i) => {
                    const isSelected = selectedNode === c.name;
                    return (
                        <motion.button
                            key={c.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => onSelect(c.name)}
                            className={cn(
                                'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left',
                                isSelected
                                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                                    : 'hover:bg-zinc-800/50 border border-transparent'
                            )}
                        >
                            <div className="relative shrink-0">
                                <Avatar name={c.name} url={c.avatarUrl} size={32} />
                                {i < 3 && (
                                    <div className="absolute -top-1 -right-1">
                                        {BADGE_ICONS[i]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-200 truncate">{c.name}</p>
                                <p className="text-[10px] text-zinc-500">{c.commitCount} commits</p>
                            </div>
                            <ChevronRight className={cn(
                                'w-3.5 h-3.5 shrink-0 transition-colors',
                                isSelected ? 'text-emerald-500' : 'text-zinc-700'
                            )} />
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ContributorNetworkProps {
    repoData: RepoData;
}

export function ContributorNetwork({ repoData }: ContributorNetworkProps) {
    const [networkData, setNetworkData] = useState<NetworkData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

    const repoId = `${repoData.owner}/${repoData.repoName}`;

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/contributor-network?repoId=${encodeURIComponent(repoId)}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setNetworkData(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [repoId]);

    const handleNodeClick = useCallback((name: string) => {
        setSelectedNode(prev => prev === name ? null : name);
        setHighlightedNode(prev => prev === name ? null : name);
    }, []);

    const selectedContributor = useMemo(
        () => networkData?.nodes.find(n => n.name === selectedNode) ?? null,
        [networkData, selectedNode]
    );

    if (loading) {
        return (
            <div className="h-[700px] flex flex-col items-center justify-center gap-4 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm text-zinc-400 font-mono animate-pulse">Building contributor network...</p>
            </div>
        );
    }

    if (error || !networkData) {
        return (
            <div className="h-[700px] flex flex-col items-center justify-center gap-3 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
                <Users className="w-10 h-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">{error || 'No data available'}</p>
            </div>
        );
    }

    const { nodes, edges, topContributors } = networkData;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    {
                        icon: <Users className="w-5 h-5 text-purple-400" />,
                        label: 'Contributors',
                        value: nodes.length,
                    },
                    {
                        icon: <Link2 className="w-5 h-5 text-emerald-400" />,
                        label: 'Connections',
                        value: edges.length,
                    },
                    {
                        icon: <Star className="w-5 h-5 text-yellow-400" />,
                        label: 'Top Contributor',
                        value: topContributors[0]?.name.split(' ')[0] ?? '—',
                    },
                ].map(s => (
                    <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">{s.icon}</div>
                        <div>
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-xs text-zinc-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main panel */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden h-[620px] flex relative">
                {/* Hall of Fame */}
                <div className="w-56 shrink-0 h-full">
                    <HallOfFame
                        contributors={topContributors}
                        selectedNode={selectedNode}
                        onSelect={name => {
                            handleNodeClick(name);
                        }}
                    />
                </div>

                {/* Graph */}
                <div className="flex-1 h-full relative">
                    {/* Ambient background */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-[-15%] left-[20%] w-[40%] h-[40%] bg-emerald-500/5 blur-[100px] rounded-full" />
                        <div className="absolute bottom-[-15%] right-[10%] w-[35%] h-[35%] bg-blue-500/5 blur-[100px] rounded-full" />
                    </div>

                    {/* Header overlay */}
                    <div className="absolute top-4 left-4 z-10">
                        <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl">
                            <p className="text-xs font-bold text-zinc-300">Contributor Network</p>
                            <p className="text-[10px] text-zinc-500">
                                {selectedNode ? `Showing ${selectedNode}'s connections` : 'Click a node to explore'}
                            </p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/70 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                <div className="w-6 h-0.5 bg-emerald-500 rounded" style={{ height: 3 }} />
                                Shared files (thicker = more)
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500" />
                                Selected
                            </div>
                        </div>
                    </div>

                    <NetworkGraph
                        nodes={nodes}
                        edges={edges}
                        selectedNode={selectedNode}
                        highlightedNode={highlightedNode}
                        onNodeClick={handleNodeClick}
                    />
                </div>

                {/* Detail Panel */}
                <AnimatePresence>
                    {selectedContributor && (
                        <ContributorDetailPanel
                            node={selectedContributor}
                            commits={repoData.commits}
                            onClose={() => {
                                setSelectedNode(null);
                                setHighlightedNode(null);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
