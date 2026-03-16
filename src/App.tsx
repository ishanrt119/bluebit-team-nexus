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
  Terminal,
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

  const handleFileClick = (path: string) => {
    if (!repoData) return;
    // Find the latest commit that modified this file
    const latestCommit = repoData.commits.find(c => c.modifiedFiles?.includes(path));
    if (latestCommit) {
      setSelectedCommit(latestCommit);
      setSelectedFilePath(path);
      setViewMode('details');
    } else {
      // Fallback: just open the explorer if no commit found
      setSelectedFilePath(path);
      setActiveTab('explorer');
    }
  };

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setActiveTab('analytics');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const detected = detectProjectType(result.data);
      const previewSummary = await generateProjectSummary(result.data);

      const enrichedData = {
        ...result.data,
        preview: {
          ...detected,
          ...previewSummary
        }
      };

      setRepoData(enrichedData);

      if (!result.narrative) {
        const story = await generateRepoNarrative(enrichedData);
        setNarrative(story);

        await fetch('/api/save-narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoId: `${result.data.owner}/${result.data.repoName}`,
            narrative: story
          }),
        });
      } else {
        setNarrative(result.narrative);
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze repository. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRepoData(null);
    setNarrative(null);
    setIsCinematicMode(false);
    setActiveTab('analytics');
    setSelectedFilePath(null);
    setSelectedCommit(null);
    setSelectedAuthors([]);
    setSelectedFileTypes([]);
    setSearchQuery('');
    setTimeRange([0, 100]);
    navigate('/');
  };

  // Computed Filtered Data
  const filteredCommits = useMemo(() => {
    if (!repoData) return [];

    return repoData.commits.filter((commit, index) => {
      // Author Filter
      if (selectedAuthors.length > 0 && !selectedAuthors.includes(commit.author)) return false;

      // Keyword Filter
      if (searchQuery && !commit.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // File Type Filter
      if (selectedFileTypes.length > 0) {
        const hasFileType = commit.modifiedFiles?.some(file => {
          const ext = '.' + file.split('.').pop();
          return selectedFileTypes.includes(ext);
        });
        if (!hasFileType) return false;
      }

      // Time Range Filter (by index for simplicity in this demo)
      // Note: Commits are usually sorted newest to oldest, so index 0 is 100% time
      const progress = (index / repoData.commits.length) * 100;
      const timeProgress = 100 - progress;
      if (timeProgress < timeRange[0] || timeProgress > timeRange[1]) return false;

      return true;
    });
  }, [repoData, selectedAuthors, selectedFileTypes, searchQuery, timeRange]);

  const authorsList = useMemo(() => {
    if (!repoData) return [];
    const counts: Record<string, number> = {};
    repoData.commits.forEach(c => {
      counts[c.author] = (counts[c.author] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [repoData]);

  const availableFileTypes = useMemo(() => {
    if (!repoData) return [];
    const exts = new Set<string>();
    repoData.files?.forEach(file => {
      const parts = file.split('.');
      if (parts.length > 1) exts.add('.' + parts.pop());
    });
    return Array.from(exts).sort();
  }, [repoData]);

  const fetchDiff = async (sha: string, path: string) => {
    try {
      const repoId = `${repoData?.owner}/${repoData?.repoName}`;
      const res = await fetch(`/api/repo/diff?repoId=${encodeURIComponent(repoId)}&sha=${encodeURIComponent(sha)}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setDiffPatch(data.patch);
      setViewMode('diff');
    } catch (e) {
      console.error(e);
    }
  };

  // Redirect if no data on dashboard
  useEffect(() => {
    if (location.pathname === '/dashboard' && !repoData) {
      navigate('/');
    }
  }, [location.pathname, repoData, navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <nav className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-zinc-950/50 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">GitInsight AI</span>
          </div>

          {repoData && location.pathname === '/dashboard' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-emerald-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Analyze New Repository
            </button>
          )}
        </div>

        {repoData && location.pathname === '/dashboard' && (
          <button
            onClick={() => setIsCinematicMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-sm font-medium transition-all"
          >
            <Play className="w-4 h-4 text-emerald-500" />
            Play Cinematic Story
          </button>
        )}
      </nav>

      <main className={cn(
        "mx-auto transition-all duration-500",
        location.pathname === '/dashboard' ? "max-w-full px-0 py-0" : "max-w-7xl px-6 py-12"
      )}>
        <Routes>
          <Route path="/" element={
            <div className="py-20 relative">
              <CodeBackground />
              <div className="text-center mb-12 space-y-4 relative z-10">
                <div className="min-h-[120px] md:min-h-[160px] flex flex-col justify-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-bold tracking-tighter"
                  >
                    Your Code, <AnimatedCinematized />
                  </motion.h1>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-zinc-400 text-lg max-w-2xl mx-auto"
                >
                  Transform raw Git history into a compelling narrative. Analyze churn, sentiment, and major events with AI.
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative z-10 space-y-4"
              >
                <RepoInput onAnalyze={handleAnalyze} isLoading={isLoading} />
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm animate-in fade-in slide-in-from-top-2 max-w-xl mx-auto">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}
              </motion.div>
            </div>
          } />

          <Route path="/dashboard" element={
            repoData ? (
              <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Left Sidebar: Filters */}
                <FilterPanel
                  authors={authorsList}
                  fileTypes={availableFileTypes}
                  selectedAuthors={selectedAuthors}
                  selectedFileTypes={selectedFileTypes}
                  searchQuery={searchQuery}
                  timeRange={timeRange}
                  maxTime={100}
                  onAuthorToggle={(author) => {
                    setSelectedAuthors(prev =>
                      prev.includes(author) ? prev.filter(a => a !== author) : [...prev, author]
                    );
                  }}
                  onFileTypeToggle={(ext) => {
                    setSelectedFileTypes(prev =>
                      prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]
                    );
                  }}
                  onSearchChange={setSearchQuery}
                  onTimeRangeChange={setTimeRange}
                  onReset={() => {
                    setSelectedAuthors([]);
                    setSelectedFileTypes([]);
                    setSearchQuery('');
                    setTimeRange([0, 100]);
                  }}
                />

                {/* Center: Visualizations */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit overflow-x-auto max-w-full">
                    {[
                      { id: 'analytics', label: 'Analytics' },
                      { id: 'timeline', label: 'Timeline' },
                      { id: 'heatmap', label: 'Heatmap' },
                      { id: 'graph', label: 'Network' },
                      { id: 'branches', label: 'Branches' },
                      { id: 'contributors', label: 'Contributors' },
                      { id: 'health', label: 'Health' },
                      { id: 'preview', label: 'Preview' },
                      { id: 'assistant', label: 'Assistant' },
                      { id: 'explorer', label: 'Explorer' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                          activeTab === tab.id ? "bg-emerald-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'analytics' && (
                    <div className="space-y-8">
                      {/* Hero Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                          icon={<GitCommit className="w-5 h-5 text-blue-500" />}
                          label="Total Commits"
                          value={repoData.totalCommits.toString()}
                          numericValue={repoData.totalCommits}
                          type="commits"
                        />
                        <StatCard
                          icon={<Users className="w-5 h-5 text-purple-500" />}
                          label="Contributors"
                          value={repoData.contributors.length.toString()}
                          numericValue={repoData.contributors.length}
                          type="contributors"
                        />
                        <StatCard
                          icon={<Activity className="w-5 h-5 text-emerald-500" />}
                          label="Churn Rate"
                          value={`${repoData.metrics.churnRate.toFixed(1)}%`}
                          numericValue={repoData.metrics.churnRate}
                          type="churn"
                        />
                        <StatCard
                          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
                          label="Refactors"
                          value={repoData.metrics.refactorCount.toString()}
                          numericValue={repoData.metrics.refactorCount}
                          type="refactors"
                        />
                      </div>

                      {/* Main Content Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Narrative Panel */}
                        <div className="lg:col-span-1 space-y-6">
                          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-xl font-bold">The Narrative</h2>
                              <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase rounded tracking-widest">AI Generated</div>
                            </div>

                            {narrative ? (
                              <div className="space-y-6">
                                <p className="text-zinc-400 leading-relaxed italic font-serif text-lg">
                                  "{narrative.introduction}"
                                </p>

                                <div className="space-y-4">
                                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Key Turning Points
                                  </h3>
                                  <ul className="space-y-3">
                                    {narrative.turningPoints.map((point, i) => (
                                      <li key={i} className="flex gap-3 text-sm text-zinc-300">
                                        <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        {point}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : (
                              <div className="h-40 flex items-center justify-center">
                                <div className="animate-pulse text-zinc-600">Generating story...</div>
                              </div>
                            )}
                          </div>

                          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                              <FileCode className="w-4 h-4" />
                              Major Challenges
                            </h3>
                            <div className="space-y-4">
                              {narrative?.challenges.map((challenge, i) => (
                                <div key={i} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300">
                                  {challenge}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Visualization Panel */}
                        <div className="lg:col-span-2 space-y-8">
                          <Charts commits={filteredCommits} contributors={repoData.contributors} />

                          <CommitGraph
                            commits={filteredCommits}
                            onCommitClick={handleCommitClick}
                          />

                          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                              <h3 className="font-bold">Filtered Commit History</h3>
                              <span className="text-xs text-zinc-500 font-mono">{filteredCommits.length} COMMITS FOUND</span>
                            </div>
                            <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                              {filteredCommits.map((commit) => (
                                <div
                                  key={commit.sha}
                                  onClick={() => handleCommitClick(commit)}
                                  className={cn(
                                    "p-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between group cursor-pointer",
                                    selectedCommit?.sha === commit.sha && "bg-emerald-500/5 border-l-2 border-emerald-500"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      commit.sentiment === 'positive' ? "bg-emerald-500" :
                                        commit.sentiment === 'negative' ? "bg-red-500" : "bg-zinc-600"
                                    )} />
                                    <div>
                                      <p className="text-sm font-medium text-zinc-200 line-clamp-1">{commit.message}</p>
                                      <p className="text-xs text-zinc-500">{commit.author} • {new Date(commit.date).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <code className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                    {commit.sha.substring(0, 7)}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <CinematicTimeline commits={filteredCommits} />
                  )}

                  {activeTab === 'heatmap' && (
                    <EvolutionHeatmap
                      repoData={{ ...repoData, commits: filteredCommits }}
                      onFileClick={handleFileClick}
                    />
                  )}

                  {activeTab === 'graph' && (
                    <ForceGraph commits={filteredCommits} onNodeClick={handleCommitClick} />
                  )}

                  {activeTab === 'branches' && (
                    <BranchTree
                      repoId={`${repoData.owner}/${repoData.repoName}`}
                      onCommitClick={handleCommitClick}
                    />
                  )}

                  {activeTab === 'contributors' && (
                    <ContributorNetwork repoData={repoData} />
                  )}

                  {activeTab === 'health' && (
                    <CodeHealthDashboard repoData={repoData} />
                  )}

                  {activeTab === 'preview' && (
                    <ProjectPreview repoData={repoData} />
                  )}

                  {activeTab === 'assistant' && (
                    <RepositoryAssistant repoData={repoData} />
                  )}

                  {activeTab === 'explorer' && (
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
                  )}
                </div>

                {/* Right Sidebar: Details on Demand */}
                <AnimatePresence>
                  {selectedCommit && (
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

      {/* Overlays & Panels */}
      <AnimatePresence>
        {
          isCinematicMode && narrative && (
            <CinematicOverlay
              narrative={narrative}
              onClose={() => setIsCinematicMode(false)}
            />
          )
        }

        {/* Details Panel (Old Version Removed, integrated into main dashboard layout) */}
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
