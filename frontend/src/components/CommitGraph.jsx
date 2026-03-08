import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const getCommitColor = (message) => {
  const msg = (message || '').toLowerCase();
  if (msg.includes('fix') || msg.includes('bug')) return '#ef4444'; // Red
  if (msg.includes('feat') || msg.includes('add')) return '#10b981'; // Green
  if (msg.includes('refactor') || msg.includes('style')) return '#38bdf8'; // Blue
  return '#f59e0b'; // Yellow
};

const BRANCH_COLORS = ['#f59e0b', '#38bdf8', '#a855f7', '#ec4899', '#84cc16'];
const getBranchColor = (branches) => {
  if (!branches || branches.length === 0) return '#94a3b8';
  const index = branches[0].length % BRANCH_COLORS.length;
  return BRANCH_COLORS[index];
};

const CommitNode = ({ data }) => (
  <div className="flex flex-col items-center justify-center h-full w-full px-2 text-center">
    <div className="text-[10px] font-bold truncate w-full">{data.sha}</div>
    <div className="text-[9px] truncate w-full">{data.label}</div>
    <div className="flex gap-1 mt-1">
      {data.commit.branches?.map(b => (
        <span key={b} className="text-[8px] bg-slate-700 text-slate-300 px-1 rounded">{b}</span>
      ))}
    </div>
  </div>
);

const nodeTypes = { commit: CommitNode };

const CommitGraph = ({ commits, contributors, onNodeHover, onNodeLeave }) => {
  console.log('Commits data:', commits);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [hoveredCommit, setHoveredCommit] = useState(null);
  const [selectedAuthors, setSelectedAuthors] = useState([]);

  const filteredCommits = useMemo(() => {
    if (!commits || !Array.isArray(commits)) return [];
    if (selectedAuthors.length === 0) return commits;
    return commits.filter(c => selectedAuthors.includes(c.author));
  }, [commits, selectedAuthors]);

  const toggleAuthor = (author) => {
    setSelectedAuthors(prev => 
      prev.includes(author) 
        ? prev.filter(a => a !== author) 
        : [...prev, author]
    );
  };

  const { nodes, edges } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

    const latestSha = filteredCommits.length > 0 ? filteredCommits[0].sha : null;

    const nodes = filteredCommits.map((commit, index) => ({
      id: commit.sha || `commit-${index}`,
      type: 'commit',
      data: { 
        label: (commit.message || '').substring(0, 20) + '...', 
        sha: (commit.sha || '').substring(0, 7), 
        commit 
      },
      position: { x: 0, y: 0 },
      style: { 
        background: getCommitColor(commit.message), 
        color: '#fff', 
        borderRadius: '8px', 
        width: 160, 
        height: 50, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: '11px',
        border: commit.sha === latestSha ? '2px solid white' : 'none',
        boxShadow: commit.sha === latestSha ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
        transition: 'all 0.2s ease-in-out'
      },
    }));

    const edges = [];
    filteredCommits.forEach(commit => {
      if (commit.parents && commit.parents.length > 0) {
        commit.parents.forEach(parentSha => {
          if (filteredCommits.find(c => c.sha === parentSha)) {
            edges.push({
              id: `e${parentSha}-${commit.sha}`,
              source: parentSha,
              target: commit.sha,
              animated: true,
              type: 'smoothstep',
              style: { stroke: getBranchColor(commit.branches), strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: getBranchColor(commit.branches) },
            });
          }
        });
      }
    });

    nodes.forEach(node => {
      // Use branch info if available to influence x position
      const commit = filteredCommits.find(c => c.sha === node.id);
      const branchIndex = commit?.branches ? commit.branches.indexOf('main') : 0;
      dagreGraph.setNode(node.id, { width: 160, height: 50 });
    });
    edges.forEach(edge => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach(node => {
      const nodeWithPosition = dagreGraph.node(node.id);
      // Adjust x based on branch index if available
      const commit = filteredCommits.find(c => c.sha === node.id);
      const xOffset = commit?.branches ? (commit.branches.length > 1 ? 100 : 0) : 0;
      node.position = { x: nodeWithPosition.x - 80 + xOffset, y: nodeWithPosition.y - 25 };
    });

    return { nodes, edges };
  }, [filteredCommits]);

  const onNodeClick = (_, node) => {
    setSelectedCommit(node.data.commit);
  };

  const onNodeMouseEnter = (_, node) => {
    setHoveredCommit(node.data.commit);
    if (onNodeHover) onNodeHover(node.data.commit);
  };

  const onNodeMouseLeave = () => {
    setHoveredCommit(null);
    if (onNodeLeave) onNodeLeave();
  };

  return (
    <div className="h-[600px] w-full bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {contributors && Array.isArray(contributors) && contributors.map(c => (
            <button
              key={c.login}
              onClick={() => toggleAuthor(c.login)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedAuthors.includes(c.login) ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {c.login}
            </button>
          ))}
          {selectedAuthors.length > 0 && (
            <button onClick={() => setSelectedAuthors([])} className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 hover:text-white">
              Clear
            </button>
          )}
        </div>
        
        <div className="bg-slate-800/80 p-2 rounded border border-slate-700 text-xs text-slate-300 flex gap-3">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#10b981]"></span> Feature</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#ef4444]"></span> Fix</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#38bdf8]"></span> Refactor</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#f59e0b]"></span> Other</div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background color="#334155" gap={20} />
        <Controls className="bg-slate-800 border-slate-700" />
        <MiniMap className="bg-slate-800 border-slate-700" />
      </ReactFlow>

      {/* Tooltip */}
      {hoveredCommit && (
        <div className="absolute bottom-4 left-4 z-20 w-64 bg-slate-800 p-3 rounded-lg border border-slate-700 text-white text-xs shadow-xl pointer-events-none">
          <p className="font-bold">{hoveredCommit.message.substring(0, 50)}</p>
          <p className="text-slate-400 mt-1">Author: {hoveredCommit.author}</p>
          <p className="text-slate-400">Date: {new Date(hoveredCommit.date).toLocaleString()}</p>
        </div>
      )}

      {/* Details Panel */}
      {selectedCommit && (
        <div className="absolute top-4 right-4 z-30 w-96 bg-slate-900 p-6 rounded-xl border border-slate-700 text-white shadow-2xl overflow-y-auto max-h-[550px]">
          <h3 className="font-bold text-xl mb-4 text-emerald-400">Commit Details</h3>
          <div className="space-y-3 text-sm">
            <p><span className="text-slate-400">Hash:</span> {selectedCommit.sha}</p>
            <p><span className="text-slate-400">Author:</span> {selectedCommit.author}</p>
            <p><span className="text-slate-400">Date:</span> {new Date(selectedCommit.date).toLocaleString()}</p>
            <p className="text-slate-400 mt-2">Message:</p>
            <p className="bg-slate-800 p-3 rounded">{selectedCommit.message}</p>
            <p className="text-slate-400 mt-2">Files Changed: {selectedCommit.files?.length || 0}</p>
            <p className="text-emerald-400">Additions: {selectedCommit.additions || 0}</p>
            <p className="text-red-400">Deletions: {selectedCommit.deletions || 0}</p>
          </div>
          <button 
            className="mt-6 w-full bg-slate-700 hover:bg-slate-600 p-2 rounded text-sm transition-colors"
            onClick={() => setSelectedCommit(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default CommitGraph;
