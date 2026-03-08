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
    
    const repoPath = await githubService.cloneRepo(repoUrl);
    
    const analysis = await gitParser.parseGitLog(repoPath);
    
    res.json({
      status: 'success',
      data: analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to analyze repository: ' + error.message });
  }
};
