import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github } from 'lucide-react';

const DashboardNavbar = ({ repoName }) => {
  const navigate = useNavigate();

  return (
    <nav className="dashboard-navbar">
      <div className="nav-left">
        <button onClick={() => navigate('/')} className="back-btn">
          <ArrowLeft size={18} />
          <span>Analyze another repository</span>
        </button>
        <div className="nav-divider"></div>
        <div className="logo-container">
          <Github size={24} className="logo-icon" />
          <span className="logo-text">Git History Time Traveller</span>
        </div>
      </div>
      
      

      <div className="nav-right">
        <div className="repo-badge">
          <span className="repo-name-display">{repoName || 'Loading...'}</span>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
