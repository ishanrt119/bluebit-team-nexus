import React, { useState, useMemo } from 'react';
import { LayoutGrid, FileText, Users, Clock, MessageSquare, Filter } from 'lucide-react';
import HeatmapTreemap from './charts/HeatmapTreemap';

const RepositoryHeatmap = ({ fileActivity, timeline, onFileClick }) => {
  const [timeRange, setTimeRange] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);

  const filteredData = useMemo(() => {
    if (!fileActivity) return [];
    
    // In a real app, we'd filter fileActivity based on timeRange
    // For now, let's assume fileActivity is already filtered or we just show it all
    return fileActivity;
  }, [fileActivity, timeRange]);

  const fileDetails = useMemo(() => {
    if (!selectedFile || !timeline) return null;
    
    const commits = timeline.filter(c => 
      // This is a bit simplified, in a real app we'd have file-to-commit mapping
      // For now, let's just show some recent commits if we had that data
      true 
    ).slice(0, 5);
    
    const contributors = new Set(commits.map(c => c.author));
    
    return {
      path: selectedFile,
      commitsCount: fileActivity.find(f => f.path === selectedFile)?.count || 0,
      contributors: Array.from(contributors),
      recentCommits: commits
    };
  }, [selectedFile, timeline, fileActivity]);

  const handleFileClick = (path) => {
    setSelectedFile(path);
    if (onFileClick) onFileClick(path);
  };

  return (
    <div className="repository-heatmap-container fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xl font-bold">Repository Structure Heatmap</h3>
        </div>
        
        <div className="tabs-pill">
          {['all', '6m', '1m', '1w'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`tab-item ${timeRange === range ? 'active' : ''}`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 chart-card">
          <div className="chart-header">
            <FileText className="chart-icon" />
            <div>
              <h4>File Activity Treemap</h4>
              <p>Size and color represent modification frequency</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <HeatmapTreemap data={filteredData} onFileClick={handleFileClick} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <MessageSquare className="chart-icon" />
            <div>
              <h4>File Details</h4>
              <p>Select a file to view history</p>
            </div>
          </div>
          
          {fileDetails ? (
            <div className="file-details-panel">
              <div className="mb-4">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Path</span>
                <p className="text-sm font-mono text-emerald-400 break-all">{fileDetails.path}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Changes</span>
                  <p className="text-xl font-bold text-white">{fileDetails.commitsCount}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Authors</span>
                  <p className="text-xl font-bold text-white">{fileDetails.contributors.length}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Top Contributors</span>
                <div className="flex flex-wrap gap-2">
                  {fileDetails.contributors.map((author, idx) => (
                    <span key={`${author}-${idx}`} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300">{author}</span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">Recent Activity</span>
                <div className="space-y-3">
                  {fileDetails.recentCommits.map((commit, idx) => (
                    <div key={commit.hash || commit.sha || idx} className="text-[11px] border-l-2 border-slate-800 pl-3 py-1">
                      <p className="text-slate-200 line-clamp-1">{commit.message}</p>
                      <p className="text-slate-500">{new Date(commit.date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                <Filter className="w-6 h-6 text-slate-700" />
              </div>
              <p className="text-slate-500 text-sm">Click a file in the treemap to see its detailed history and contributors.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositoryHeatmap;
