import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getRepoMetadata = async (owner, repo) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
    const data = response.data;
    return {
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      created_at: data.created_at,
      updated_at: data.updated_at,
      owner: {
        login: data.owner.login,
        avatar_url: data.owner.avatar_url,
        html_url: data.owner.html_url
      }
    };
  } catch (error) {
    throw new Error('Failed to fetch metadata from GitHub API');
  }
};

export const getRepoStats = async (owner, repo) => {
  try {
    // This endpoint returns a list of contributors with their weekly stats
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return [];
  }
};

export const getRepoCommits = async (owner, repo) => {
  try {
    // Fetch last 100 commits
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`);
    return response.data;
  } catch (error) {
    console.error('Error fetching commits:', error);
    return [];
  }
};

export const cloneRepo = async (repoUrl) => {
  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const tempDir = path.join(os.tmpdir(), `git-history-${Date.now()}-${repoName}`);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const git = simpleGit();
  await git.clone(repoUrl, tempDir);
  return tempDir;
};
