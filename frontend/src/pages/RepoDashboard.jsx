import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import RepoHeader from '../components/RepoHeader.jsx';
import AnalyticsTabs from '../components/AnalyticsTabs.jsx';
import StatsGrid from '../components/StatsGrid.jsx';

const RepoDashboard = () => {
  const [searchParams] = useSearchParams();
  const repoUrl = searchParams.get('url');
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');

  // Mock analytics data
  const mockAnalytics = {
    commits: 13,
    contributors: 2,
    churnRate: 98.8,
    refactors: 0
  };

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
        
        <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === 'analytics' && (
          <div className="tab-content fade-in">
            <StatsGrid data={mockAnalytics} />
          </div>
        )}

        {activeTab !== 'analytics' && (
          <div className="tab-content placeholder-view">
            <div className="empty-state">
              <h3>{activeTab.replace('-', ' ')} View</h3>
              <p>This section is currently under development.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RepoDashboard;
