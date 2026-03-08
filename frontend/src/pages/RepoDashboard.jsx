import React, { useState, useEffect, useMemo } from 'react';
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

    eventSource.addEventListener('history', (e) => {
      const history = JSON.parse(e.data);
      
      // Calculate analytics from history
      let totalAdditions = 0;
      let totalDeletions = 0;
      const activity = {};
      const trend = {};

      history.forEach(c => {
        totalAdditions += (c.additions || 0);
        totalDeletions += (c.deletions || 0);
        
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

      const fileActivity = Object.entries(activity)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      const complexityTrend = Object.values(trend).sort((a, b) => new Date(a.date) - new Date(b.date));

      setRepoData(prev => ({
        ...prev,
        commitHistory: history,
        fileActivity,
        complexityTrend,
        analytics: {
          commits: history.length,
          contributors: new Set(history.map(c => c.author)).size,
          churnRate: history.length > 0 ? ((totalAdditions + totalDeletions) / (history.length * 100)).toFixed(1) : 0,
          refactors: history.filter(c => c.message.toLowerCase().includes('refactor')).length
        }
      }));
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

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
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
    <div className="dashboard-page" onMouseMove={handleMouseMove}>
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
                />
              </div>
            )}

            {activeViz === 'commit-graph' && (
              <div className="fade-in">
                <CommitGraph 
                  commits={filteredData?.commitHistory || []} 
                  contributors={filteredData?.contributors || []}
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

      <DiffPreview diff={diffInfo} position={mousePos} />
    </div>
  );
};

export default RepoDashboard;
