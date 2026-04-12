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

                        </motion.button >
                    );
                })}
            </div >
        </div >
    );
}

// ─── Network Graph (SVG) ───────────────────────────────────────────────────────

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

        //                          </linearGradient>
                                ))}
                            </defs >
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="month" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
{
    top10.map((n, i) => (
                                <Area
                                    key={n.name}
                                    type="monotone"
                                    dataKey={n.name}
                                    stackId="1"
                                    stroke={CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length]}
                                    fill={`url(#grad-${i})`}
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
            </div >

        {/* Main panel */ }
            { viewMode === 'network' ? (
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
        </motion.div >
    );
}
