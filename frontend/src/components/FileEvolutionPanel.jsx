import React, { useState, useMemo } from 'react';
import { Search, File, ChevronRight, X, TrendingUp, History } from 'lucide-react';
import FileGrowthChart from './charts/FileGrowthChart';

const FileEvolutionPanel = ({ commitHistory, fileActivity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Get all unique files from commit history
  const allFiles = useMemo(() => {
    if (!fileActivity) return [];
    return fileActivity.map(f => f.path).sort();
  }, [fileActivity]);

  const filteredFiles = useMemo(() => {
    return allFiles.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allFiles, searchTerm]);

  const toggleFile = (path) => {
    setSelectedFiles(prev => 
      prev.includes(path) 
        ? prev.filter(f => f !== path) 
        : [...prev, path].slice(-5) // Limit to 5 files for clarity
    );
  };

  return (
    <div className="file-evolution-panel fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: File Selector */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="chart-card flex flex-col h-[600px]">
            <div className="p-4 border-bottom border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold">File Explorer</h4>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filteredFiles.map(file => (
                <button
                  key={file}
                  onClick={() => toggleFile(file)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                    selectedFiles.includes(file) 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <File className={`w-3 h-3 ${selectedFiles.includes(file) ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className="text-[11px] truncate flex-1">{file.split('/').pop()}</span>
                  {selectedFiles.includes(file) && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500">Select up to 5 files to compare their growth over time.</p>
            </div>
          </div>
        </div>

        {/* Main Content: Chart */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="chart-card">
            <div className="chart-header">
              <TrendingUp className="chart-icon" />
              <div>
                <h4>File Growth Timeline</h4>
                <p>Tracking lines of code over the repository history</p>
              </div>
            </div>
            
            <div className="p-6">
              {selectedFiles.length > 0 ? (
                <FileGrowthChart data={commitHistory} selectedFiles={selectedFiles} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                    <File className="w-8 h-8 text-slate-700" />
                  </div>
                  <h5 className="text-white font-medium">No Files Selected</h5>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
                    Select files from the explorer on the left to visualize their evolution and growth.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Files Info */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedFiles.map(file => {
                const stats = commitHistory
                  .filter(c => c.files && c.files.some(f => f.path === file));
                const totalAdditions = stats.reduce((sum, c) => sum + c.files.find(f => f.path === file).additions, 0);
                const totalDeletions = stats.reduce((sum, c) => sum + c.files.find(f => f.path === file).deletions, 0);
                
                return (
                  <div key={file} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <File className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-white truncate">{file.split('/').pop()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase">Commits</span>
                        <p className="text-lg font-bold text-white">{stats.length}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase">Current Lines</span>
                        <p className="text-lg font-bold text-emerald-400">{totalAdditions - totalDeletions}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-[10px]">
                      <span className="text-emerald-500">+{totalAdditions} additions</span>
                      <span className="text-rose-500">-{totalDeletions} deletions</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileEvolutionPanel;
