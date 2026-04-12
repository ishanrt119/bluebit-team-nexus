import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { RepoInput } from './components/RepoInput';
import { Charts } from './components/Charts';
import { CinematicOverlay } from './components/CinematicOverlay';
import { RepoData, Commit, cn } from './lib/utils';
import { generateRepoNarrative, generateProjectSummary, RepoNarrative } from './services/ai';
import { detectProjectType } from './lib/detector';
import { ProjectPreview } from './components/ProjectPreview';
import { RepositoryAssistant } from './components/RepositoryAssistant';
import { getMetricInsight, MetricType } from './lib/insights';
import {
  GitCommit,
  Users,
  Activity,
  AlertCircle,
  Play,
  ChevronRight,
  FileCode,
  TrendingUp,
  ArrowLeft,
  Info,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { CodeBackground } from './components/CodeBackground';
import { AnimatedCinematized } from './components/AnimatedCinematized';
import { DirectoryExplorer } from './components/DirectoryExplorer';
import { CodeViewer } from './components/CodeViewer';
import { CommitGraph } from './components/CommitGraph';
import { ForceGraph } from './components/ForceGraph';
import { EvolutionHeatmap } from './components/EvolutionHeatmap';
import { CinematicTimeline } from './components/CinematicTimeline';
import { FilterPanel } from './components/FilterPanel';
import { DiffViewer } from './components/DiffViewer';
import { BlameViewer } from './components/BlameViewer';
import { BranchTree } from './components/BranchTree';
import { ContributorNetwork } from './components/ContributorNetwork';
import { CodeHealthDashboard } from './components/CodeHealthDashboard';
import { TopBar } from './components/TopBar';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [narrative, setNarrative] = useState<RepoNarrative | null>(null);
  const [isCinematicMode, setIsCinematicMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'timeline' | 'heatmap' | 'graph' | 'branches' | 'preview' | 'assistant' | 'explorer' | 'contributors' | 'health'>('analytics');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [error, setError] = useState<string | null>(null);


  // Filter State
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);

  // Details State
  const [viewMode, setViewMode] = useState<'details' | 'diff' | 'blame'>('details');
  const [diffPatch, setDiffPatch] = useState<string | null>(null);


  const navigate = useNavigate();
  const location = useLocation();

  const handleCommitClick = (commit: Commit) => {
    setSelectedCommit(commit);
    setViewMode('details');
  };

}

{
  activeTab === 'heatmap' && (
    <EvolutionHeatmap
      repoData={{ ...repoData, commits: filteredCommits }}
      onFileClick={handleFileClick}
    />
  )
}

{
  activeTab === 'graph' && (
    <ForceGraph commits={filteredCommits} onNodeClick={handleCommitClick} />
  )
}

{
  activeTab === 'branches' && (
    <BranchTree
      repoId={`${repoData.owner}/${repoData.repoName}`}
      onCommitClick={handleCommitClick}
    />
  )
}

{
  activeTab === 'contributors' && (
    <ContributorNetwork repoData={repoData} />
  )
}

{
  activeTab === 'health' && (
    <CodeHealthDashboard repoData={repoData} />
  )
}

{
  activeTab === 'preview' && (
    <ProjectPreview repoData={repoData} />
  )
}

{
  activeTab === 'assistant' && (
    <RepositoryAssistant repoData={repoData} />
  )
}

{
  activeTab === 'explorer' && (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
      <div className="lg:col-span-1 h-full">
        <DirectoryExplorer
          files={repoData.files || []}
          onFileSelect={(path) => {
            setSelectedFilePath(path);
            if (selectedCommit) {
              fetchDiff(selectedCommit.sha, path);
            }
          }}
          selectedPath={selectedFilePath || undefined}
        />
      </div>
      <div className="lg:col-span-3 h-full">
        {selectedFilePath ? (
          <CodeViewer
            repoId={`${repoData.owner}/${repoData.repoName}`}
            path={selectedFilePath}
            onClose={() => setSelectedFilePath(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-zinc-900/30 border border-zinc-800 rounded-xl border-dashed opacity-50">
            <FileCode className="w-12 h-12 mb-4 text-zinc-700" />
            <p className="text-sm">Select a file from the explorer to view its content and analysis.</p>
          </div>
        )}
      </div>
    </div>
  )
}
                </div >

  {/* Right Sidebar: Details on Demand */ }
  <AnimatePresence>
{
  selectedCommit && (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl z-30"
    >
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <GitCommit className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Commit Details</h3>
            <p className="text-[10px] font-mono text-zinc-500">{selectedCommit.sha.substring(0, 12)}</p>
          </div>
        </div>
        <button
          onClick={() => setSelectedCommit(null)}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      <div className="flex border-b border-zinc-800">
        {[
          { id: 'details', label: 'Overview' },
          { id: 'diff', label: 'Diff' },
          { id: 'blame', label: 'Blame' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id as any)}
            className={cn(
              "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
              viewMode === mode.id
                ? "text-emerald-500 border-emerald-500 bg-emerald-500/5"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'details' && (
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <p className="text-lg font-medium leading-tight text-zinc-100">{selectedCommit.message}</p>
              <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                {selectedCommit.authorAvatar ? (
                  <img
                    src={selectedCommit.authorAvatar}
                    className="w-10 h-10 rounded-full border border-zinc-800"
                    alt={selectedCommit.author}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                    <Users className="w-5 h-5 text-zinc-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-zinc-200">{selectedCommit.author}</p>
                  <p className="text-xs text-zinc-500">{new Date(selectedCommit.date).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Files Changed</p>
                <p className="text-2xl font-bold text-blue-500">{selectedCommit.filesChanged}</p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sentiment</p>
                <p className={cn(
                  "text-lg font-bold capitalize",
                  selectedCommit.sentiment === 'positive' ? "text-emerald-500" :
                    selectedCommit.sentiment === 'negative' ? "text-red-500" : "text-zinc-500"
                )}>{selectedCommit.sentiment}</p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-emerald-500">Insertions</p>
                <p className="text-xl font-bold text-emerald-500">+{selectedCommit.insertions}</p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-red-500">Deletions</p>
                <p className="text-xl font-bold text-red-500">-{selectedCommit.deletions}</p>
              </div>
            </div>

            {
              selectedCommit.parentShas && selectedCommit.parentShas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Parent Commits</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCommit.parentShas.map(sha => (
                      <code key={sha} className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-500 font-mono">
                        {sha.substring(0, 12)}
                      </code>
                    ))}
                  </div>
                </div>
              )
            }

            < div className="space-y-4" >
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Modified Files</h4>
              <div className="space-y-2">
                {selectedCommit.modifiedFiles?.map(file => (
                  <button
                    key={file}
                    onClick={() => {
                      setSelectedFilePath(file);
                      fetchDiff(selectedCommit.sha, file);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg text-xs font-mono transition-all flex items-center justify-between group",
                      selectedFilePath === file ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    <span className="truncate">{file}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            <a
              href={`https://github.com/${repoData.owner}/${repoData.repoName}/commit/${selectedCommit.sha}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all group"
            >
              View on GitHub
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
          </div>
        )}

        {viewMode === 'diff' && (
          <div className="h-full">
            {diffPatch ? (
              <DiffViewer
                filename={selectedFilePath || 'unknown'}
                patch={diffPatch}
                onClose={() => setDiffPatch(null)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 p-8 text-center">
                <FileCode className="w-12 h-12 opacity-20" />
                <p className="text-sm">Select a file from the details tab to view the diff for this commit.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'blame' && (
          <div className="h-full">
            {selectedFilePath ? (
              <BlameViewer
                repoId={`${repoData.owner}/${repoData.repoName}`}
                path={selectedFilePath}
                onClose={() => { }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 p-8 text-center">
                <Users className="w-12 h-12 opacity-20" />
                <p className="text-sm">Select a file to see its authorship history across all commits.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div >
  )
}
                </AnimatePresence >
              </div >
            ) : null
          } />
        </Routes >
      </main >

  {/* Overlays & Panels */ }
  <AnimatePresence>
{
  isCinematicMode && narrative && (
    <CinematicOverlay
      narrative={narrative}
      onClose={() => setIsCinematicMode(false)}
    />
  )
}

{/* Details Panel (Old Version Removed, integrated into main dashboard layout) */ }
      </AnimatePresence >
    </div >
  );
}

function StatCard({ icon, label, value, numericValue, type }: { icon: React.ReactNode, label: string, value: string, numericValue: number, type: MetricType }) {
  const [showInfo, setShowInfo] = useState(false);
  const insight = getMetricInsight(type, numericValue);

  const explanations: Record<MetricType, string> = {
    commits: "The total number of times code was saved to the project. Think of it as 'saves' in a document.",
    contributors: "The number of unique people who have written code for this project.",
    churn: "How often code is being rewritten or deleted. High churn might mean a lot of changes or 're-doing' work.",
    refactors: "Cleaning up and improving the existing code without changing what it does. Like tidying up a room."
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between relative group/card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
            {icon}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
              insight.bgColor,
              insight.borderColor,
              insight.textColor
            )}>
              {insight.status}
            </div>
            <button
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              className="p-1 text-zinc-500 hover:text-emerald-500 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-sm text-zinc-400 font-medium">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-14 right-6 left-6 z-20 p-4 bg-zinc-950 border border-emerald-500/20 rounded-xl shadow-2xl backdrop-blur-md"
            >
              <p className="text-xs text-zinc-300 leading-relaxed">
                {explanations[type]}
              </p>
              <div className="absolute -top-1.5 right-2 w-3 h-3 bg-zinc-950 border-t border-l border-emerald-500/20 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-[11px] text-zinc-500 leading-relaxed mt-2 border-t border-zinc-800/50 pt-3">
        {insight.explanation}
      </p>
    </div>
  );
}
