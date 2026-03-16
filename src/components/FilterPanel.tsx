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
        <div>
          <select
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
            onChange={(e) => {
              if (e.target.value) {
                // Don't toggle off if already selected, but if they pick it from the list add it
                if (!selectedAuthors.includes(e.target.value)) {
                  onAuthorToggle(e.target.value);
                }
                e.target.value = ''; // reset selection
              }
            }}
            value=""
          >
            <option value="" disabled>Select authors to add...</option>
            {authors.map(author => (
              <option key={author.name} value={author.name}>
                {author.name} ({author.count})
              </option>
            ))}
          </select>

          {selectedAuthors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
              {selectedAuthors.map(author => (
                <span 
                  key={author} 
                  className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-[10px] whitespace-nowrap"
                >
                  <span className="truncate max-w-[100px]">{author}</span>
                  <button onClick={() => onAuthorToggle(author)} className="hover:text-emerald-300 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
          Show Commits Up To
        </label>
        <div className="px-2 pt-2 space-y-4">
          <div>
            <div className="flex justify-between mb-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>0%</span>
              <span className="text-emerald-500">{Math.round((timeRange[1] / maxTime) * 100)}%</span>
            </div>
            <input 
              type="range"
              min={0}
              max={maxTime}
              value={timeRange[1]}
              onChange={(e) => onTimeRangeChange([0, parseInt(e.target.value)])}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
