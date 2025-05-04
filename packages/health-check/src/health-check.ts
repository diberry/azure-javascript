import { promises as fs } from 'fs';
import * as path from 'path';
import RepoDataCollector from './github/github-repo-data-collector.js';
import ReportGenerator from './reports/report-generator.js';
import { extractRepositoriesFromReadme } from './utils/regex.js';
import { getAuthToken } from './auth/get-auth-token.js';
import { printEnv } from './utils/print-env.js';
import { RepoData, Repository } from './models.js';
printEnv();

if (!process.env.GITHUB_TOKEN && !process.argv[2]) {
  throw new Error(
    'GitHub token is required. Set GITHUB_TOKEN environment variable or pass token as argument.'
  );
}

const token = getAuthToken(process.argv[2]);

if (!token) {
  console.error(
    'GitHub token not provided. Please set GITHUB_TOKEN environment variable or pass as first argument.'
  );
  process.exit(1);
}

async function run(token: string): Promise<void> {
  try {
    // Initialize data collector
    const collector = new RepoDataCollector(token);

    // Read README.md
    const readmePath: string = path.join(process.cwd(), '../../README.md');
    console.log(`Reading README.md from ${readmePath}`);
    const readmeContent: string = await fs.readFile(readmePath, 'utf8');
    console.log(`Read ${readmeContent.length} characters from README.md`);

    // Extract repositories
    const repos: Repository[] = extractRepositoriesFromReadme(readmeContent);
    console.log(`Found ${repos.length} repositories in README.md`);

    // Collect data for each repository
    const repoDataList: RepoData[] = [];
    for (const repo of repos) {
      console.log(`Processing ${repo.org}/${repo.repo}...`);
      const repoData = await collector.collectRepoData(repo);
      repoDataList.push({ ...repo, ...repoData });
    }

    // Generate report
    const markdown = ReportGenerator.generateMarkdownReport(repoDataList);

    // Save report
    ReportGenerator.saveReport(markdown, '../../health-check-report.md');

    if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
      console.log('\n--- Report Markdown ---\n');
      console.log(markdown);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run(token).catch(error => {
  console.error('Error running health check:', error);
  process.exit(1);
});
