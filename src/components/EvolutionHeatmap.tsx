import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, AlertCircle, FileCode, Folder, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileActivity {
  path: string;
  commits: number;
  insertions: number;
  deletions: number;
  churn: number;
  lastModified: string;
  isDebt?: boolean;
}

interface EvolutionHeatmapProps {
  repoData: any;
  onFileClick?: (path: string) => void;
}

export function EvolutionHeatmap({ repoData, onFileClick }: EvolutionHeatmapProps) {
  const [hoveredFile, setHoveredFile] = useState<FileActivity | null>(null);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(repoData.commits?.length - 1 || 0);

  const sortedCommits = useMemo(() => {
    return [...(repoData.commits || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [repoData.commits]);

  const fileActivities = useMemo(() => {
    const activities: Record<string, FileActivity> = {};
    const commitsUpToNow = sortedCommits.slice(0, currentTimeIndex + 1);
    
    // Initialize
    (repoData.files || []).forEach((path: string) => {
      activities[path] = {
        path,
        commits: 0,
        insertions: 0,
        deletions: 0,
        churn: 0,
        lastModified: '',
        isDebt: false
      };
    });

    // Accumulate real data
    commitsUpToNow.forEach(commit => {
      // In a real scenario we'd have exact file hunks. Here we distribute the commit's total additions/deletions 
      // evenly across the modified files to create a realistic churn heatmap relative to the commit size.
      const modifiedFiles = commit.modifiedFiles || commit.filePaths || [];
      if (modifiedFiles.length > 0) {
        const insPerFile = Math.ceil((commit.insertions || 0) / modifiedFiles.length);
        const delPerFile = Math.ceil((commit.deletions || 0) / modifiedFiles.length);

        modifiedFiles.forEach((file: string) => {
          if (activities[file]) {
            activities[file].commits += 1;
            activities[file].insertions += insPerFile;
            activities[file].deletions += delPerFile;
            activities[file].churn += (insPerFile + delPerFile);
            activities[file].lastModified = commit.date;
          }
        });
      }
    });

    // Calculate technical debt flag based on actual accumulated stats
    Object.values(activities).forEach(act => {
      act.isDebt = (act.churn > 200 && act.commits > 10);
    });

    return Object.values(activities).sort((a, b) => b.churn - a.churn);
  }, [repoData, sortedCommits, currentTimeIndex]);

  const colorScale = useMemo(() => {
    const maxChurn = d3.max(fileActivities, d => d.churn) || 1;
    return d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxChurn]);
  }, [fileActivities]);

  const churnColorScale = useMemo(() => {
    const maxChurn = d3.max(fileActivities, d => d.churn) || 1;
    return d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxChurn]);
  }, [fileActivities]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Temporal File Heatmap</h2>
              <p className="text-sm text-zinc-500">Evolution of codebase structure over time</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hotspot</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            <span>Project Genesis</span>
            <span className="text-emerald-500">
              {sortedCommits[currentTimeIndex] ? new Date(sortedCommits[currentTimeIndex].date).toLocaleDateString() : 'Present'}
            </span>
            <span>Current State</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max={sortedCommits.length - 1} 
            value={currentTimeIndex} 
            onChange={(e) => setCurrentTimeIndex(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="text-center">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              Viewing state at commit {currentTimeIndex + 1} of {sortedCommits.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] min-h-[600px]">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {fileActivities.map((file) => (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                onMouseEnter={() => setHoveredFile(file)}
                onMouseLeave={() => setHoveredFile(null)}
                onClick={() => onFileClick?.(file.path)}
                className={cn(
                  "p-4 rounded-2xl cursor-pointer relative overflow-hidden group border border-white/5 flex flex-col justify-between h-32 transition-colors",
                  file.isDebt && "ring-2 ring-red-500/50"
                )}
                style={{ 
                  backgroundColor: file.churn > 2000 ? `${churnColorScale(file.churn)}22` : `${colorScale(file.churn)}22`,
                  borderColor: file.churn > 2000 ? churnColorScale(file.churn) : colorScale(file.churn)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <FileCode className="w-4 h-4 text-zinc-400" />
                  </div>
                  {file.isDebt && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                
                <div className="mt-auto">
                  <h3 className="text-[11px] font-black text-white truncate uppercase tracking-tight">
                    {file.path.split('/').pop()}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${Math.min(100, (file.commits / 20) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-zinc-500">{file.commits}c</span>
                  </div>
                </div>

                {/* Background Glow */}
                <div 
                  className="absolute -right-4 -bottom-4 w-16 h-16 blur-2xl opacity-20 rounded-full"
                  style={{ backgroundColor: file.churn > 2000 ? churnColorScale(file.churn) : colorScale(file.churn) }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {hoveredFile ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6 sticky top-24"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/5">
                    <FileCode className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{hoveredFile.path.split('/').pop()}</h3>
                    <p className="text-xs text-zinc-500 truncate">{hoveredFile.path}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Commits</span>
                    <span className="text-xl font-mono text-white">{hoveredFile.commits}</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Churn</span>
                    <span className="text-xl font-mono text-white">{hoveredFile.churn.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Insertions</span>
                    <span className="text-emerald-500 font-mono">+{hoveredFile.insertions.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(hoveredFile.insertions / (hoveredFile.insertions + hoveredFile.deletions)) * 100}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Deletions</span>
                    <span className="text-rose-500 font-mono">-{hoveredFile.deletions.toLocaleString()}</span>
                  </div>
                </div>

                {hoveredFile.isDebt && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Technical Debt Alert</p>
                      <p className="text-[11px] text-red-400/80 leading-relaxed mt-1">
                        This file has high churn and frequent commits. Consider refactoring to reduce complexity.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Info className="w-3 h-3" />
                    <span>Last modified {new Date(hoveredFile.lastModified).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/30 border border-dashed border-zinc-800 p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[400px]"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <Folder className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-400">Hover over a file</p>
                  <p className="text-xs text-zinc-600 mt-1">To see detailed activity metrics</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
