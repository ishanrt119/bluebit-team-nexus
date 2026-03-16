import React from 'react';
import { Search, User, FileType, Clock, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface FilterPanelProps {
  authors: { name: string; count: number }[];
  fileTypes: string[];
  selectedAuthors: string[];
  selectedFileTypes: string[];
  searchQuery: string;
  timeRange: [number, number];
  maxTime: number;
  onAuthorToggle: (author: string) => void;
  onFileTypeToggle: (ext: string) => void;
  onSearchChange: (query: string) => void;
  onTimeRangeChange: (range: [number, number]) => void;
  onReset: () => void;
}

export function FilterPanel({
  authors,
  fileTypes,
  selectedAuthors,
  selectedFileTypes,
  searchQuery,
  timeRange,
  maxTime,
  onAuthorToggle,
  onFileTypeToggle,
  onSearchChange,
  onTimeRangeChange,
  onReset
}: FilterPanelProps) {
  return (
    <div className="w-64 bg-zinc-900/50 border-r border-zinc-800 h-full overflow-y-auto p-6 space-y-8 custom-scrollbar">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Filters</h2>
        <button 
          onClick={onReset}
          className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-widest"
        >
          Reset All
        </button>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
          <Search className="w-3 h-3" />
          Keywords
        </label>
        <div className="relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search commits..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Authors */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
          <User className="w-3 h-3" />
          Authors
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {authors.map(author => (
            <button
              key={author.name}
              onClick={() => onAuthorToggle(author.name)}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-all",
                selectedAuthors.includes(author.name) 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent"
              )}
            >
              <span className="truncate max-w-[120px]">{author.name}</span>
              <span className="text-[9px] opacity-50">{author.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* File Types */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
          <FileType className="w-3 h-3" />
          File Types
        </label>
        <div className="flex flex-wrap gap-2">
          {fileTypes.map(ext => (
            <button
              key={ext}
              onClick={() => onFileTypeToggle(ext)}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all",
                selectedFileTypes.includes(ext)
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
              )}
            >
              {ext || 'no-ext'}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Time Range
        </label>
        <div className="px-2 pt-2">
          <input 
            type="range"
            min={0}
            max={maxTime}
            value={timeRange[1]}
            onChange={(e) => onTimeRangeChange([timeRange[0], parseInt(e.target.value)])}
            className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between mt-2 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
            <span>Start</span>
            <span>{Math.round((timeRange[1] / maxTime) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
