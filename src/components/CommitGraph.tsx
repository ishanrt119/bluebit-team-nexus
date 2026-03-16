import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Position, 
  Handle, 
  Background, 
  Controls,
  ConnectionLineType,
  MarkerType,
  EdgeProps,
  getBezierPath,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Commit, cn } from '../lib/utils';
import { 
  GitCommit, 
  User, 
  Calendar, 
  FileText, 
  Plus, 
  Minus, 
  Wrench,
  Bug,
  Sparkles,
  GitBranch,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface CommitGraphProps {
  commits: Commit[];
  onCommitClick?: (commit: Commit) => void;
}

const nodeWidth = 180;
const nodeHeight = 40;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: direction, 
    ranksep: 60, 
    nodesep: 100,
    marginx: 50,
    marginy: 50
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Outer glow path */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 6,
          stroke: style.stroke,
          opacity: 0.08,
          filter: 'blur(6px)',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      {/* Inner glow path */}
      <path
        id={`${id}-glow`}
        style={{
          ...style,
          strokeWidth: 3,
          stroke: style.stroke,
          opacity: 0.15,
          filter: 'blur(2px)',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      {/* Main path */}
      <path
        id={`${id}-main`}
        style={{
          ...style,
          strokeWidth: 2,
          strokeDasharray: animated ? '10,10' : undefined,
        }}
        className={cn(
          "react-flow__edge-path transition-all duration-500",
          animated && "animate-[dash_30s_linear_infinite]"
        )}
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Flowing particle */}
      {animated && (
        <circle r="2.5" fill={style.stroke as string} className="filter blur-[1px]">
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  );
};

const CommitNode = ({ data, selected }: { data: Commit & { index?: number }; selected?: boolean }) => {
  const isLatest = data.isLatest;
  const index = data.index ?? 0;

  const typeInfo = useMemo(() => {
    const msg = data.message.toLowerCase();
    if (msg.includes('fix') || msg.includes('bug')) {
      return { color: 'bg-rose-500/80', glow: 'shadow-rose-500/50', label: 'Bug Fix' };
    }
    if (msg.includes('refactor')) {
      return { color: 'bg-blue-500/80', glow: 'shadow-blue-500/50', label: 'Refactor' };
    }
    if (msg.includes('feat') || msg.includes('add')) {
      return { color: 'bg-emerald-500/80', glow: 'shadow-emerald-500/50', label: 'Feature' };
    }
    return { color: 'bg-amber-500/80', glow: 'shadow-amber-500/50', label: 'Neutral' };
  }, [data.message]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: 'spring', 
        damping: 20, 
        stiffness: 300,
        delay: index * 0.05 
      }}
      className="relative group cursor-pointer"
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      
      <div className="flex items-center gap-3 p-2 rounded-xl transition-colors group-hover:bg-white/5">
        {/* Circular Node */}
        <div className={cn(
          "relative w-4 h-4 rounded-full transition-all duration-300 z-10",
          typeInfo.color,
          "border-2 border-zinc-950",
          isLatest ? "scale-150 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20" : "shadow-lg",
          selected && "ring-4 ring-white/40 scale-125 animate-pulse",
          "group-hover:scale-125 group-hover:brightness-110 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]"
        )}>
          {isLatest && (
            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/40" />
          )}
        </div>

        {/* Label */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
              {data.sha.substring(0, 7)}
            </span>
          </div>
          <p className="text-[11px] font-medium text-zinc-300 truncate w-32 leading-tight group-hover:text-white transition-colors">
            {data.message}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </motion.div>
  );
};

const nodeTypes = {
  commit: CommitNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const EDGE_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#f59e0b', // amber
];

export function CommitGraph({ commits, onCommitClick }: CommitGraphProps) {
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const filteredCommits = useMemo(() => {
    if (!authorFilter) return commits;
    return commits.filter(c => c.author === authorFilter);
  }, [commits, authorFilter]);

  const authors = useMemo(() => {
    return Array.from(new Set(commits.map(c => c.author)));
  }, [commits]);

  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = filteredCommits.map((commit, idx) => ({
      id: commit.sha,
      type: 'commit',
      data: { ...commit, isLatest: idx === 0, index: idx },
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = [];
    filteredCommits.forEach((commit, idx) => {
      if (commit.parentShas) {
        commit.parentShas.forEach((parentSha, pIdx) => {
          if (filteredCommits.some(c => c.sha === parentSha)) {
            const colorIndex = (idx + pIdx) % EDGE_COLORS.length;
            initialEdges.push({
              id: `e-${parentSha}-${commit.sha}`,
              source: parentSha,
              target: commit.sha,
              type: 'custom',
              animated: true,
              style: { stroke: EDGE_COLORS[colorIndex] },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: EDGE_COLORS[colorIndex],
                width: 20,
                height: 20,
              },
            });
          }
        });
      }
    });

    return getLayoutedElements(initialNodes, initialEdges);
  }, [filteredCommits]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onCommitClick) {
      onCommitClick(node.data);
    }
  }, [onCommitClick]);

  return (
    <div className="h-[700px] w-full bg-zinc-950 rounded-[2.5rem] border border-white/5 overflow-hidden relative group shadow-2xl">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
        <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-tight">Commit Timeline</span>
            <span className="text-[10px] text-zinc-500 font-medium">{filteredCommits.length} commits analyzed</span>
          </div>
        </div>

        <div className="relative">
          <select 
            className="appearance-none bg-zinc-900/50 backdrop-blur-2xl px-6 py-2.5 pr-10 rounded-2xl border border-white/10 text-[11px] font-bold text-zinc-300 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer hover:bg-zinc-900/80"
            onChange={(e) => setAuthorFilter(e.target.value || null)}
            value={authorFilter || ''}
          >
            <option value="">All Contributors</option>
            {authors.map(author => (
              <option key={author} value={author}>{author}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <User className="w-3 h-3" />
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isLoaded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={onNodeClick}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={1.5}
              className="bg-transparent"
            >
              <Background color="#ffffff" gap={30} size={1} variant={BackgroundVariant.Dots} className="opacity-[0.03]" />
              <Controls 
                className="!bg-zinc-900/80 !backdrop-blur-xl !border-white/10 !rounded-2xl !shadow-2xl !p-1 !m-6 overflow-hidden" 
                showInteractive={false}
              />
            </ReactFlow>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 left-6 z-20 flex gap-6 bg-zinc-900/50 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
        {[
          { color: 'bg-emerald-500/80', label: 'Feature' },
          { color: 'bg-rose-500/80', label: 'Bug Fix' },
          { color: 'bg-blue-500/80', label: 'Refactor' },
          { color: 'bg-amber-500/80', label: 'Neutral' }
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2.5">
            <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", item.color)} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
