
export interface RepoNarrative {
  introduction: string;
  majorEvents: {
    title: string;
    description: string;
    date: string;
    impact: "high" | "medium" | "low";
  }[];
  challenges: string[];
  turningPoints: string[];
  conclusion: string;
  summary: string;
  documentaryScript: string;
}

export async function generateProjectSummary(repoData: any): Promise<any> {
  // Local implementation without API
  const mainFeatures = [];
  if (repoData.packageJson?.dependencies) {
    const deps = Object.keys(repoData.packageJson.dependencies);
    if (deps.includes('react')) mainFeatures.push("Built with React for a modern UI");
    if (deps.includes('express')) mainFeatures.push("Powered by Express backend");
    if (deps.includes('typescript')) mainFeatures.push("Fully typed with TypeScript");
  }
  
  if (mainFeatures.length === 0) {
    mainFeatures.push("Clean and organized codebase");
    mainFeatures.push("Version controlled with Git");
  }

  return {
    projectPurpose: `This is a ${repoData.repoName} project created by ${repoData.owner}.`,
    expectedOutput: "A functional software application or library.",
    howToRun: "Check the README.md for specific installation and run instructions.",
    mainFeatures: mainFeatures.slice(0, 5)
  };
}

export async function chatWithRepo(context: any, question: string, mode: 'beginner' | 'technical'): Promise<string> {
  // Local implementation without API
  const q = question.toLowerCase();
  
  if (q.includes("what") && q.includes("do")) {
    return "This project appears to be a software repository. Based on the file structure, it contains various source files and configuration.";
  }
  
  if (q.includes("run") || q.includes("install")) {
    return "To run this project, you should typically look for a `README.md` file or check the `package.json` for scripts like `npm start` or `npm install`.";
  }

  if (q.includes("tech") || q.includes("library") || q.includes("framework")) {
    const deps = context.packageJson?.dependencies ? Object.keys(context.packageJson.dependencies).join(", ") : "none detected";
    return `This project uses the following technologies: ${deps}.`;
  }

  return "I am currently in offline mode and can only answer basic questions about the repository structure and technologies. Please check the README for more details.";
}

export async function generateRepoNarrative(repoData: any): Promise<RepoNarrative> {
  // Local implementation without API
  const commitCount = repoData.totalCommits;
  const contributorCount = repoData.contributors.length;
  
  const intro = `The story of ${repoData.repoName} began with a vision by ${repoData.owner}. Over time, it grew into a codebase with ${commitCount} commits.`;
  
  const turningPoints = [
    "The initial commit laid the foundation.",
    `The project reached a milestone with ${contributorCount} contributors joining the effort.`,
    "Major features were integrated, shaping the project's identity."
  ];

  const challenges = [
    "Managing code complexity as the project expanded.",
    "Ensuring stability across different development phases.",
    "Coordinating contributions from multiple developers."
  ];

  const majorEvents = repoData.commits.slice(0, 5).map((c: any) => ({
    title: c.message.split('\n')[0].substring(0, 40),
    description: `A significant update by ${c.author} that moved the project forward.`,
    date: new Date(c.date).toLocaleDateString(),
    impact: c.filesChanged > 5 ? "high" : "medium"
  }));

  return {
    introduction: intro,
    majorEvents,
    challenges,
    turningPoints,
    conclusion: "The project continues to evolve, driven by its community and the dedication of its creators.",
    summary: `${repoData.repoName} is a testament to collaborative coding and iterative improvement.`,
    documentaryScript: `[Scene: A dark room with a glowing screen]\nNarrator: In the vast world of open source, a new project emerged: ${repoData.repoName}...`
  };
}
