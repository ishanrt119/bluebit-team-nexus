import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, User, Calendar, FileCode, GitCommit, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Commit, cn } from '../lib/utils';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'commit' | 'file';
  label: string;
  data?: any;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

int   d.fx = d.x;
d.fy = d.y;
    }

function dragged(event: any, d: any) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event: any, d: any) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

return () => {
  simulation.stop();
};
  }, [graphData, onNodeClick]);

return (
  <div ref={containerRef} className="h-[700px] w-full bg-zinc-950 rounded-[2.5rem] border border-white/5 overflow-hidden relative group shadow-2xl">
    <svg ref={svgRef} className="w-full h-full" />

    <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
      <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
        <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
          <Share2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white tracking-tight">Commit Network</span>
          <span className="text-[10px] text-zinc-500 font-medium">Force-directed relationship graph</span>
        </div>
      </div>

      <div className="relative">
        <select
          className="appearance-none bg-zinc-900/50 backdrop-blur-2xl px-6 py-2.5 pr-10 rounded-2xl border border-white/10 text-[11px] font-bold text-zinc-300 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:bg-zinc-900/80"
          onChange={(e) => setFilterAuthor(e.target.value || null)}
          value={filterAuthor || ''}
        >
          <option value="">All Contributors</option>
          {authors.map(author => (
            <option key={author} value={author}>{author}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <User className="w-3 h-3" />
        </div>
      </div>
    </div>

    <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
      <button
        onClick={() => {
          if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
          }
        }}
        className="p-3 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-colors"
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
        className="p-3 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-colors"
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
        className="p-3 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-colors"
        title="Toggle Fullscreen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>

    <AnimatePresence>
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute bottom-6 right-6 z-30 w-80 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              selectedNode.type === 'commit' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20"
            )}>
              {selectedNode.type === 'commit' ? <GitCommit className="w-5 h-5 text-emerald-400" /> : <FileCode className="w-5 h-5 text-blue-400" />}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white truncate">{selectedNode.label}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{selectedNode.type}</p>
          </div>

          {selectedNode.type === 'commit' && selectedNode.data && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <User className="w-3 h-3" />
                <span>{selectedNode.data.author}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Calendar className="w-3 h-3" />
                <span>{new Date(selectedNode.data.date).toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3 italic">
                "{selectedNode.data.message}"
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    <div className="absolute bottom-6 left-6 z-20 flex gap-6 bg-zinc-900/50 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Commit</span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">File</span>
      </div>
    </div>
  </div>
);
}
