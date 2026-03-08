import React from 'react';

const AnalyticsTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'analytics', label: 'Overview' },
    { id: 'contributors', label: 'Contributors' },
    { id: 'complexity', label: 'Complexity' },
    { id: 'heatmap', label: 'Heatmap' },
  ];

  return (
    <div className="analytics-tabs-container">
      <div className="tabs-pill">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsTabs;
