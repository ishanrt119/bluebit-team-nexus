import React from 'react';
import { GitCommit, Users, Activity, AlertTriangle } from 'lucide-react';
import StatsCard from './StatsCard.jsx';

const StatsGrid = ({ data }) => {
  const stats = [
    {
      icon: GitCommit,
      title: 'Total Commits',
      value: data.commits,
      badge: 'JUST STARTING OUT',
      badgeType: 'blue',
      description: 'This project is brand new and just getting its first few pieces of code.',
      delay: 100
    },
    {
      icon: Users,
      title: 'Contributors',
      value: data.contributors,
      badge: 'SMALL GROUP',
      badgeType: 'green',
      description: 'A few friends or teammates are working on this together.',
      delay: 200
    },
    {
      icon: Activity,
      title: 'Churn Rate',
      value: `${data.churnRate}%`,
      badge: 'CHANGING VERY FAST',
      badgeType: 'red',
      description: 'The code is being rewritten a lot, which might mean big changes are happening.',
      delay: 300
    },
    {
      icon: AlertTriangle,
      title: 'Refactors',
      value: data.refactors,
      badge: 'NO BIG CLEANUPS',
      badgeType: 'gray',
      description: 'The code structure has stayed the same since it started.',
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