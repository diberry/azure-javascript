import { RepositoryItemExtened } from './models.js';
import ReportGenerator from './reports/report-generator.js';
import { printEnv } from './utils/print-env.js';
import { getAuthToken } from './auth/get-auth-token.js';
import GitHubSearcher from './github/github-search.js';
import { getConfigData } from './init/initialize-with-data.js';
import { getDateMonthsAgo } from './utils/dates.js';
import path from 'path';

printEnv();

import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DATA_DIRECTORY || '../../../data';
const generatedDir = process.env.GENERATED_DIRECTORY || '../../../generated';

const dataDirectory = path.join(__dirname, dataDir);
const generatedDirectory = path.join(__dirname, generatedDir);

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
  console.log('🔍 Searching for Azure JavaScript & TypeScript repositories...');
  // Initialize data collector
  const collector = new GitHubSearcher(token);

  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }

  // Search for JavaScript repos
  const repos: RepositoryItemExtened[] = await collector.searchOrgRepositories(
    configData.microsoftOrgs,
    configData.microsoftLanguages,
    [], //configData.microsoftTopics,
    getDateMonthsAgo(1),
    false
  );

  // Generate report
  console.log(`\n📊 Found ${repos.length} total repositories`);

  // Sort by stars - add null checking to handle undefined values
  repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

  // Create markdown report - fix the method name spelling
  const mdReport = ReportGenerator.generateSuggestedReposMarkdownReport(repos);

  // Write to file
  ReportGenerator.saveReport(
    mdReport,
    configData.generatedDirectoryName + '/suggested_repos.md'
  );
}

// Execute the main function
run(token).catch(error => {
  console.error('Error running suggestions:', error);
  process.exit(1);
});
