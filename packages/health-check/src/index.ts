import * as fs from "fs";
import * as path from "path";
import RepoDataCollector from "./data-collector.js";
import ReportGenerator from "./report-generator.js";
import { extractRepositoriesFromReadme } from "./find-repos.js";

// Print environment variables in alphabetical order
const envVars: Record<string, string> = Object.keys(process.env)
  .sort()
  .reduce((output: Record<string, string>, key: string) => {
    if (process.env[key] !== undefined) {
      output[key] = process.env[key] as string;
    }
    return output;
  }, {});

console.log("Environment variables (alphabetical order):");
console.log(JSON.stringify(envVars, null, 2));

const token: string = process.argv[2] || process.env.GITHUB_TOKEN || "";

if (!token) {
  console.error(
    "GitHub token not provided. Please set GITHUB_TOKEN environment variable or pass as first argument.",
  );
  process.exit(1);
}

async function run(token: string): Promise<void> {
  try {
    // Initialize data collector
    const collector = new RepoDataCollector(token);

    // Read README.md
    const readmePath: string = path.join(process.cwd(), "../../README.md");
    console.log(`Reading README.md from ${readmePath}`);
    const readmeContent: string = fs.readFileSync(readmePath, "utf8");

    // Extract repositories
    const repos = extractRepositoriesFromReadme(readmeContent);
    console.log(`Found ${repos.length} repositories in README.md`);

    // Collect data for each repository
    const repoDataList = [];
    for (const repo of repos) {
      console.log(`Processing ${repo.org}/${repo.repo}...`);
      const repoData = await collector.collectRepoData(repo);
      repoDataList.push({ ...repo, ...repoData });
    }

    // Generate report
    const markdown = ReportGenerator.generateMarkdownReport(repoDataList);

    // Save report
    ReportGenerator.saveReport(markdown, "../../health-check-report.md");

    if (process.argv.includes("--print") || !process.env.GITHUB_ACTIONS) {
      console.log("\n--- Report Markdown ---\n");
      console.log(markdown);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (!process.env.GITHUB_TOKEN && !process.argv[2]) {
  throw new Error(
    "GitHub token is required. Set GITHUB_TOKEN environment variable or pass token as argument.",
  );
}

run(token);
