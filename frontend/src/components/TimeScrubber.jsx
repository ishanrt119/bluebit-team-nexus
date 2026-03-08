import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

const TimeScrubber = ({ timeline, onRangeChange }) => {
  const [range, setRange] = useState([0, 100]);
  const [isPlaying, setIsPlaying] = useState(false);

  const dates = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    return timeline.map(c => new Date(c.date)).sort((a, b) => a - b);
  }, [timeline]);

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  useEffect(() => {
    if (onRangeChange && minDate && maxDate) {
      const start = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * (range[0] / 100));
      const end = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * (range[1] / 100));
      onRangeChange({ start, end });
    }
  }, [range, minDate, maxDate, onRangeChange]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setRange(prev => {
          if (prev[1] >= 100) {
            setIsPlaying(false);
            return prev;
          }
          return [prev[0], prev[1] + 1];
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleReset = () => {
    setRange([0, 100]);
    setIsPlaying(false);
  };

  return (
    <div className="time-scrubber-container bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Repository Timeline Scrubber</h4>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Explore history through time</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg border transition-all ${isPlaying ? 'bg-emerald-500 border-emerald-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button 
            onClick={handleReset}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative pt-6 pb-2">
        <input
          type="range"
          min="0"
          max="100"
          value={range[1]}
          onChange={(e) => setRange([range[0], parseInt(e.target.value)])}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        
        <div className="flex justify-between mt-4">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Start Date</span>
            <span className="text-xs font-mono text-slate-300">{minDate?.toLocaleDateString() || 'N/A'}</span>
          </div>
          
          <div className="text-center">
            <span className="text-[10px] text-emerald-500 uppercase block mb-1">Current View</span>
            <span className="text-xs font-mono text-white">
              {new Date(minDate?.getTime() + (maxDate?.getTime() - minDate?.getTime()) * (range[1] / 100)).toLocaleDateString()}
            </span>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">End Date</span>
            <span className="text-xs font-mono text-slate-300">{maxDate?.toLocaleDateString() || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeScrubber;
