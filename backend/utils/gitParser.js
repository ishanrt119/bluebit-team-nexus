import { simpleGit } from 'simple-git';

export const parseGitLog = async (repoPath) => {
  const git = simpleGit(repoPath);
  const log = await git.log();
  
  // Basic stats
  const authors = {};
  const timeline = log.all.map(commit => {
    authors[commit.author_name] = (authors[commit.author_name] || 0) + 1;
    return {
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author: commit.author_name,
    };
  });

  return {
    totalCommits: log.total,
    authors: Object.entries(authors).map(([name, count]) => ({ name, count })),
    timeline,
  };
};
