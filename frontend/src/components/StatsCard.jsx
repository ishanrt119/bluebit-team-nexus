import React, { useState, useEffect } from 'react';

const StatsCard = ({ icon: Icon, title, value, badge, badgeType, description, delay }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) return;
    
    const duration = 1000; // 1 second
    const increment = end / (duration / 16); // 60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = typeof value === 'string' && value.includes('%') 
    ? `${displayValue.toFixed(1)}%` 
    : Math.floor(displayValue).toLocaleString();

  return (
    <div className="analytics-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="card-header">
        <div className="card-icon-wrapper">
          <Icon className="card-icon" />
        </div>
        <span className={`status-badge badge-${badgeType}`}>
          {badge}
        </span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <div className="card-value">{formattedValue}</div>
        <p className="card-description">{description}</p>
      </div>
      <div className="card-glow"></div>
    </div>
  );
};

export default StatsCard;
