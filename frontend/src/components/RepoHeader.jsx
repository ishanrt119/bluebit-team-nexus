import React from 'react';
import { Github, ExternalLink, Star, GitFork, AlertCircle } from 'lucide-react';

const RepoHeader = ({ repoData }) => {
  if (!repoData) return null;

  return (
    <header className="repo-header animate-fade-in">
      <div className="header-content">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
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

          <div className="flex gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center min-w-[100px]">
              <Star className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-xl font-bold text-white">{repoData.stars?.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Stars</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center min-w-[100px]">
              <GitFork className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-xl font-bold text-white">{repoData.forks?.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Forks</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center min-w-[100px]">
              <AlertCircle className="w-5 h-5 text-rose-400 mb-1" />
              <span className="text-xl font-bold text-white">{repoData.openIssues?.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Issues</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RepoHeader;
