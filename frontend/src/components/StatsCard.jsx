import React from 'react';
import { Star, GitFork, AlertCircle, Clock } from 'lucide-react';

const StatsCards = ({ repoData }) => {
  if (!repoData) return null;

  const stats = [
    {
      label: 'Stars',
      value: repoData.stars,
      icon: <Star size={24} className="stat-icon star" />,
      delay: '0.1s'
    },
    {
      label: 'Forks',
      value: repoData.forks,
      icon: <GitFork size={24} className="stat-icon fork" />,
      delay: '0.2s'
    },
    {
      label: 'Open Issues',
      value: repoData.openIssues,
      icon: <AlertCircle size={24} className="stat-icon issue" />,
      delay: '0.3s'
    },
    {
      label: 'Last Updated',
      value: new Date(repoData.updated_at).toLocaleDateString(),
      icon: <Clock size={24} className="stat-icon clock" />,
      delay: '0.4s'
    }
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className="stat-card animate-slide-up" 
          style={{ animationDelay: stat.delay }}
        >
          <div className="stat-header">
            {stat.icon}
            <span className="stat-label">{stat.label}</span>
          </div>
          <div className="stat-value">{stat.value.toLocaleString()}</div>
          <div className="stat-glow"></div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
