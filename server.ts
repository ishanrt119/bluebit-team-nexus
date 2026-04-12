import express from "express";
import { createServer as createViteServer } from "vite";
import { Octokit } from "octokit";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;
const db = new Database("git_insight.db");

const aiClient = process.env.N_AI ? new OpenAI({
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: process.env.N_AI,
}) : null;

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY,
    repo_url TEXT,
    name TEXT,
    owner TE
    let relevantFiles: any[] = [];
    if (keywords.length > 0) {
      const searchTerms = keywords.map(k => `% ${ k } % `);
      const query = `
        SELECT path, content FROM files 
        WHERE repo_id = ?
  AND(${ keywords.map(() => "path LIKE ? OR content LIKE ?").join(" OR ") })
        LIMIT 8
  `;
      const params = [repoId, ...searchTerms.flatMap(t => [t, t])];
      relevantFiles = db.prepare(query).all(...params);
    }

    res.json({
      repoId,
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

app.post("/arror: any) {
    console.error("Fetch History Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch chat history" });
  }
});

app.delete("/api/repo/chat-history", (req, res) => {
  const { repoId } = req.query;
  if (!repoId) return res.status(400).json({ error: "Missing repoId" });

  try {
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (cached) {
      const data = JSON.parse(cached.data);
      data.chatHistory = []; // clear the history array
      db.prepare("UPDATE repositories SET data = ? WHERE id = ?").run(JSON.stringify(data), repoId);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete History Error:", error);
    res.status(500).json({ error: error.message || "Failed to delete chat history" });
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
              ...on Commit {
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
      color: `hsl(${(index * 137.5) % 360}, 70 %, 50 %)` // Golden angle for color distribution
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
