import React from 'react';
import { BarChart3, LayoutGrid, Users, TrendingUp, GitBranch } from 'lucide-react';

const VisualizationSwitcher = ({ activeView, onViewChange }) => {
  const views = [
    { id: 'contributors', label: 'Contributor Activity', icon: Users },
    { id: 'commit-graph', label: 'Commit Graph', icon: GitBranch },
    { id: 'evolution', label: 'File Evolution', icon: TrendingUp },
    { id: 'heatmap', label: 'Repository Heatmap', icon: LayoutGrid },
    { id: 'complexity', label: 'Code Complexity', icon: BarChart3 },
    { id: 'branches', label: 'Branch Graph', icon: GitBranch },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/50 border border-slate-800 rounded-xl w-fit">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = activeView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${isActive 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
            {view.label}
          </button>
        );
      })}
    </div>
  );
};

export default VisualizationSwitcher;
