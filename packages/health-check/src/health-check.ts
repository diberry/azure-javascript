import RepoDataCollector from './github/github-repo.js';
import ReportGenerator from './reports/report-generator.js';
import { getAuthToken } from './auth/get-auth-token.js';
import { printEnv } from './utils/print-env.js';
import { RepoData } from './models.js';
import { getConfigData } from './init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from './utils/regex.js';
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
  try {
    // Initialize data collector
    const collector = new RepoDataCollector(token);

    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    const repos: SimpleRepository[] = extractOrgAndRepo(
      configData.microsoftRepos
    );
    console.log(`Extract org and repo data ...`);

    // Collect data for each repository
    const repoDataList: RepoData[] = [];
    for (const repo of repos) {
      //console.log(JSON.stringify(repo));

      // Using a simple object with required properties
      // This is sufficient for collectRepoData's needs
      console.log(`Run ${repo.org}/${repo.repo}...`);
      const repoData = await collector.collectRepoData({
        org: repo.org,
        repo: repo.repo,
      });
      repoDataList.push({ ...repoData });
    }

    // Generate report
    const markdown =
      ReportGenerator.generateHealthCheckMarkdownReport(repoDataList);

    // Save report
    ReportGenerator.saveReport(
      markdown,
      configData.generatedDirectoryName + '/health.md'
    );

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
