# 📡 GitInsight AI — API Documentation

**Base URL:** `http://localhost:3000`  
**Server:** Express.js (TypeScript)  
**Data Store:** SQLite (`git_insight.db`) — acts as a cache layer  

All endpoints return `application/json`. Error responses follow the format:
```json
{ "error": "Description of the error" }
```

---

## Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `POST` | `/api/analyze` | GitHub Token | Analyze a GitHub repository |
| `GET` | `/api/repo/file` | GitHub Token | Fetch file content + static analysis |
| `GET` | `/api/contributor-network` | — | Get contributor graph data |
| `POST` | `/api/save-narrative` | — | Persist generated narrative |
| `POST` | `/api/generate-narrative` | N_AI Key | AI-generate repository narrative |
| `POST` | `/api/repo/chat-context` | — | Gather context for AI chat |
| `POST` | `/api/repo/chat-answer` | N_AI Key | Answer a question about the repo |
| `GET` | `/api/repo/diff` | GitHub Token | Get commit diff |
| `GET` | `/api/repo/blame` | GitHub Token | Get file blame information |
| `GET` | `/api/repo/branches` | GitHub Token | Get branch data |

---

## `POST /api/analyze`

Analyzes a GitHub repository. Fetches commits (up to 500), file tree, core files, and computes metrics. Results are cached in SQLite by `owner/repo`.

### Request Body

```json
{
  "url": "https://github.com/owner/repo"
}
```

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `url` | `string` | ✅ | Full GitHub repository URL |

### Success Response `200`

```json
{
  "data": {
    "repoName": "string",
    "owner": "string",
    "totalCommits": 150,
    "contributors": [
      { "name": "Jane Doe", "count": 42 }
    ],
    "commits": [
      {
        "sha": "abc123",
        "author": "Jane Doe",
        "authorLogin": "janedoe",
        "authorAvatar": "https://...",
        "date": "2024-01-15T10:30:00Z",
        "message": "feat: add dashboard component",
        "sentiment": "positive",
        "parentShas": ["def456"],
        "filesChanged": 3,
        "filePaths": ["src/App.tsx"],
        "insertions": 120,
        "deletions": 5
      }
    ],
    "files": ["src/App.tsx", "package.json"],
    "readme": "# Project README...",
    "packageJson": { "name": "...", "dependencies": {} },
    "coreFiles": [
      { "path": "src/index.ts", "content": "..." }
    ],
    "metrics": {
      "churnRate": 24.5,
      "refactorCount": 3,
      "bugFixes": 12
    }
  }
}
```

### Commit Sentiment Values
- `"positive"` — message contains improvement keywords (feat, fix, improve, optimize…)
- `"negative"` — message contains issue keywords (bug, error, fail, hotfix…)
- `"neutral"` — no strong signal

### Error Responses
| Code | Description |
|------|-------------|
| `400` | Missing or invalid URL |
| `404` | Repository not found or private |
| `500` | GitHub API error |

---

## `GET /api/repo/file`

Fetches file content from the repository (DB cache first, then GitHub). Runs a static analysis pass on the returned content.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `repoId` | `string` | ✅ | Repository in `owner/repo` format |
| `path` | `string` | ✅ | File path within repository |

### Example Request

```
GET /api/repo/file?repoId=facebook/react&path=packages/react/index.js
```

### Success Response `200`

```json
{
  "content": "// file content here...",
  "issues": [
    { "type": "warning", "line": 42, "description": "Found console.log statement" },
    { "type": "info", "line": 1, "description": "Large file (> 500 lines)" },
    { "type": "error", "line": 88, "description": "Possible syntax error: '= ='" }
  ]
}
```

### Issue Types
| Type | Severity | Triggers |
|------|----------|---------|
| `"error"` | High | `= =` (likely typo) |
| `"warning"` | Medium | `console.log`, `TODO/FIXME` comments, possibly unused variables |
| `"info"` | Low | Large file (>500 lines), long function (>100 lines) |

---

## `GET /api/contributor-network`

Returns node/edge graph data for the contributor collaboration network. Nodes are contributors; edges connect contributors who modified the same files.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `repoId` | `string` | ✅ | Repository in `owner/repo` format |

### Success Response `200`

```json
{
  "nodes": [
    {
      "name": "Jane Doe",
      "login": "janedoe",
      "avatarUrl": "https://...",
      "commitCount": 42,
      "insertions": 1500,
      "deletions": 300,
      "firstCommit": "2024-01-01T00:00:00Z",
      "lastCommit": "2024-06-30T00:00:00Z",
      "files": ["src/App.tsx", "src/utils.ts"]
    }
  ],
  "edges": [
    {
      "source": "Jane Doe",
      "target": "John Smith",
      "sharedFiles": ["src/App.tsx"],
      "weight": 1
    }
  ],
  "topContributors": []
}
```

---

## `POST /api/generate-narrative`

Uses the Nebius AI (model: `moonshotai/Kimi-K2.5-fast`) to generate a cinematic narrative of the repository's history. **Requires `N_AI` env variable.**

### Request Body

```json
{
  "repoData": {
    "repoName": "my-project",
    "owner": "janedoe",
    "totalCommits": 150,
    "commits": []
  }
}
```

### Success Response `200`

```json
{
  "introduction": "A dramatic opening...",
  "majorEvents": [
    {
      "title": "Initial Launch",
      "description": "The project was born...",
      "date": "2024-01-01",
      "impact": "high"
    }
  ],
  "challenges": ["Managing code complexity"],
  "turningPoints": ["First public release"],
  "conclusion": "The project continues to evolve...",
  "summary": "A collaborative codebase...",
  "documentaryScript": "[Scene: A dark room] Narrator: ..."
}
```

---

## `POST /api/repo/chat-context`

Retrieves context from the database to be used in the AI chat endpoint. Performs keyword search over stored file contents.

### Request Body

```json
{
  "repoId": "owner/repo",
  "question": "How does the authentication work?"
}
```

### Success Response `200`

```json
{
  "repoId": "owner/repo",
  "fileTree": ["src/App.tsx", "src/index.ts"],
  "readme": "# Project README...",
  "packageJson": {},
  "coreFiles": [],
  "relevantFiles": [
    { "path": "src/auth.ts", "content": "..." }
  ]
}
```

---

## `POST /api/repo/chat-answer`

Sends the context and question to AI to generate an answer. **Requires `N_AI` env variable.**

### Request Body

```json
{
  "context": {},
  "question": "How does authentication work?",
  "mode": "technical"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `context` | `object` | — | Output from `/api/repo/chat-context` |
| `question` | `string` | — | User's question |
| `mode` | `string` | `"beginner"` \| `"technical"` | Response complexity level |

### Success Response `200`

```json
{
  "answer": "The authentication system works by..."
}
```

---

## `POST /api/save-narrative`

Persists a narrative object in the SQLite database for the given repo.

### Request Body

```json
{
  "repoId": "owner/repo",
  "narrative": {}
}
```

### Success Response `200`

```json
{ "success": true }
```

---

## `GET /api/repo/diff`

Returns the patch/diff for a specific commit. Optionally filter by file path.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `repoId` | `string` | ✅ | `owner/repo` |
| `sha` | `string` | ✅ | Commit SHA |
| `path` | `string` | — | Filter to a specific file |

### Success Response (all files) `200`

```json
{
  "files": [
    {
      "filename": "src/App.tsx",
      "patch": "@@ -1,5 +1,7 @@...",
      "status": "modified",
      "additions": 12,
      "deletions": 3
    }
  ]
}
```

### Success Response (single file) `200`

```json
{
  "patch": "@@ -1,5 +1,7 @@..."
}
```

---

## `GET /api/repo/blame`

Returns line-by-line blame information for a file. Uses GitHub GraphQL API (with REST fallback).

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `repoId` | `string` | ✅ | `owner/repo` |
| `path` | `string` | ✅ | File path |
| `branch` | `string` | — | Branch name (default: `main`) |

### Success Response `200`

```json
{
  "lines": [
    {
      "lineNum": 1,
      "content": "import React from 'react';",
      "commit": {
        "sha": "abc123",
        "author": "Jane Doe",
        "date": "2024-03-10T12:00:00Z",
        "avatar": "https://..."
      }
    }
  ]
}
```

### Fallback Response (if GraphQL unavailable) `200`

```json
{
  "history": [
    {
      "sha": "abc123",
      "author": "Jane Doe",
      "date": "2024-03-10T12:00:00Z",
      "message": "Initial commit",
      "avatar": "https://..."
    }
  ]
}
```

---

## `GET /api/repo/branches`

Returns branch data along with merge commit information and repo stats.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `repoId` | `string` | ✅ | `owner/repo` |

### Success Response `200`

```json
{
  "branches": [
    {
      "name": "main",
      "commit": "sha...",
      "protected": true,
      "color": "hsl(0, 70%, 50%)"
    }
  ],
  "commits": [],
  "merges": [
    {
      "sha": "abc123",
      "parents": ["def456", "ghi789"],
      "message": "Merge pull request #42",
      "author": "Jane Doe",
      "date": "2024-03-01T00:00:00Z"
    }
  ],
  "stats": {
    "branchCount": 3,
    "mergeCount": 5,
    "openPRs": 2,
    "contributors": 4
  }
}
```

---

## Caching Strategy

All repository data is cached in the local SQLite database (`git_insight.db`).

| Table | Key | Purpose |
|-------|-----|---------|
| `repositories` | `owner/repo` | Commit data, metrics, narrative |
| `files` | `(repo_id, path)` | File contents for blame/code view |

> **Note:** To force a fresh analysis, delete the `git_insight.db` file and re-run the app.

---

## Rate Limits

| Scenario | Limit |
|----------|-------|
| Without GitHub Token | 60 requests/hour (GitHub unauthenticated) |
| With GitHub Token | 5,000 requests/hour |
| Nebius AI (N_AI) | Per your subscription plan |
