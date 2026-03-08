import React from 'react';
import { Github, ExternalLink } from 'lucide-react';

const RepoHeader = ({ repoData }) => {
  if (!repoData) return null;

  return (
    <header className="repo-header animate-fade-in">
      <div className="header-content">
        <div className="repo-title-row">
          <Github size={32} className="github-icon" />
          <h1 className="repo-title">{repoData.name}</h1>
          <span className="language-tag">{repoData.language}</span>
        </div>
        <p className="repo-description">{repoData.description || 'No description provided.'}</p>
        <div className="repo-meta">
          <div className="owner-info">
            <img src={repoData.owner.avatar_url} alt={repoData.owner.login} className="owner-avatar" />
            <span className="owner-name">Owned by <a href={repoData.owner.html_url} target="_blank" rel="noopener noreferrer">{repoData.owner.login} <ExternalLink size={12} /></a></span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RepoHeader;
