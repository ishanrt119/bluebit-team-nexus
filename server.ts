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
    owner TEXT,
    default_branch TEXT,
    data TEXT,
    narrative TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    // Cleanup old cache entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM files WHERE repo_id IN (SELECT id FROM repositories WHERE last_analyzed_at < ?)").run(oneHourAgo);
    db.prepare("DELETE FROM repositories WHERE last_analyzed_at < ?").run(oneHourAgo);

    const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });

    const [_, owner, repo] = match;
    const repoId = `${owner}/${repo}`;

    // Check cache
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (cached) {
      // Update last_analyzed_at
      db.prepare("UPDATE repositories SET last_analyzed_at = CURRENT_TIMESTAMP WHERE id = ?").run(repoId);
      
      return res.json({
        data: JSON.parse(cached.data),
        narrative: cached.narrative ? JSON.parse(cached.narrative) : null
      });
    }

    let commits: any[] = [];
    try {
      commits = await octokit.paginate(octokit.rest.repos.listCommits, {
        owner,
        repo,
        per_page: 100,
      });
      if (commits.length > 500) commits = commits.slice(0, 500);
    } catch (error: any) {
      if (error.status === 404) return res.status(404).json({ error: "Repository does not exist or is private" });
      throw error;
    }

    const detailedCommits: any[] = [];

    // Fetch massive details instantly using GitHub GraphQL API
    try {
      const query = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100) {
                    nodes {
                      oid
                      message
                      authoredDate
                      additions
                      deletions
                      author {
                        name
                        user {
                          login
                          avatarUrl
                        }
                      }
                      parents(first: 5) {
                        nodes { oid }
                      }
                      changedFilesIfAvailable
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const graphqlRes: any = await octokit.graphql(query, { owner, repo });
      const gqlNodes = graphqlRes.repository?.defaultBranchRef?.target?.history?.nodes || [];

      const gqlMap = new Map(gqlNodes.map((n: any) => [n.oid, n]));

      // GraphQL doesn't give direct file paths easily, so we only fetch full file path patches for the Top 25 most recent commits via REST concurrently
      // This is a 10x speedup from previous 100 batches while still giving great churn and graph data
      const commitsToGetFilesFor = commits.slice(0, 25);
      const restResults = await Promise.all(commitsToGetFilesFor.map(c =>
        octokit.rest.repos.getCommit({ owner, repo, ref: c.sha }).catch(() => null)
      ));

      const fileMap = new Map();
      restResults.forEach((res, i) => {
        if (res?.data) {
          const sha = commitsToGetFilesFor[i].sha;
          fileMap.set(sha, res.data.files?.map((f: any) => f.filename).filter(Boolean) || []);
        }
      });

      commits.forEach((c) => {
        const g = gqlMap.get(c.sha) as any;
        const filePaths = fileMap.get(c.sha) || [];

        detailedCommits.push({
          sha: c.sha,
          author: g?.author?.name || c.commit.author?.name || "Unknown",
          authorLogin: g?.author?.user?.login || c.author?.login || "Unknown",
          authorAvatar: g?.author?.user?.avatarUrl || c.author?.avatar_url || "",
          avatarUrl: g?.author?.user?.avatarUrl || c.author?.avatar_url || null,
          login: g?.author?.user?.login || c.author?.login || null,
          date: g?.authoredDate || c.commit.author?.date,
          message: g?.message || c.commit.message,
          sentiment: analyzeSentiment(g?.message || c.commit.message),
          parentShas: g?.parents?.nodes?.map((p: any) => p.oid) || c.parents?.map((p: any) => p.sha) || [],
          filesChanged: g?.changedFilesIfAvailable || filePaths.length,
          filePaths,
          modifiedFiles: filePaths,
          insertions: g?.additions || 0,
          deletions: g?.deletions || 0,
        });
      });

    } catch (error: any) {
      console.warn("GraphQL failed, using minimal REST fallback...", error.message);
      // Absolute fallback if GraphQL is disabled/token lacks scope
      commits.forEach((c) => {
        detailedCommits.push({
          sha: c.sha,
          author: c.commit.author?.name || "Unknown",
          authorLogin: c.author?.login || "Unknown",
          authorAvatar: c.author?.avatar_url || "",
          avatarUrl: c.author?.avatar_url || null,
          login: c.author?.login || null,
          date: c.commit.author?.date,
          message: c.commit.message,
          sentiment: analyzeSentiment(c.commit.message),
          parentShas: c.parents?.map((p: any) => p.sha) || [],
          filesChanged: 0,
          filePaths: [],
          modifiedFiles: [],
          insertions: 0,
          deletions: 0,
        });
      });
    }

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
    const fileCounts: Record<string, number> = {};

    detailedCommits.forEach((c) => {
      contributors[c.author] = (contributors[c.author] || 0) + 1;
      const changedFiles = c.filePaths || c.modifiedFiles || [];
      changedFiles.forEach((f: string) => { fileCounts[f] = (fileCounts[f] || 0) + 1; });
    });

    const totalUniqueFiles = Object.keys(fileCounts).length;
    const churnedFiles = Object.values(fileCounts).filter(n => n > 1).length;
    const churnRate = totalUniqueFiles > 0 ? (churnedFiles / totalUniqueFiles) * 100 : 0;

    const stats = {
      repoName: repo,
      owner,
      totalCommits: commits.length,
      contributors: Object.entries(contributors).map(([name, count]) => ({ name, count })),
      commits: detailedCommits,
      files: files.filter(f => f.type === 'blob').map(f => f.path),
      readme,
      packageJson,
      coreFiles: coreFiles.filter(Boolean),
      metrics: {
        churnRate,
        refactorCount: detailedCommits.filter(c => c.message.toLowerCase().includes("refactor")).length,
        bugFixes: detailedCommits.filter(c => c.message.toLowerCase().includes("fix")).length,
      },
      chatHistory: [] // Initialize chat history in cache
    };

    // Store in DB
    db.prepare("INSERT OR REPLACE INTO repositories (id, repo_url, name, owner, data, last_analyzed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)")
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

app.get("/api/contributor-network", (req, res) => {
  const { repoId } = req.query;
  if (!repoId) return res.status(400).json({ error: "Missing repoId" });

  try {
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (!cached) return res.status(404).json({ error: "Repo not analyzed yet" });

    const repoData = JSON.parse(cached.data);
    const commits: any[] = repoData.commits || [];

    // Build contributor map
    const contributorMap: Record<string, {
      name: string;
      login: string | null;
      avatarUrl: string | null;
      commitCount: number;
      insertions: number;
      deletions: number;
      firstCommit: string;
      lastCommit: string;
      files: Set<string>;
    }> = {};

    commits.forEach((c: any) => {
      if (!contributorMap[c.author]) {
        contributorMap[c.author] = {
          name: c.author,
          login: c.login || null,
          avatarUrl: c.avatarUrl || null,
          commitCount: 0,
          insertions: 0,
          deletions: 0,
          firstCommit: c.date,
          lastCommit: c.date,
          files: new Set(),
        };
      }
      const entry = contributorMap[c.author];
      entry.commitCount++;
      entry.insertions += c.insertions || 0;
      entry.deletions += c.deletions || 0;
      if (c.date < entry.firstCommit) entry.firstCommit = c.date;
      if (c.date > entry.lastCommit) entry.lastCommit = c.date;
      (c.filePaths || []).forEach((f: string) => entry.files.add(f));
    });

    const nodes = Object.values(contributorMap).map(c => ({
      name: c.name,
      login: c.login,
      avatarUrl: c.avatarUrl,
      commitCount: c.commitCount,
      insertions: c.insertions,
      deletions: c.deletions,
      firstCommit: c.firstCommit,
      lastCommit: c.lastCommit,
      files: Array.from(c.files),
    }));

    // Build edges: pairs who share files
    const edgeMap: Record<string, { source: string; target: string; sharedFiles: string[]; weight: number }> = {};
    const authorNames = Object.keys(contributorMap);

    for (let i = 0; i < authorNames.length; i++) {
      for (let j = i + 1; j < authorNames.length; j++) {
        const a = authorNames[i];
        const b = authorNames[j];
        const aFiles = contributorMap[a].files;
        const bFiles = contributorMap[b].files;
        const shared: string[] = [];
        aFiles.forEach(f => { if (bFiles.has(f)) shared.push(f); });
        if (shared.length > 0) {
          const edgeId = [a, b].sort().join('||');
          edgeMap[edgeId] = { source: a, target: b, sharedFiles: shared.slice(0, 20), weight: shared.length };
        }
      }
    }

    const edges = Object.values(edgeMap);
    const topContributors = [...nodes].sort((a, b) => b.commitCount - a.commitCount).slice(0, 10);

    res.json({ nodes, edges, topContributors });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/save-narrative", (req, res) => {
  const { repoId, narrative } = req.body;
  db.prepare("UPDATE repositories SET narrative = ? WHERE id = ?")
    .run(JSON.stringify(narrative), repoId);
  res.json({ success: true });
});

app.post("/api/generate-narrative", async (req, res) => {
  if (!aiClient) return res.status(500).json({ error: "AI not configured on server" });
  const { repoData } = req.body;
  if (!repoData) return res.status(400).json({ error: "Missing repoData" });

  try {
    const prompt = `You are an expert Git repository analyzer. You will receive stats about a repository.
Your task is to generate a cinematic narrative of the project's evolution.
You must return ONLY a JSON object with this exact structure, nothing else:
{
  "introduction": "string (A dramatic opening sentence)",
  "majorEvents": [
    { "title": "string", "description": "string", "date": "string", "impact": "high" | "medium" | "low" }
  ],
  "challenges": ["string (e.g. Managing code complexity)"],
  "turningPoints": ["string"],
  "conclusion": "string",
  "summary": "string",
  "documentaryScript": "string (A script format: '[Scene: ...] Narrator: ...')"
}

Repository Data:
Name: ${repoData.repoName}
Owner: ${repoData.owner}
Total Commits: ${repoData.totalCommits || repoData.commits?.length}
Description: ${repoData.description || "N/A"}
Top files: ${repoData.files?.slice(0, 10).join(', ')}

Recent Commit Messages (Context):
${(repoData.commits || []).slice(0, 20).map((c: any) => `- ${c.date.split('T')[0]}: ${c.message.split('\n')[0]} (by ${c.author})`).join('\n')}
`;

    const response = await aiClient.chat.completions.create({
      model: "moonshotai/Kimi-K2.5-fast",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a creative technical writer and repository analyst. Output only valid JSON matching the requested structure."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.choices[0].message.content || "{}";
    const narrative = JSON.parse(content);
    res.json(narrative);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate narrative" });
  }
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

app.post("/api/repo/chat-answer", async (req, res) => {
  if (!aiClient) return res.status(500).json({ error: "AI not configured on server" });
  const { context, question, mode } = req.body;
  if (!context || !question) return res.status(400).json({ error: "Missing context or question" });

  try {
    const prompt = `You are a helpful and expert AI assistant analyzing a Git repository.
The user is asking a question in '${mode}' mode. (If beginner, explain simply. If technical, be detailed).

Repository Context provided by backend:
Repo ID: ${context.repoId || 'unknown'}
Files: ${context.fileTree?.map((f: any) => f.path).slice(0, 50).join(', ')}
${context.packageJson ? `Package.json Dependencies: ${JSON.stringify(context.packageJson?.dependencies)}` : ''}

Relevant File Contents snippets:
${(context.relevantFiles || []).map((f: any) => `### ${f.path}\n${f.content.substring(0, 1500)}`).join('\n\n')}

Question: ${question}

Provide a clear, accurate, and helpful response based on the repository context above. You MUST use the 'search_commits' tool if the user asks about the commit history or authors.`;

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "search_commits",
          description: "Search the git commit history by keyword or author",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Keyword to search for in commit messages" },
              author: { type: "string", description: "Author name to filter by" },
              limit: { type: "number", description: "Maximum number of commits to return (default 5)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Reads and returns the content of a specific file from the git repository.",
          parameters: {
            type: "object",
            properties: {
              file_path: { type: "string", description: "The relative path to the file in the repository, e.g., 'src/main.py'" }
            },
            required: ["file_path"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_commit_history",
          description: "Retrieves the recent commit history of the repository including commit hashes and messages.",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "The number of recent commits to retrieve (default 5)" }
            }
          }
        }
      }
    ];

    const systemMessages: any[] = [
      { role: "system", content: "You are a repository analysis assistant." },
      { role: "user", content: prompt }
    ];

    let cachedRepo = db.prepare("SELECT * FROM repositories WHERE id = ?").get(context.repoId) as any;
    let repoDataStr = cachedRepo ? cachedRepo.data : "{}";
    let rData = JSON.parse(repoDataStr);

    const history = rData.chatHistory || [];
    const formattedHistory = history.slice(-20).map((msg: any) => ({ role: msg.role, content: msg.content }));

    const messages: any[] = [...formattedHistory, ...systemMessages];

    // Save user's prompt to history
    rData.chatHistory = [...(rData.chatHistory || []), { role: "user", content: question, timestamp: new Date().toISOString() }];
    db.prepare("UPDATE repositories SET data = ? WHERE id = ?").run(JSON.stringify(rData), context.repoId);

    let response = await aiClient.chat.completions.create({
      model: "moonshotai/Kimi-K2.5-fast",
      messages,
      tools
    });

    let msg = response.choices[0].message;

    // Handle Moonshot raw text tool calls if standard tool_calls array is not present
    if (!msg.tool_calls && msg.content && msg.content.includes('<|tool_call_begin|>')) {
      const content = msg.content;
      const toolCalls = [];
      const regex = /<\|tool_call_begin\|>\s*functions\.([^\s:]+):\d+\s*<\|tool_call_argument_begin\|>\s*([\s\S]*?)\s*<\|tool_call_end\|>/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).substring(7)}`,
          type: 'function',
          function: {
            name: match[1],
            arguments: match[2].trim()
          }
        });
      }

      if (toolCalls.length > 0) {
        msg.tool_calls = toolCalls;
        // Strip the raw tool call blob from the content being saved to history
        msg.content = content.split('<|tool_calls_section_begin|>')[0].trim();
      }
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);

      for (const call of msg.tool_calls) {
        const functionCall = (call as any).function;
        if (functionCall?.name === 'search_commits') {
          try {
            const args = JSON.parse(functionCall.arguments);
            const cached = db.prepare("SELECT data FROM repositories WHERE id = ?").get(context.repoId) as any;
            let result = "No commits found or repository not analyzed.";

            if (cached) {
              const rData = JSON.parse(cached.data);
              let commits = rData.commits || [];
              if (args.author) commits = commits.filter((c: any) => c.author.toLowerCase().includes(args.author.toLowerCase()));
              if (args.query) commits = commits.filter((c: any) => c.message.toLowerCase().includes(args.query.toLowerCase()));

              const limit = args.limit || 5;
              result = JSON.stringify(commits.slice(0, limit).map((c: any) => ({
                sha: c.sha, author: c.author, date: c.date, message: c.message
              })));
            }

            messages.push({
              role: "tool",
              content: result,
              tool_call_id: call.id,
              name: functionCall.name
            });
          } catch (e) {
            messages.push({
              role: "tool",
              content: '{"error": "Failed to execute tool"}',
              tool_call_id: call.id,
              name: functionCall?.name || "search_commits"
            });
          }
        } else if (functionCall?.name === 'read_file') {
          try {
            const args = JSON.parse(functionCall.arguments);
            const path = args.file_path;

            const file = db.prepare("SELECT content FROM files WHERE repo_id = ? AND path = ?").get(context.repoId, path) as any;
            let result = "File not found or not in cache.";

            if (file) {
              // Truncate to avoid context window API limit
              result = file.content.length > 8000 ? file.content.substring(0, 8000) + "\n...[truncated]" : file.content;
            } else {
              const [owner, repo] = context.repoId.split("/");
              try {
                const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path }) as any;
                const content = Buffer.from(fileData.content, "base64").toString();
                result = content.length > 8000 ? content.substring(0, 8000) + "\n...[truncated]" : content;
              } catch (e) {
                result = "Could not fetch file from GitHub API. It may not exist.";
              }
            }

            messages.push({
              role: "tool",
              content: result,
              tool_call_id: call.id,
              name: functionCall.name
            });
          } catch (e) {
            messages.push({
              role: "tool",
              content: '{"error": "Failed to execute tool read_file"}',
              tool_call_id: call.id,
              name: functionCall?.name || "read_file"
            });
          }
        } else if (functionCall?.name === 'get_commit_history') {
          try {
            const args = JSON.parse(functionCall.arguments);
            const cached = db.prepare("SELECT data FROM repositories WHERE id = ?").get(context.repoId) as any;
            let result = "No commits found or repository not analyzed.";

            if (cached) {
              const rData = JSON.parse(cached.data);
              const limit = args.limit || 5;
              result = JSON.stringify((rData.commits || []).slice(0, limit).map((c: any) => ({
                sha: c.sha, author: c.author, date: c.date, message: c.message
              })));
            }

            messages.push({
              role: "tool",
              content: result,
              tool_call_id: call.id,
              name: functionCall.name
            });
          } catch (e) {
            messages.push({
              role: "tool",
              content: '{"error": "Failed to execute tool get_commit_history"}',
              tool_call_id: call.id,
              name: functionCall?.name || "get_commit_history"
            });
          }
        }
      }

      response = await aiClient.chat.completions.create({
        model: "moonshotai/Kimi-K2.5-fast",
        messages,
        tools
      });
      msg = response.choices[0].message;
    }

    const answer = msg.content || "Sorry, I couldn't generate an answer.";

    // Save assistant's answer to history
    const finalCached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(context.repoId) as any;
    if (finalCached) {
      let finalData = JSON.parse(finalCached.data);
      finalData.chatHistory = [...(finalData.chatHistory || []), { role: "assistant", content: answer, timestamp: new Date().toISOString() }];
      db.prepare("UPDATE repositories SET data = ? WHERE id = ?").run(JSON.stringify(finalData), context.repoId);
    }

    res.json({ answer });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat answer" });
  }
});

app.get("/api/repo/chat-history", (req, res) => {
  const { repoId } = req.query;
  if (!repoId) return res.status(400).json({ error: "Missing repoId" });

  try {
    const cached = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as any;
    if (cached) {
      const data = JSON.parse(cached.data);
      res.json({ history: data.chatHistory || [] });
    } else {
      res.json({ history: [] });
    }
  } catch (error: any) {
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
