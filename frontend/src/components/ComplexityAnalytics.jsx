import React, { useMemo } from 'react';
import { Activity, Zap, FileCode, TrendingUp, BarChart3 } from 'lucide-react';
import ComplexityTrendChart from './charts/ComplexityTrendChart';
import ComplexityHotspotsChart from './charts/ComplexityHotspotsChart';

const ComplexityAnalytics = ({ fileActivity, complexityTrend, onFileClick }) => {
  console.log('ComplexityAnalytics props:', { fileActivity, complexityTrend });
  const stats = useMemo(() => {
    if (!complexityTrend || complexityTrend.length === 0) return { totalAdditions: 0, totalDeletions: 0, avgFiles: 0 };
    
    const totalAdditions = complexityTrend.reduce((sum, d) => sum + d.additions, 0);
    const totalDeletions = complexityTrend.reduce((sum, d) => sum + d.deletions, 0);
    const avgFiles = (complexityTrend.reduce((sum, d) => sum + d.filesChanged, 0) / complexityTrend.length).toFixed(1);
    
    return { totalAdditions, totalDeletions, avgFiles };
  }, [complexityTrend]);

  return (
    <div className="complexity-analytics-container fade-in">
      {/* Stats Overview */}
      <div className="analytics-grid mb-8">
        <div className="analytics-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <Zap className="card-icon" />
            </div>
            <span className="status-badge badge-green">Active</span>
          </div>
          <h3 className="card-title">Total Additions</h3>
          <p className="card-value">+{stats.totalAdditions.toLocaleString()}</p>
          <p className="card-description">Lines of code added to the repository</p>
          <div className="card-glow"></div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <Activity className="card-icon" />
            </div>
            <span className="status-badge badge-red">Churn</span>
          </div>
          <h3 className="card-title">Total Deletions</h3>
          <p className="card-value">-{stats.totalDeletions.toLocaleString()}</p>
          <p className="card-description">Lines of code removed from the repository</p>
          <div className="card-glow"></div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <FileCode className="card-icon" />
            </div>
            <span className="status-badge badge-blue">Files</span>
          </div>
          <h3 className="card-title">Avg Files/Commit</h3>
          <p className="card-value">{stats.avgFiles}</p>
          <p className="card-description">Average number of files modified per commit</p>
          <div className="card-glow"></div>
        </div>

        <div className="analytics-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <TrendingUp className="card-icon" />
            </div>
            <span className="status-badge badge-gray">Trend</span>
          </div>
          <h3 className="card-title">Net Growth</h3>
          <p className="card-value">{(stats.totalAdditions - stats.totalDeletions).toLocaleString()}</p>
          <p className="card-description">Overall increase in repository size</p>
          <div className="card-glow"></div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Complexity Trend */}
        <div className="chart-card large min-h-[350px]">
          <div className="chart-header">
            <BarChart3 className="chart-icon" />
            <div>
              <h4>Complexity Evolution</h4>
              <p>Lines added vs removed over time</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <ComplexityTrendChart data={complexityTrend} />
          </div>
        </div>

        {/* Hotspots */}
        <div className="chart-card min-h-[350px]">
          <div className="chart-header">
            <Activity className="chart-icon" />
            <div>
              <h4>Complexity Hotspots</h4>
              <p>Most frequently modified files</p>
            </div>
          </div>
          <div className="chart-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <ComplexityHotspotsChart data={fileActivity} onFileClick={onFileClick} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplexityAnalytics;
