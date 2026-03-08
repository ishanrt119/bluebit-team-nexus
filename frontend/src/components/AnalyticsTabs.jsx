import React from 'react';

const AnalyticsTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'preview', label: 'Project Preview' },
    { id: 'assistant', label: 'Repository Assistant' },
    { id: 'explorer', label: 'Directory Explorer' }
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