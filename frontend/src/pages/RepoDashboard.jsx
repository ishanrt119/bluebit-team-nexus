import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import RepoHeader from '../components/RepoHeader.jsx';
import AnalyticsTabs from '../components/AnalyticsTabs.jsx';
import StatsGrid from '../components/StatsGrid.jsx';
import ContributorGraph from '../components/ContributorGraph.jsx';
import ComplexityAnalytics from '../components/ComplexityAnalytics.jsx';
import RepositoryHeatmap from '../components/RepositoryHeatmap.jsx';
import TimeScrubber from '../components/TimeScrubber.jsx';

const RepoDashboard = () => {
  const [searchParams] = useSearchParams();
  const repoUrl = searchParams.get('url');
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [timeRange, setTimeRange] = useState(null);

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
    const fetchRepoData = async () => {
      if (!repoUrl) {
        setError('No repository URL provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl }),
        });

        const result = await response.json();
        if (result.status === 'success') {
          setRepoData(result.data);
        } else {
          setError(result.message || 'Failed to fetch repository data');
        }
      } catch (err) {
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [repoUrl]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>Analyzing repository metadata...</p>
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
        
        <TimeScrubber 
          timeline={repoData?.timeline || []} 
          onRangeChange={setTimeRange} 
        />

        <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === 'analytics' && filteredData?.analytics && (
          <div className="tab-content fade-in">
            <StatsGrid data={filteredData.analytics} />
          </div>
        )}

        {activeTab === 'contributors' && (
          <div className="tab-content fade-in">
            <ContributorGraph 
              timeline={filteredData?.timeline || []} 
              contributors={filteredData?.contributors || []} 
            />
          </div>
        )}

        {activeTab === 'complexity' && (
          <div className="tab-content fade-in">
            <ComplexityAnalytics 
              fileActivity={filteredData?.fileActivity || []} 
              complexityTrend={filteredData?.complexityTrend || []}
              onFileClick={(path) => {
                setActiveTab('heatmap');
                // We'd pass the selected file to heatmap here if needed
              }}
            />
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="tab-content fade-in">
            <RepositoryHeatmap 
              fileActivity={filteredData?.fileActivity || []} 
              timeline={filteredData?.timeline || []} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default RepoDashboard;
