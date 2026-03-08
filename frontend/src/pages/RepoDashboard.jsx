import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import RepoHeader from '../components/RepoHeader.jsx';
import StatsGrid from '../components/StatsGrid.jsx';
import ContributorGraph from '../components/ContributorGraph.jsx';
import CommitGraph from '../components/CommitGraph.jsx';
import BranchVisualization from '../components/BranchVisualization.jsx';
import ComplexityAnalytics from '../components/ComplexityAnalytics.jsx';
import RepositoryHeatmap from '../components/RepositoryHeatmap.jsx';
import TimeScrubber from '../components/TimeScrubber.jsx';
import FileEvolutionPanel from '../components/FileEvolutionPanel.jsx';
import VisualizationSwitcher from '../components/VisualizationSwitcher.jsx';
import DiffPreview from '../components/DiffPreview.jsx';
import HoverInsightPanel from '../components/HoverInsightPanel.jsx';
import AnalyticsTabs from '../components/AnalyticsTabs.jsx';

const RepoDashboard = () => {
  const [searchParams] = useSearchParams();
  const repoUrl = searchParams.get('url');
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [activeViz, setActiveViz] = useState('overview');
  const [timeRange, setTimeRange] = useState(null);
  const [diffInfo, setDiffInfo] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);

  const handleContributorHover = useCallback((data) => {
    setHoveredData(data ? { type: 'timeline', ...data } : null);
  }, []);

  const handleContributorLeave = useCallback(() => {
    setHoveredData(null);
  }, []);

  const handleCommitHover = useCallback((data) => {
    setHoveredData(data ? { type: 'commit', ...data } : null);
  }, []);

  const handleCommitLeave = useCallback(() => {
    setHoveredData(null);
  }, []);

  const handleHeatmapHover = useCallback((data) => {
    setHoveredData(data ? { type: 'heatmap', ...data } : null);
  }, []);

  const handleHeatmapLeave = useCallback(() => {
    setHoveredData(null);
  }, []);

  // Filtered data based on time scrubber
  const filteredData = useMemo(() => {
    if (!repoData || !timeRange) return repoData;

    const { start, end } = timeRange;
    
    const filteredTimeline = repoData.commitHistory.filter(c => {
      const date = new Date(c.date);
      return date >= start && date <= end;
    });

    // Compute trends and activity from filtered timeline
    const trend = {};
    const activity = {};
    
    filteredTimeline.forEach(c => {
      const date = c.date;
      if (!trend[date]) trend[date] = { date, additions: 0, deletions: 0, filesChanged: 0, commits: 0 };
      trend[date].additions += (c.additions || 0);
      trend[date].deletions += (c.deletions || 0);
      trend[date].filesChanged += (c.files?.length || 0);
      trend[date].commits += 1;

      if (c.files) {
        c.files.forEach(f => {
          activity[f.path] = (activity[f.path] || 0) + 1;
        });
      }
    });

    const filteredComplexityTrend = Object.values(trend).sort((a, b) => new Date(a.date) - new Date(b.date));
    const filteredFileActivity = Object.entries(activity)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    
    return {
      ...repoData,
      timeline: filteredTimeline,
      complexityTrend: filteredComplexityTrend,
      fileActivity: filteredFileActivity
    };
  }, [repoData, timeRange]);

  useEffect(() => {
    if (!repoUrl) {
      setError('No repository URL provided');
      setLoading(false);
      return;
    }

    const eventSource = new EventSource(`/api/analyze-stream?repoUrl=${encodeURIComponent(repoUrl)}`);

    eventSource.addEventListener('status', (e) => {
      setStatus(JSON.parse(e.data).message);
    });

    eventSource.addEventListener('metadata', (e) => {
      const metadata = JSON.parse(e.data);
      setRepoData(prev => ({ ...prev, ...metadata }));
    });

    eventSource.addEventListener('commit', (e) => {
      const commit = JSON.parse(e.data);
      setRepoData(prev => {
        const newHistory = [...(prev.commitHistory || []), commit];
        
        // Update analytics incrementally
        const totalAdditions = newHistory.reduce((sum, c) => sum + (c.additions || 0), 0);
        const totalDeletions = newHistory.reduce((sum, c) => sum + (c.deletions || 0), 0);
        
        // Update file activity
        const newFileActivity = { ...(prev.fileActivity || {}) };
        if (commit.files) {
          commit.files.forEach(f => {
            newFileActivity[f.path] = (newFileActivity[f.path] || 0) + 1;
          });
        }

        // Update complexity trend
        const newTrend = { ...(prev.complexityTrend || {}) };
        const date = commit.date;
        if (!newTrend[date]) newTrend[date] = { date, additions: 0, deletions: 0, filesChanged: 0, commits: 0 };
        newTrend[date].additions += (commit.additions || 0);
        newTrend[date].deletions += (commit.deletions || 0);
        newTrend[date].filesChanged += (commit.files?.length || 0);
        newTrend[date].commits += 1;

        return {
          ...prev,
          commitHistory: newHistory,
          fileActivity: newFileActivity,
          complexityTrend: Object.values(newTrend).sort((a, b) => new Date(a.date) - new Date(b.date)),
          analytics: {
            commits: newHistory.length,
            contributors: new Set(newHistory.map(c => c.author)).size,
            churnRate: newHistory.length > 0 ? ((totalAdditions + totalDeletions) / (newHistory.length * 100)).toFixed(1) : 0,
            refactors: newHistory.filter(c => c.message.toLowerCase().includes('refactor')).length
          }
        };
      });
    });

    eventSource.addEventListener('done', () => {
      setLoading(false);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      setError(JSON.parse(e.data).message || 'Failed to analyze repository');
      setLoading(false);
      eventSource.close();
    });

    return () => eventSource.close();
  }, [repoUrl]);

  const handleNodeHover = async (commit) => {
    try {
      const response = await fetch(`/api/diff?sha=${commit.sha}`);
      const diff = await response.json();
      setDiffInfo(diff);
    } catch (error) {
      console.error('Failed to fetch diff:', error);
    }
  };

  const handleNodeLeave = () => {
    setDiffInfo(null);
  };

  if (loading && !repoData?.name) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>{status}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-card">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'} className="retry-btn">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardNavbar repoName={repoData?.name} />
      <main className="dashboard-content">
        <RepoHeader repoData={repoData} />
        
        <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'analytics' && (
          <div className="tab-content fade-in">
            <div className="mb-8">
              {filteredData?.analytics ? (
                <StatsGrid data={filteredData.analytics} />
              ) : (
                <div className="analytics-grid">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="analytics-card animate-pulse" style={{ height: '200px', background: '#0f172a' }}></div>
                  ))}
                </div>
              )}
            </div>

            <VisualizationSwitcher activeView={activeViz} onViewChange={setActiveViz} />

            <div className="mb-8">
              <TimeScrubber 
                timeline={repoData?.commitHistory || []} 
                onRangeChange={setTimeRange} 
              />
            </div>

            {activeViz === 'overview' && (
              <div className="fade-in">
                <p className="text-slate-400">Select a visualization from the switcher above.</p>
              </div>
            )}

            {activeViz === 'contributors' && (
              <div className="fade-in">
                <ContributorGraph 
                  timeline={filteredData?.commitHistory || []} 
                  contributors={filteredData?.contributors || []}
                  onHover={handleContributorHover}
                  onLeave={handleContributorLeave}
                />
              </div>
            )}

            {activeViz === 'commit-graph' && (
              <div className="fade-in">
                <CommitGraph 
                  commits={filteredData?.commitHistory || []} 
                  contributors={filteredData?.contributors || []}
                  onNodeHover={handleCommitHover}
                  onNodeLeave={handleCommitLeave}
                />
              </div>
            )}

            {activeViz === 'complexity' && (
              <div className="fade-in">
                <ComplexityAnalytics 
                  fileActivity={filteredData?.fileActivity || []} 
                  complexityTrend={filteredData?.complexityTrend || []}
                  onFileClick={(path) => setActiveViz('evolution')}
                />
              </div>
            )}

            {activeViz === 'heatmap' && (
              <div className="fade-in">
                <RepositoryHeatmap 
                  fileActivity={filteredData?.fileActivity || []} 
                  timeline={filteredData?.commitHistory || []} 
                  onCellHover={handleHeatmapHover}
                  onCellLeave={handleHeatmapLeave}
                />
              </div>
            )}

            {activeViz === 'evolution' && (
              <div className="fade-in">
                <FileEvolutionPanel 
                  commitHistory={filteredData?.commitHistory || []}
                  fileActivity={filteredData?.fileActivity || []}
                />
              </div>
            )}

            {activeViz === 'branches' && (
              <div className="fade-in">
                <BranchVisualization commits={filteredData?.commitHistory || []} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="tab-content fade-in placeholder-view">
            <div className="empty-state">
              <h3>Project Preview</h3>
              <p>Coming soon: Interactive project structure visualization.</p>
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="tab-content fade-in placeholder-view">
            <div className="empty-state">
              <h3>Repository Assistant</h3>
              <p>Coming soon: AI-powered codebase exploration and chat.</p>
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="tab-content fade-in placeholder-view">
            <div className="empty-state">
              <h3>Directory Explorer</h3>
              <p>Coming soon: Deep dive into your repository's file structure.</p>
            </div>
          </div>
        )}
      </main>

      <DiffPreview diff={diffInfo} />
      <HoverInsightPanel data={hoveredData} />
    </div>
  );
};

export default RepoDashboard;
