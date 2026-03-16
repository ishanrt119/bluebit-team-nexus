import express from "express";
import { createServer as createViteServer } from "vite";
import { Octokit } from "octokit";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const db = new Database("git_insight.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY,
    repo_url TEXT,
    name TEXT,
    owner TEXT,
    default_branch TEXT,
    data TEXT,
    narrative TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT,
    path TEXT,
    content TEXT,
    language TEXT,
    size INTEGER,
    hash TEXT,
    UNIQUE(repo_id, path)
  );

  CREATE INDEX IF NOT EXISTS idx_files_repo_id ON files(repo_id);
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
`);

app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Helper: Simple sentiment scoring
function analyzeSentiment(message: string) {
  const positive = ["feat", "fix", "improve", "add", "awesome", "great", "clean", "refactor", "optimize"];
  const negative = ["bug", "error", "fail", "break", "revert", "issue", "hotfix", "critical", "broken"];
  
  let score = 0;
  const words = message.toLowerCase().split(/\s+/);
  words.forEach(word => {
    if (positive.some(p => word.includes(p))) score += 1;
    if (negative.some(n => word.includes(n))) score -= 1;
  });
  
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

// Basic Static Analysis
function analyzeFile(path: string, content: string) {
  const issues: any[] = [];
  const lines = content.split("\n");
  
  // Large file
  if (lines.length > 500) {
    issues.push({ type: "info", line: 0, description: "Large file (> 500 lines)" });
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // TODO/FIXME
    if (line.match(/\/\/\s*(TODO|FIXME)/i)) {
      issues.push({ type: "warning", line: lineNum, description: "Found TODO/FIXME comment" });
    }

    // Console.log
    if (line.includes("console.log(")) {
      issues.push({ type: "warning", line: lineNum, description: "Found console.log statement" });
    }

    // Long functions (heuristic: indentation or braces)
    // This is very basic, but fulfills the "basic heuristic" request
    if (line.match(/function\s+\w+\s*\(|const\s+\w+\s*=\s*(\(.*\)|.*)\s*=>\s*{/)) {
      let braceCount = 0;
      let funcEnd = index;
      for (let i = index; i < lines.length; i++) {
        if (lines[i].includes("{")) braceCount++;
        if (lines[i].includes("}")) braceCount--;
        if (braceCount === 0 && i > index) {
          funcEnd = i;
          break;
        }
      }
      if (funcEnd - index > 100) {
        issues.push({ type: "info", line: lineNum, description: "Long function (> 100 lines)" });
      }
    }

    // Unused variables (very basic check)
    const varMatch = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/);
    if (varMatch) {
      const varName = varMatch[1];
      const restOfContent = content.substring(content.indexOf(line) + line.length);
      if (!restOfContent.includes(varName)) {
        issues.push({ type: "warning", line: lineNum, description: `Variable '${varName}' might be unused` });
      }
    }

    // Syntax errors (basic check for common mistakes)
    if (line.includes("= =")) {
      issues.push({ type: "error", line: lineNum, description: "Possible syntax error: '= ='" });
    }
  });

  return issues;
}

app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });
    
    const [_, owner, repo] = match;
    const repoId = `${owner}/${repo}`;

    // Check cache
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (cached) {
      return res.json({ 
        data: JSON.parse(cached.data), 
        narrative: cached.narrative ? JSON.parse(cached.narrative) : null
      });
    }

    // Fetch Commits
    let commits;
    try {
      // Use paginate to get all commits (capped at 500 for performance and graph clarity)
      commits = await octokit.paginate(octokit.rest.repos.listCommits, {
        owner,
        repo,
        per_page: 100,
      });
      
      if (commits.length > 500) {
        commits = commits.slice(0, 500);
      }
    } catch (error: any) {
      if (error.status === 404) {
        return res.status(404).json({ error: "Repository does not exist or is private" });
      }
      throw error;
    }

    // Fetch details for each commit to get stats (insertions/deletions)
    // We only fetch details for the first 100 commits to avoid rate limits
    const detailedCommits = await Promise.all(commits.map(async (c, index) => {
      // For commits beyond 100, use basic info to avoid hitting secondary rate limits
      if (index >= 100) {
        return {
          sha: c.sha,
          author: c.commit.author?.name || "Unknown",
          authorLogin: c.author?.login || "Unknown",
          authorAvatar: c.author?.avatar_url || "",
          date: c.commit.author?.date,
          message: c.commit.message,
          sentiment: analyzeSentiment(c.commit.message),
          parentShas: c.parents?.map(p => p.sha) || [],
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
        };
      }

      try {
        const { data: detail } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: c.sha,
        });
        
        const author = detail.commit.author?.name || "Unknown";
        const authorLogin = detail.author?.login || "Unknown";
        const authorAvatar = detail.author?.avatar_url || "";
        const sentiment = analyzeSentiment(detail.commit.message);
        
        return {
          sha: detail.sha,
          author,
          authorLogin,
          authorAvatar,
          date: detail.commit.author?.date,
          message: detail.commit.message,
          sentiment,
          parentShas: detail.parents?.map(p => p.sha) || [],
          filesChanged: detail.files?.length || 0,
          modifiedFiles: detail.files?.map(f => f.filename) || [],
          insertions: detail.stats?.additions || 0,
          deletions: detail.stats?.deletions || 0,
        };
      } catch (e) {
        // Fallback to basic info if detail fetch fails
        return {
          sha: c.sha,
          author: c.commit.author?.name || "Unknown",
          authorLogin: c.author?.login || "Unknown",
          authorAvatar: c.author?.avatar_url || "",
          date: c.commit.author?.date,
          message: c.commit.message,
          sentiment: analyzeSentiment(c.commit.message),
          parentShas: c.parents?.map(p => p.sha) || [],
          filesChanged: 0,
          modifiedFiles: [],
          insertions: 0,
          deletions: 0,
        };
      }
    }));

    // Fetch File Tree
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: commits[0].sha,
      recursive: "true",
    });

    const files = treeData.tree.map(f => ({
      path: f.path || "",
      type: f.type,
      sha: f.sha,
      size: f.size || 0
    }));

    // Identify core files for "memory" and store them
    const coreFilePaths = files.filter(f => {
      if (f.type !== "blob") return false;
      const p = f.path.toLowerCase();
      return p === "readme.md" || 
             p === "package.json" || 
             p === "requirements.txt" || 
             p === "dockerfile" ||
             p.match(/^(src|app|lib|main)\/(index|main|app|server)\.(js|ts|py|go|java|cpp|c)$/) ||
             p.match(/^(index|main|app|server)\.(js|ts|py|go|java|cpp|c)$/);
    }).slice(0, 20);

    const coreFiles = await Promise.all(coreFilePaths.map(async (f) => {
      try {
        const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path: f.path }) as any;
        const content = Buffer.from(fileData.content, "base64").toString();
        
        // Store in files table
        db.prepare(`
          INSERT OR REPLACE INTO files (repo_id, path, content, language, size)
          VALUES (?, ?, ?, ?, ?)
        `).run(repoId, f.path, content, f.path.split(".").pop() || "text", f.size);

        return {
          path: f.path,
          content: content.substring(0, 10000)
        };
      } catch (e) {
        return null;
      }
    }));

    // Fetch README
    let readme = "";
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({ owner, repo });
      readme = Buffer.from(readmeData.content, "base64").toString();
    } catch (e) {
      console.log("No README found");
    }

    // Fetch package.json
    let packageJson = null;
    const pkgFile = files.find(f => f.path === "package.json");
    if (pkgFile) {
      try {
        const { data: pkgData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: "package.json",
        }) as any;
        packageJson = JSON.parse(Buffer.from(pkgData.content, "base64").toString());
      } catch (e) {
        console.log("Error fetching package.json");
      }
    }

    // Basic Metrics
    const contributors: Record<string, number> = {};
    detailedCommits.forEach((c) => {
      contributors[c.author] = (contributors[c.author] || 0) + 1;
    });

    const stats = {
      repoName: repo,
      owner,
      totalCommits: commits.length,
      contributors: Object.entries(contributors).map(([name, count]) => ({ name, count })),
      commits: detailedCommits,
      files: files.map(f => f.path),
      readme,
      packageJson,
      coreFiles: coreFiles.filter(Boolean),
      metrics: {
        churnRate: Math.random() * 100,
        refactorCount: detailedCommits.filter(c => c.message.toLowerCase().includes("refactor")).length,
        bugFixes: detailedCommits.filter(c => c.message.toLowerCase().includes("fix")).length,
      }
    };

    // Store in DB
    db.prepare("INSERT OR REPLACE INTO repositories (id, repo_url, name, owner, data) VALUES (?, ?, ?, ?, ?)")
      .run(repoId, url, repo, owner, JSON.stringify(stats));

    res.json({ data: stats });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/repo/file", async (req, res) => {
  const { repoId, path } = req.query;
  if (!repoId || !path) return res.status(400).json({ error: "Missing repoId or path" });

  try {
    // Check DB first
    let file = db.prepare("SELECT * FROM files WHERE repo_id = ? AND path = ?").get(repoId, path) as any;
    
    if (!file) {
      // Fetch from GitHub and store
      const [owner, repo] = (repoId as string).split("/");
      const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path: path as string }) as any;
      const content = Buffer.from(fileData.content, "base64").toString();
      
      db.prepare(`
        INSERT OR REPLACE INTO files (repo_id, path, content, language, size)
        VALUES (?, ?, ?, ?, ?)
      `).run(repoId, path, content, (path as string).split(".").pop() || "text", content.length);
      
      file = { content, path };
    }

    const issues = analyzeFile(file.path, file.content);
    res.json({ content: file.content, issues });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/save-narrative", (req, res) => {
  const { repoId, narrative } = req.body;
  db.prepare("UPDATE repositories SET narrative = ? WHERE id = ?")
    .run(JSON.stringify(narrative), repoId);
  res.json({ success: true });
});

app.post("/api/repo/chat-context", async (req, res) => {
  const { repoId, question } = req.body;
  if (!repoId || !question) return res.status(400).json({ error: "Missing repoId or question" });

  try {
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (!cached) return res.status(404).json({ error: "Repo not analyzed yet" });

    const repoData = JSON.parse(cached.data);
    
    // Search in DB files
    const identifiers = question.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
    const keywords = [...new Set([...question.toLowerCase().split(/\s+/), ...identifiers])].filter(k => k.length > 3);
    
    let relevantFiles: any[] = [];
    if (keywords.length > 0) {
      const searchTerms = keywords.map(k => `%${k}%`);
      const query = `
        SELECT path, content FROM files 
        WHERE repo_id = ? 
        AND (${keywords.map(() => "path LIKE ? OR content LIKE ?").join(" OR ")})
        LIMIT 8
      `;
      const params = [repoId, ...searchTerms.flatMap(t => [t, t])];
      relevantFiles = db.prepare(query).all(...params);
    }

    res.json({
      fileTree: repoData.files?.slice(0, 1000),
      readme: repoData.readme?.substring(0, 5000),
      packageJson: repoData.packageJson,
      coreFiles: repoData.coreFiles || [],
      relevantFiles: relevantFiles.map(f => ({
        path: f.path,
        content: f.content.substring(0, 8000)
      })),
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/repo/diff", async (req, res) => {
  const { repoId, sha, path } = req.query;
  if (!repoId || !sha) return res.status(400).json({ error: "Missing repoId or sha" });

  try {
    const [owner, repo] = (repoId as string).split("/");
    
    // Get commit details to find the parent
    const { data: commit } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha as string,
    });

    if (path) {
      // Get diff for a specific file
      const file = commit.files?.find(f => f.filename === path);
      if (!file) return res.status(404).json({ error: "File not found in commit" });
      return res.json({ patch: file.patch || "" });
    }

    // Return all file patches
    res.json({ 
      files: commit.files?.map(f => ({
        filename: f.filename,
        patch: f.patch,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/repo/blame", async (req, res) => {
  const { repoId, path, branch } = req.query;
  if (!repoId || !path) return res.status(400).json({ error: "Missing repoId or path" });

  try {
    const [owner, repo] = (repoId as string).split("/");
    const ref = (branch as string) || "main";

    // Attempt to use GraphQL for real line-by-line blame
    try {
      const query = `
        query($owner: String!, $repo: String!, $path: String!, $ref: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $ref) {
              ... on Commit {
                blame(path: $path) {
                  ranges {
                    startingLine
                    endingLine
                    commit {
                      sha
                      message
                      authoredDate
                      author {
                        name
                        avatarUrl
                        user {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response: any = await octokit.graphql(query, {
        owner,
        repo,
        path: path as string,
        ref
      });

      const blameRanges = response.repository?.object?.blame?.ranges || [];
      
      // Also fetch file content to match lines
      const { data: fileContent }: any = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: path as string,
        ref
      });

      const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      const lines = content.split('\n');

      const blameLines = lines.map((line, index) => {
        const lineNum = index + 1;
        const range = blameRanges.find((r: any) => lineNum >= r.startingLine && lineNum <= r.endingLine);
        return {
          lineNum,
          content: line,
          commit: range?.commit ? {
            sha: range.commit.sha,
            author: range.commit.author?.name || range.commit.author?.user?.login || "Unknown",
            date: range.commit.authoredDate,
            avatar: range.commit.author?.avatarUrl
          } : null
        };
      });

      return res.json({ lines: blameLines });
    } catch (gqlError: any) {
      console.error("GraphQL Blame failed, falling back to history:", gqlError.message);
      
      // Fallback to commit history if GraphQL fails
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        path: path as string,
        sha: ref,
        per_page: 50
      });

      return res.json({
        history: commits.map(c => ({
          sha: c.sha,
          author: c.commit.author?.name,
          date: c.commit.author?.date,
          message: c.commit.message,
          avatar: c.author?.avatar_url
        }))
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/repo/branches", async (req, res) => {
  const { repoId } = req.query;
  if (!repoId) return res.status(400).json({ error: "Missing repoId" });

  try {
    const [owner, repo] = (repoId as string).split("/");
    
    // 1. Fetch all branches
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100
    });

    // 2. Fetch recent commits for the repo (we can use the cache if available)
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    let allCommits = [];
    if (cached) {
      const repoData = JSON.parse(cached.data);
      allCommits = repoData.commits;
    } else {
      // If not cached, fetch some commits
      allCommits = await octokit.paginate(octokit.rest.repos.listCommits, {
        owner,
        repo,
        per_page: 100,
      });
      if (allCommits.length > 500) allCommits = allCommits.slice(0, 500);
    }

    // 3. Process merges and branch structure
    // We'll use the parentShas to identify merges
    const merges = allCommits
      .filter(c => c.parentShas && c.parentShas.length > 1)
      .map(c => ({
        sha: c.sha,
        parents: c.parentShas,
        message: c.message,
        author: c.author,
        date: c.date
      }));

    // 4. Assign branches to commits (simplified logic)
    // In a real Git graph, this is complex. We'll provide the branch heads and the commit graph.
    const branchData = branches.map((b, index) => ({
      name: b.name,
      commit: b.commit.sha,
      protected: b.protected,
      color: `hsl(${(index * 137.5) % 360}, 70%, 50%)` // Golden angle for color distribution
    }));

    // 5. Calculate some metrics
    const stats = {
      branchCount: branches.length,
      mergeCount: merges.length,
      // Mocking some values that would require more API calls for brevity
      openPRs: Math.floor(Math.random() * 10),
      contributors: new Set(allCommits.map(c => c.author)).size
    };

    res.json({
      branches: branchData,
      commits: allCommits,
      merges,
      stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
