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
    // GitHub may return 202 if stats are being computed, so we retry a few times
    let response;
    let retries = 3;
    
    while (retries > 0) {
      response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`);
      if (response.status === 200) break;
      if (response.status === 202) {
        console.log(`Stats for ${owner}/${repo} are being computed, retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries--;
      } else {
        break;
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return [];
  }
};

export const getTotalCommits = async (owner, repo) => {
  try {
    // Trick to get total commit count: fetch 1 commit and check the 'Link' header
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
    const linkHeader = response.headers.link;
    
    if (!linkHeader) return 1;
    
    // Example link header: <...&page=2>; rel="next", <...&page=123>; rel="last"
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    return 1;
  } catch (error) {
    console.error('Error fetching total commits:', error);
    return 0;
  }
};

export const getRepoCommits = async (owner, repo, limit = 100) => {
  try {
    // Fetch commits with pagination if limit > 100
    const perPage = Math.min(limit, 100);
    const pages = Math.ceil(limit / perPage);
    let allCommits = [];
    
    for (let i = 1; i <= pages; i++) {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${i}`);
      allCommits = allCommits.concat(response.data);
      if (response.data.length < perPage) break;
    }
    
    return allCommits.slice(0, limit);
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

export const getDetailedGitStats = async (repoPath) => {
  const git = simpleGit(repoPath);
  
  try {
    // Get full commit history with files and stats
    // %ai: author date, %an: author name, %ae: author email, %s: subject, %H: hash
    const rawLog = await git.raw([
      'log', 
      '--pretty=format:%ai|%an|%ae|%s|%H', 
      '--numstat'
    ]);
    
    const commits = [];
    const blocks = rawLog.split('\n\n'); // numstat adds a newline between commits
    
    // Actually, numstat output is:
    // date|name|email|subject|hash
    // 
    // 10  5   file1.txt
    // 2   0   file2.js
    
    const lines = rawLog.split('\n');
    let currentCommit = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.includes('|')) {
        const [date, author, email, message, hash] = line.split('|');
        if (date && author && hash) {
          currentCommit = {
            date: date.split(' ')[0],
            author,
            email,
            message,
            hash,
            files: [],
            additions: 0,
            deletions: 0
          };
          commits.push(currentCommit);
        }
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 3 && currentCommit) {
          const additions = parseInt(parts[0], 10) || 0;
          const deletions = parseInt(parts[1], 10) || 0;
          const filePath = parts[2];
          
          currentCommit.files.push({ path: filePath, additions, deletions });
          currentCommit.additions += additions;
          currentCommit.deletions += deletions;
        }
      }
    }

    return {
      commitHistory: commits
    };
  } catch (error) {
    console.error('Error in detailed git stats:', error);
    return { commitHistory: [] };
  }
};
