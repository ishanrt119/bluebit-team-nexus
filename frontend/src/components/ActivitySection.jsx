import React from 'react';

const ActivitySection = () => {
  return (
    <section className="activity-section animate-fade-in" style={{ animationDelay: '0.5s' }}>
      <h2 className="section-title">Repository Activity</h2>
      <div className="activity-placeholder">
        <div className="placeholder-content">
          <div className="pulse-icon"></div>
          <p className="placeholder-text">Commit graph visualization coming soon</p>
          <p className="placeholder-subtext">We're building something amazing to help you visualize git history.</p>
        </div>
      </div>
    </section>
  );
};

export default ActivitySection;
