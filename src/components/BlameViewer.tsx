import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Clock, GitCommit, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface BlameLine {
  lineNum: number;
  content: string;
  commit: {
    sha: string;
    author: string;
    date: string;
    avatar: string;
  } | null;
}

interface BlameViewerProps {
  repoId: string;
  path: string;
  onClose: () => void;
}

export function BlameViewer({ repoId, path, onClose }: BlameViewerProps) {
  const [blameData, setBlameData] = useState<{ lines?: BlameLine[], history?: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/repo/blame?repoId=${repoId}&path=${path}`);
        const data = await res.json();
        setBlameData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlame();
  }, [repoId, path]);

  // Generate unique colors for different authors
  const authorColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const palette = [
      'text-blue-400', 'text-emerald-400', 'text-purple-400', 
      'text-amber-400', 'text-pink-400', 'text-indigo-400',
      'text-orange-400', 'text-cyan-400', 'text-lime-400'
    ];
    
    let colorIdx = 0;
    const authors = blameData?.lines 
      ? Array.from(new Set(blameData.lines.map(l => l.commit?.author).filter(Boolean)))
      : blameData?.history 
        ? Array.from(new Set(blameData.history.map(h => h.author).filter(Boolean)))
        : [];

    authors.forEach((author: any) => {
      colors[author] = palette[colorIdx % palette.length];
      colorIdx++;
    });
    return colors;
  }, [blameData]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Info className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Git Blame: {path.split('/').pop()}</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : blameData?.lines ? (
          <div className="font-mono text-[11px] divide-y divide-zinc-900">
            {blameData.lines.map((line) => (
              <div key={line.lineNum} className="flex hover:bg-zinc-900/50 group">
                {/* Blame Info Column */}
                <div className="w-48 shrink-0 border-r border-zinc-900 p-1 flex items-center gap-2 bg-zinc-950/50">
                  <span className="w-6 text-zinc-700 text-right">{line.lineNum}</span>
                  {line.commit ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                      {line.commit.avatar ? (
                        <img src={line.commit.avatar} className="w-4 h-4 rounded-full" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-3 h-3 text-zinc-600" />
                      )}
                      <span className={cn("truncate font-bold", authorColors[line.commit.author])}>
                        {line.commit.author}
                      </span>
                      <span className="text-zinc-700 text-[9px]">{line.commit.sha.substring(0, 7)}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-800 italic">Unknown</span>
                  )}
                </div>
                {/* Code Column */}
                <div className="flex-1 p-1 pl-4 whitespace-pre text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {line.content || ' '}
                </div>
              </div>
            ))}
          </div>
        ) : blameData?.history ? (
          <div className="p-4 space-y-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Fallback Mode</p>
              <p className="text-xs text-zinc-400">Line-by-line blame unavailable. Showing file history instead.</p>
            </div>
            {blameData.history.map((commit) => (
              <div 
                key={commit.sha}
                className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {commit.avatar ? (
                      <img src={commit.avatar} className="w-6 h-6 rounded-full" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-3 h-3 text-zinc-400" />
                      </div>
                    )}
                    <span className={cn("text-xs font-bold", authorColors[commit.author])}>{commit.author}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{new Date(commit.date).toLocaleDateString()}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed italic">"{commit.message}"</p>
                <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600">
                  <GitCommit className="w-3 h-3" />
                  {commit.sha.substring(0, 12)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
            <Clock className="w-8 h-8 opacity-20" />
            <p className="text-xs">No authorship data found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
