import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
