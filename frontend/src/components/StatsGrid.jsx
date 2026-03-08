import React from 'react';
import { GitCommit, Users, Activity, AlertTriangle } from 'lucide-react';
import StatsCard from './StatsCard.jsx';

const StatsGrid = ({ data }) => {
  const getCommitBadge = (val) => {
    if (val > 1000) return { label: 'ESTABLISHED', type: 'green' };
    if (val > 100) return { label: 'GROWING', type: 'blue' };
    return { label: 'JUST STARTING OUT', type: 'gray' };
  };

  const getContributorBadge = (val) => {
    if (val > 50) return { label: 'LARGE COMMUNITY', type: 'green' };
    if (val > 10) return { label: 'TEAM EFFORT', type: 'blue' };
    return { label: 'SMALL GROUP', type: 'gray' };
  };

  const getChurnBadge = (val) => {
    if (val > 50) return { label: 'HIGH VOLATILITY', type: 'red' };
    if (val > 20) return { label: 'STEADY CHANGES', type: 'blue' };
    return { label: 'STABLE', type: 'green' };
  };

  const getRefactorBadge = (val) => {
    if (val > 20) return { label: 'HIGH MAINTENANCE', type: 'blue' };
    if (val > 5) return { label: 'ACTIVE CLEANUP', type: 'green' };
    return { label: 'NO BIG CLEANUPS', type: 'gray' };
  };

  const commitInfo = getCommitBadge(data.commits);
  const contributorInfo = getContributorBadge(data.contributors);
  const churnInfo = getChurnBadge(data.churnRate);
  const refactorInfo = getRefactorBadge(data.refactors);

  const stats = [
    {
      icon: GitCommit,
      title: 'Total Commits',
      value: data.commits,
      badge: commitInfo.label,
      badgeType: commitInfo.type,
      description: data.commits > 100 ? 'A mature project with a significant history of development.' : 'This project is relatively new or has a focused commit history.',
      delay: 100
    },
    {
      icon: Users,
      title: 'Contributors',
      value: data.contributors,
      badge: contributorInfo.label,
      badgeType: contributorInfo.type,
      description: data.contributors > 10 ? 'Many developers are collaborating on this codebase.' : 'A small, tight-knit group is driving this project forward.',
      delay: 200
    },
    {
      icon: Activity,
      title: 'Churn Rate',
      value: `${data.churnRate}%`,
      badge: churnInfo.label,
      badgeType: churnInfo.type,
      description: data.churnRate > 30 ? 'The code is changing rapidly, indicating high development activity.' : 'The codebase is stable with incremental changes over time.',
      delay: 300
    },
    {
      icon: AlertTriangle,
      title: 'Refactors',
      value: data.refactors,
      badge: refactorInfo.label,
      badgeType: refactorInfo.type,
      description: data.refactors > 10 ? 'Frequent architectural improvements and code cleanups.' : 'The code structure has remained consistent with few major refactors.',
      delay: 400
    }
  ];

  return (
    <div className="analytics-grid">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsGrid;
