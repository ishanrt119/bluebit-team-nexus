import React from 'react';

const DiffPreview = ({ diff, position }) => {
  if (!diff) return null;

  return (
    <div 
      className="fixed z-[9999] bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-2xl overflow-hidden max-w-2xl max-h-[400px] flex flex-col pointer-events-none"
      style={{ 
        left: position.x + 20, 
        top: position.y - 100,
        opacity: 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      <div className="bg-[#1e293b] px-3 py-2 flex justify-between items-center">
        <span className="text-[10px] font-mono text-slate-400">Diff Preview</span>
        <span className="text-[10px] text-emerald-400">+{diff.additions} -{diff.deletions}</span>
      </div>
      <div className="overflow-y-auto p-2 font-mono text-[11px] custom-scrollbar bg-[#020617]">
        {diff.lines.map((line, i) => {
          let bgColor = 'transparent';
          let textColor = '#94a3b8';
          let prefix = ' ';

          if (line.startsWith('+')) {
            bgColor = 'rgba(16, 185, 129, 0.1)';
            textColor = '#10b981';
            prefix = '+';
          } else if (line.startsWith('-')) {
            bgColor = 'rgba(244, 63, 94, 0.1)';
            textColor = '#f43f5e';
            prefix = '-';
          }

          return (
            <div key={i} className="flex gap-4 px-2 py-0.5" style={{ backgroundColor: bgColor }}>
              <span className="w-4 text-slate-600 text-right select-none">{i + 1}</span>
              <span className="w-2 text-center select-none" style={{ color: textColor }}>{prefix}</span>
              <span className="whitespace-pre" style={{ color: textColor }}>{line.substring(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiffPreview;
