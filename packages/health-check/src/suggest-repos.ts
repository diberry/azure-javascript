import { promises as fs } from 'fs';
import path from 'path';
import { RepositoryItemExtened } from './models.js';
import ReportGenerator from './reports/report-generator.js';
import { printEnv } from './utils/print-env.js';
import { getAuthToken } from './auth/get-auth-token.js';
import GitHubSearcher from './github/github-search.js';

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

async function findRepos(token: string): Promise<void> {
  console.log('🔍 Searching for Azure JavaScript & TypeScript repositories...');

  // Load organizations from github-orgs.json in the project root
  const orgsFilePath = path.resolve(process.cwd(), '../../github-orgs.json');
  console.log(`Loading GitHub organizations from: ${orgsFilePath}`);

  let orgs: string[];
  try {
    const orgsFileContent = await fs.readFile(orgsFilePath, 'utf-8');
    orgs = JSON.parse(orgsFileContent);
    console.log(`Loaded ${orgs.length} organizations: ${orgs.join(', ')}`);
  } catch (error) {
    console.error(
      `Error loading github-orgs.json: ${error instanceof Error ? error.message : String(error)}`
    );
    console.warn('Falling back to default organizations list');
    orgs = ['Azure-Samples'];
  }

  // Initialize data collector
  const collector = new GitHubSearcher(token);

  // Search for JavaScript repos
  const repos: RepositoryItemExtened[] =
    await collector.searchOrgRepositories();

  // Generate report
  console.log(`\n📊 Found ${repos.length} total repositories`);

  // Sort by stars
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  // Create markdown report
  const mdReport = ReportGenerator.generatSuggestedReposMarkdownReport(repos);

  // Write to file
  await fs.writeFile('../../suggested_repos_report.md', mdReport);
  console.log('✅ Report saved to suggested_repos_report.md');
}

// Execute the main function
findRepos(token).catch(error => {
  console.error(
    `Fatal error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
