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
}             </motion.div >
            ))}
          </div >
        </div >

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
      </div >
    </div >
  );
}
