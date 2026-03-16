import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import {
    ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Flame, Code2,
    GitCommit, Bug, RefreshCw, Zap, FileCode, BarChart2
} from 'lucide-react';
import { RepoData, cn } from '../lib/utils';
import { format, parseISO, subWeeks, isAfter } from 'date-fns';

interface CodeHealthDashboardProps { repoData: RepoData; }

// ─── Color palette for pie ─────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
    '.ts': '#3b82f6', '.tsx': '#60a5fa', '.js': '#f59e0b', '.jsx': '#fbbf24',
    '.py': '#10b981', '.css': '#8b5cf6', '.json': '#71717a', '.md': '#a3e635',
    '.html': '#f97316', '.go': '#06b6d4', '.rs': '#ef4444', '.java': '#f59e0b',
    '.rb': '#dc2626', '.php': '#a78bfa', '.sh': '#4ade80',
};
const DEFAULT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

// ─── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
    icon, label, value, sub, color, trend
}: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string;
    color: string; trend?: 'up' | 'down' | 'neutral';
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"
        >
            <div className={cn('p-3 rounded-xl border', color)}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
                <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-zinc-100">{value}</p>
                    {trend && trend !== 'neutral' && (
                        trend === 'up'
                            ? <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
                            : <TrendingDown className="w-4 h-4 text-rose-400 mb-1" />
                    )}
                </div>
                {sub && <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CodeHealthDashboard({ repoData }: CodeHealthDashboardProps) {
    const commits = repoData.commits;

    // ── Core metrics derived from cached data ──────────────────────────────────

    const metrics = useMemo(() => {
        const totalCommits = commits.length;

        // Bug fix rate
        const bugFixes = commits.filter(c =>
            /\b(fix|bug|patch|hotfix|issue|error|resolve)\b/i.test(c.message)
        ).length;
        const bugFixRate = totalCommits > 0 ? ((bugFixes / totalCommits) * 100).toFixed(1) : '0';

        // Refactor ratio
        const refactors = commits.filter(c =>
            /\b(refactor|clean|reorganize|restructure|improve|optimize)\b/i.test(c.message)
        ).length;
        const refactorRatio = totalCommits > 0 ? ((refactors / totalCommits) * 100).toFixed(1) : '0';

        // Real churn rate: files touched > 1 time / total unique files
        const fileCounts: Record<string, number> = {};
        commits.forEach(c => {
            const files = (c.filePaths ?? c.modifiedFiles ?? []);
            files.forEach(f => { fileCounts[f] = (fileCounts[f] || 0) + 1; });
        });
        const totalUniqueFiles = Object.keys(fileCounts).length;
        const churnedFiles = Object.values(fileCounts).filter(n => n > 1).length;
        const churnRate = totalUniqueFiles > 0
            ? ((churnedFiles / totalUniqueFiles) * 100).toFixed(1)
            : '0';

        // Commit velocity: this 4 weeks vs previous 4 weeks
        const now = new Date();
        const fourWeeksAgo = subWeeks(now, 4);
        const eightWeeksAgo = subWeeks(now, 8);
        const recentCommits = commits.filter(c => isAfter(parseISO(c.date), fourWeeksAgo)).length;
        const prevCommits = commits.filter(c => {
            const d = parseISO(c.date);
            return isAfter(d, eightWeeksAgo) && !isAfter(d, fourWeeksAgo);
        }).length;
        const velocityTrend: 'up' | 'down' | 'neutral' = recentCommits >= prevCommits ? 'up' : 'down';

        // Hot files (top 15 most touched)
        const hotFiles = Object.entries(fileCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([file, count]) => ({ file: file.split('/').pop() || file, fullPath: file, count }));

        // Language breakdown (from repoData.files)
        const langCounts: Record<string, number> = {};
        (repoData.files ?? []).forEach(f => {
            const ext = '.' + (f.split('.').pop() || 'other');
            langCounts[ext] = (langCounts[ext] || 0) + 1;
        });
        const langData = Object.entries(langCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([ext, count]) => ({ name: ext, value: count, color: LANG_COLORS[ext] || '#52525b' }));

        // Commit activity by day of week
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayActivity = Array.from({ length: 7 }, (_, i) => ({ day: dayLabels[i], count: 0 }));
        commits.forEach(c => {
            const d = new Date(c.date).getDay();
            dayActivity[d].count += 1;
        });

        // Weekly velocity (last 12 weeks)
        const weeklyMap: Record<string, number> = {};
        commits.forEach(c => {
            const week = format(parseISO(c.date), 'MMM dd');
            weeklyMap[week] = (weeklyMap[week] || 0) + 1;
        });
        const weeklyVelocity = Object.entries(weeklyMap)
            .map(([week, count]) => ({ week, count }))
            .slice(-12);

        // Health score (0–100): lower churn + higher bug fix + refactor = healthier
        const healthScore = Math.min(100, Math.round(
            50 +
            Math.min(20, parseFloat(refactorRatio)) -
            Math.min(20, parseFloat(churnRate) * 0.4) +
            Math.min(10, parseFloat(bugFixRate) * 0.3)
        ));

        return {
            bugFixes, bugFixRate, refactors, refactorRatio,
            churnRate, churnedFiles, totalUniqueFiles,
            recentCommits, prevCommits, velocityTrend,
            hotFiles, langData, dayActivity, weeklyVelocity, healthScore
        };
    }, [commits, repoData.files]);

    // ── Health score color ─────────────────────────────────────────────────────
    const scoreColor = metrics.healthScore >= 70 ? 'text-emerald-400'
        : metrics.healthScore >= 45 ? 'text-amber-400' : 'text-rose-400';
    const scoreBg = metrics.healthScore >= 70 ? 'bg-emerald-500/10 border-emerald-500/20'
        : metrics.healthScore >= 45 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';
    const scoreLabel = metrics.healthScore >= 70 ? 'Healthy' : metrics.healthScore >= 45 ? 'Fair' : 'Needs Attention';
    const ScoreIcon = metrics.healthScore >= 70 ? ShieldCheck : metrics.healthScore >= 45 ? AlertTriangle : AlertTriangle;

    const CustomPieTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 shadow-xl">
                <p className="text-xs font-bold text-zinc-200">{payload[0].name}</p>
                <p className="text-[11px] text-zinc-400">{payload[0].value} files</p>
            </div>
        );
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-emerald-400" /> Code Health Dashboard
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        Metrics derived from {commits.length.toLocaleString()} commits in <span className="text-zinc-300 font-medium">{repoData.owner}/{repoData.repoName}</span>
                    </p>
                </div>

                {/* Health score badge */}
                <div className={cn('flex items-center gap-3 px-5 py-3 rounded-2xl border', scoreBg)}>
                    <ScoreIcon className={cn('w-6 h-6', scoreColor)} />
                    <div>
                        <p className={cn('text-2xl font-bold', scoreColor)}>{metrics.healthScore}<span className="text-sm font-normal">/100</span></p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{scoreLabel}</p>
                    </div>
                </div>
            </div>

            {/* 4 metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<Flame className="w-5 h-5 text-orange-400" />}
                    label="Churn Rate"
                    value={`${metrics.churnRate}%`}
                    sub={`${metrics.churnedFiles} of ${metrics.totalUniqueFiles} files churned`}
                    color="bg-orange-500/10 border-orange-500/20"
                    trend={parseFloat(metrics.churnRate) > 50 ? 'down' : 'neutral'}
                />
                <MetricCard
                    icon={<Bug className="w-5 h-5 text-rose-400" />}
                    label="Bug Fix Rate"
                    value={`${metrics.bugFixRate}%`}
                    sub={`${metrics.bugFixes} fix commits`}
                    color="bg-rose-500/10 border-rose-500/20"
                    trend="neutral"
                />
                <MetricCard
                    icon={<RefreshCw className="w-5 h-5 text-blue-400" />}
                    label="Refactor Ratio"
                    value={`${metrics.refactorRatio}%`}
                    sub={`${metrics.refactors} refactor commits`}
                    color="bg-blue-500/10 border-blue-500/20"
                    trend={parseFloat(metrics.refactorRatio) > 5 ? 'up' : 'neutral'}
                />
                <MetricCard
                    icon={<Zap className="w-5 h-5 text-yellow-400" />}
                    label="Recent Velocity"
                    value={metrics.recentCommits}
                    sub={`vs ${metrics.prevCommits} prev 4 weeks`}
                    color="bg-yellow-500/10 border-yellow-500/20"
                    trend={metrics.velocityTrend}
                />
            </div>

            {/* Charts row 1: Commit velocity + Day of week activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly velocity */}
                <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-5 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Commit Velocity (last 12 periods)
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.weeklyVelocity} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="week" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} minTickGap={20} />
                                <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 10, fontSize: 11 }} cursor={{ stroke: '#10b981', strokeWidth: 1 }} />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Day of week heatmap */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-5 flex items-center gap-2">
                        <GitCommit className="w-3.5 h-3.5" /> Activity by Day
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.dayActivity} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="day" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 10, fontSize: 11 }} cursor={{ fill: '#10b98115' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts row 2: Hot files + Language breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hot files */}
                <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-5 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-orange-400" /> Hottest Files (most changed)
                    </h3>
                    <div className="space-y-2.5">
                        {metrics.hotFiles.length > 0 ? metrics.hotFiles.map((f, i) => {
                            const max = metrics.hotFiles[0].count;
                            const pct = Math.round((f.count / max) * 100);
                            const barColor = i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#f59e0b' : '#10b981';
                            return (
                                <div key={f.fullPath}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <FileCode className="w-3 h-3 text-zinc-600 shrink-0" />
                                            <span className="text-xs text-zinc-300 font-mono truncate max-w-[280px]">{f.file}</span>
                                        </div>
                                        <span className="text-[10px] font-bold font-mono" style={{ color: barColor }}>{f.count}×</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, delay: i * 0.04 }}
                                            className="h-full rounded-full"
                                            style={{ background: barColor }}
                                        />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-xs text-zinc-600 italic">No file-level data available — analyze a repo with a GitHub token to see hot files.</p>
                        )}
                    </div>
                </div>

                {/* Language breakdown pie */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5" /> Languages
                    </h3>
                    {metrics.langData.length > 0 ? (
                        <div>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={metrics.langData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={60}
                                            innerRadius={30}
                                            paddingAngle={2}
                                        >
                                            {metrics.langData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                                {metrics.langData.map((l, i) => (
                                    <div key={l.name} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: l.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
                                        <span className="text-[10px] text-zinc-400 font-mono">{l.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-zinc-600 text-xs text-center">
                            <div>
                                <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No language data.<br />Files list not available.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
