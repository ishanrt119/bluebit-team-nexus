import * as githubService from '../services/githubService.js';
import * as gitParser from '../utils/gitParser.js';
import fs from 'fs';

export const analyzeRepo = async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ status: "error", message: "Repository URL is required" });
  }

  const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
  if (!githubRegex.test(repoUrl)) {
    return res.status(400).json({ status: "error", message: "Invalid GitHub Repository URL" });
  }

  try {
    console.log(`Analyzing repository: ${repoUrl}`);
    
    // Extract owner and repoName
    const parts = repoUrl.replace(/\/$/, "").split("/");
    const repoName = parts.pop();
    const owner = parts.pop();

    // Fetch metadata
    const metadata = await githubService.getRepoMetadata(owner, repoName);
    
    // Fetch stats, total commits and recent commits
    const [stats, totalCommitsCount, commits] = await Promise.all([
      githubService.getRepoStats(owner, repoName),
      githubService.getTotalCommits(owner, repoName),
      githubService.getRepoCommits(owner, repoName, 300)
    ]);

    // Detailed analysis via cloning
    let commitHistory = [];
    try {
      const tempPath = await githubService.cloneRepo(repoUrl);
      const detailed = await githubService.getDetailedGitStats(tempPath);
      commitHistory = detailed.commitHistory;
      // Clean up
      fs.rmSync(tempPath, { recursive: true, force: true });
    } catch (cloneError) {
      console.error('Cloning/Detailed analysis failed:', cloneError);
    }

    // Process stats
    let totalCommits = totalCommitsCount;
    let totalAdditions = 0;
    let totalDeletions = 0;
    const contributors = [];

    if (Array.isArray(stats) && stats.length > 0) {
      // If we have stats, use them for total commits as well to be consistent with contributors
      let statsTotalCommits = 0;
      stats.forEach(contributor => {
        statsTotalCommits += contributor.total;
        const additions = contributor.weeks.reduce((sum, w) => sum + w.a, 0);
        const deletions = contributor.weeks.reduce((sum, w) => sum + w.d, 0);
        
        totalAdditions += additions;
        totalDeletions += deletions;
        
        contributors.push({
          login: contributor.author.login,
          avatar: contributor.author.avatar_url,
          commits: contributor.total,
          additions: additions,
          deletions: deletions
        });
      });
      
      // Use the larger of the two counts to be safe
      totalCommits = Math.max(totalCommits, statsTotalCommits);
    }

    // Process commits for timeline and refactors
    const timeline = commits.map(c => ({
      author: c.commit.author.name,
      login: c.author?.login || c.commit.author.name,
      message: c.commit.message,
      date: c.commit.author.date,
      sha: c.sha
    }));

    const refactors = timeline.filter(c => 
      c.message.toLowerCase().includes('refactor') || 
      c.message.toLowerCase().includes('cleanup') ||
      c.message.toLowerCase().includes('clean up')
    ).length;

    // Calculate churn rate: (additions + deletions) / total_commits (as a simple volatility metric)
    // Or more accurately if we had total lines, but let's use a normalized value for display
    const churnRate = totalCommits > 0 ? ((totalAdditions + totalDeletions) / (totalCommits * 100)).toFixed(1) : 0;

    res.json({
      status: 'success',
      data: {
        ...metadata,
        analytics: {
          commits: totalCommits || timeline.length,
          contributors: contributors.length || new Set(timeline.map(c => c.author)).size,
          churnRate: Math.min(parseFloat(churnRate), 100), // Cap at 100 for display
          refactors: refactors
        },
        contributors: contributors,
        timeline: timeline,
        commitHistory: commitHistory
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to analyze repository: ' + error.message });
  }
};
