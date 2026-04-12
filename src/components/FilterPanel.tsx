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
          {
  selectedAuthors.length > 0 && (
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
  )
}
        </div >
      </div >

  {/* File Types */ }
  < div className = "space-y-3" >
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
      </div >

  {/* Time Range */ }
  < div className = "space-y-3" >
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
      </div >
    </div >
  );
}
