import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const HoverInsightPanel = ({ data }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [panelStyle, setPanelStyle] = useState({});

  useEffect(() => {
    if (!data) return;

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [data]);

  useEffect(() => {
    if (!position.x && !position.y) return;

    const panelWidth = 300; // max-width
    const panelHeight = 150; // approximate height
    
    let left = position.x + 15;
    let top = position.y + 15;

    // Constrain to viewport
    if (left + panelWidth > window.innerWidth) {
      left = position.x - panelWidth - 15;
    }
    if (top + panelHeight > window.innerHeight) {
      top = position.y - panelHeight - 15;
    }

    setPanelStyle({
      left: `${left}px`,
      top: `${top}px`,
      maxWidth: `${panelWidth}px`
    });
  }, [position]);

  if (!data) return null;

  const { type, ...content } = data;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-50 p-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl text-slate-100 pointer-events-none"
        style={panelStyle}
      >
        {type === 'commit' && (
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-slate-700 pb-2">Commit Details</h3>
            <p className="text-xs text-slate-400 mb-1">Hash: {content.hash?.substring(0, 7)}</p>
            <p className="text-sm font-medium mb-2">{content.message}</p>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{content.author}</span>
              <span>{new Date(content.date).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-emerald-400">+{content.additions}</span>
              <span className="text-rose-400">-{content.deletions}</span>
            </div>
          </div>
        )}
        
        {type === 'timeline' && (
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-slate-700 pb-2">Timeline Summary</h3>
            <p className="text-sm mb-1">Date: {content.date}</p>
            <p className="text-sm mb-1">Commits: {content.commitCount}</p>
            {content.contributors && content.contributors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Contributors ({content.contributors.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {content.contributors.slice(0, 5).map(c => (
                    <span key={c} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{c}</span>
                  ))}
                  {content.contributors.length > 5 && (
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">+{content.contributors.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {type === 'heatmap' && (
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-slate-700 pb-2">File Activity</h3>
            <p className="text-xs text-slate-400 mb-1 break-all">{content.path}</p>
            <p className="text-sm mb-1">Commits: {content.commitCount}</p>
            <p className="text-sm">Last Modified: {new Date(content.lastModified).toLocaleDateString()}</p>
          </div>
        )}
        {type === 'donut' && (
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-slate-700 pb-2">Contributor</h3>
            <p className="text-sm font-medium mb-1">{content.name}</p>
            <p className="text-sm mb-1">Commits: {content.value}</p>
            <p className="text-sm text-slate-400">Share: {content.percentage}%</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default HoverInsightPanel;
