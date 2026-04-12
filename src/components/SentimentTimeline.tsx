import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Commit, cn } from '../lib/utils';
import { format, parseISO, subDays, isAfter, startOfWeek } from 'date-fns';

interface SentimentTimelineProps {
  commits: Commit[];
    // Smoothing (Simple Moving Average)
    const smoothData = (arr: any[]) => {
  return arr.map((point, index, original) => {
    const prev = original[index - 1]?.sentiment ?? point.sentiment;
    const next = original[index + 1]?.sentiment ?? point.sentiment;
    return {
      ...point,
      sentiment: (prev + point.sentiment + next) / 3
    };
  });
};

data = smoothData(data);

return { data, isFallback, rangeLabel };
  }, [commits, timeRange]);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl max-w-xs">
        <p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">{data.date}</p>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            data.sentiment > 0.2 ? "bg-emerald-500" :
              data.sentiment < -0.2 ? "bg-red-500" : "bg-yellow-500"
          )} />
          <p className="text-sm font-bold text-white">
            Score: {data.sentiment.toFixed(2)}
          </p>
        </div>
        <p className="text-[11px] text-zinc-400 italic line-clamp-2">
          "{data.preview}"
        </p>
        <p className="text-[10px] text-zinc-600 mt-2">
          {data.count} commits on this day
        </p>
      </div>
    );
  }
  return null;
};

return (
  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Sentiment Timeline</h3>
        {processedData.isFallback && (
          <p className="text-[10px] text-amber-500 font-medium mt-1">
            No recent commits found. Showing last active period.
          </p>
        )}
      </div>

      <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
        {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={cn(
              "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
              timeRange === range
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {range}
          </button>
        ))}
      </div>
    </div>

    <div className="h-[300px] w-full">
      {processedData.data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData.data}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#27272a" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="sentiment"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const color = payload.sentiment > 0.1 ? '#10b981'
                  : payload.sentiment < -0.1 ? '#ef4444' : '#f59e0b';
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} strokeWidth={0} />;
              }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              animationDuration={1200}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-zinc-500 text-sm">No activity during this period.</p>
          <p className="text-zinc-700 text-xs">Try selecting a broader time range.</p>
        </div>
      )}
    </div>
  </div>
);
}
