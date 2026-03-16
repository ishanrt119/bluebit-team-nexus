# 📦 GitInsight AI — Installation Guide

> A step-by-step guide to set up and run GitInsight AI locally.

---

## Prerequisites

Before you begin, ensure the following tools are installed on your machine:

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Node.js** | v18+ | Runtime for server and build tooling |
| **npm** | v9+ | Package manager |
| **Git** | v2.30+ | Version control |

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/ishanrt119/bluebit-team-nexus.git
cd bluebit-team-nexus
```

---

## Step 2 — Install Dependencies

Install all Node.js dependencies (frontend + backend):

```bash
npm install
```

> This installs everything listed in `package.json`, including React, Express, D3, Recharts, Octokit, and more.

---

## Step 3 — Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in the required values:

```env
# Required: GitHub Personal Access Token
# Scopes needed: repo (for private) or public_repo (for public repos)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Optional: Nebius AI API key for AI narrative generation
# Without this, the app uses local fallback logic
N_AI=your_nebius_api_key_here

# Optional: Application base URL (useful for production deployments)
APP_URL=http://localhost:3000
```

### Getting a GitHub Token

1. Go to [github.com → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes: `repo` (for private repos) or `public_repo` (public only)
4. Copy the generated token into `GITHUB_TOKEN`

### Getting a Nebius AI Key (Optional)

The Nebius AI key (`N_AI`) enables the AI-powered **Cinematic Narrative** and **Repository Assistant** features.

1. Sign up at [nebius.com](https://nebius.com)
2. Navigate to API Keys and generate a key
3. Add it to your `.env` as `N_AI`

> **Without `N_AI`:** The app operates fully in offline mode. All visualizations work; only AI narrative/chat will use built-in local fallback logic.

---

## Step 4 — Run the Application

Start the development server (both frontend and backend together):

```bash
npm run dev
```

The app will be available at:

```
http://localhost:3000
```

The server logs will confirm startup:

```
Server running on http://localhost:3000
```

---

## Step 5 — Using the App

1. Open `http://localhost:3000` in your browser
2. Enter a **public GitHub repository URL**, e.g.:
   ```
   https://github.com/facebook/react
   ```
3. Click **Analyze** — the app fetches and processes commit data
4. Explore the dashboard tabs:
   - 📊 **Overview** — metrics, contributors, commit timeline
   - 🌳 **Branch Tree** — visual git branch graph
   - 🕸 **Contributor Network** — collaboration force graph
   - 🎬 **Cinematic Timeline** — animated repository story
   - 💻 **Code Health** — static analysis per file
   - 👤 **Blame Viewer** — line-by-line commit attribution
   - 🤖 **Repository Assistant** — AI-powered Q&A

---

## Production Build (Optional)

To build a production-optimized bundle:

```bash
npm run build
```

Set `NODE_ENV=production` and run:

```bash
NODE_ENV=production npm run dev
```

The server will serve the static `dist/` folder instead of using Vite's dev middleware.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Error: GitHub API rate limit exceeded` | Ensure `GITHUB_TOKEN` is set in `.env` |
| `Repository does not exist or is private` | Use a public repository, or add appropriate token scopes |
| `AI not configured on server` | Add `N_AI` key to `.env` for AI features |
| Port 3000 already in use | Kill the process using port 3000 or set a different `PORT` env variable |
| SQLite database locked | Delete `git_insight.db` and restart — it will be recreated |

---

## Project Structure (Reference)

```
bluebit-team-nexus/
├── server.ts           # Express backend + API routes
├── src/
│   ├── App.tsx          # Main React application
│   ├── main.tsx         # React entry point
│   ├── index.css        # Global styles
│   ├── components/      # 20 UI components (charts, viewers, etc.)
│   ├── services/
│   │   └── ai.ts        # AI service layer (narrative + chat)
│   └── lib/
│       ├── insights.ts  # Metric interpretation logic
│       ├── detector.ts  # Language detection
│       └── utils.ts     # Shared utilities
├── index.html           # HTML entry point
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies & scripts
├── .env.example         # Environment variable template
└── git_insight.db       # SQLite cache (auto-created)
```
