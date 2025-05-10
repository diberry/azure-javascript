import { promises as fs } from 'fs';
import * as path from 'path';
import RepoDataCollector from './github/github-repo.js';
import { getAuthToken } from './auth/get-auth-token.js';
import { printEnv } from './utils/print-env.js';
import { RepoData } from './models.js';
import ReportGenerator from './reports/report-generator.js';
import { extractOrgAndRepo } from './utils/regex.js';

printEnv();

// Check for GitHub token
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

    const dataFile = process.env.DATA_FILE || 'microsoft-repos.json';

    // Read microsoft-repos.json
    const reposJsonPath: string = path.join(process.cwd(), '../../', dataFile);
    console.log(`Reading JSON list from ${reposJsonPath}`);
    const reposContent: string = await fs.readFile(reposJsonPath, 'utf8');
    console.log(`Read ${reposContent.length} characters from `, dataFile);

    // Extract repositories
    const reposJson = JSON.parse(reposContent);
    console.log(`Found ${reposJson.length} repositories in `, dataFile);
    const repos: Array<{ org: string; repo: string }> =
      extractOrgAndRepo(reposJson);

    // Collect data for each repository using the enhanced collectRepoData
    const reposWithData: RepoData[] = [];
    for (const repoItem of repos) {
      console.log(`Collect repo data ${repoItem.org}/${repoItem.repo}...`);

      // Use collectRepoData to get all repository information at once
      const repoData = await collector.collectRepoData(repoItem);

      // We have all the data we need from collectRepoData - no need to cherry pick
      reposWithData.push(repoData);
    }

    // Generate new README content
    const newReadmeContent = ReportGenerator.generateReadme(reposWithData);

    // Save the new README
    const newReadmePath = path.join(process.cwd(), '../../', 'README.new.md');
    await fs.writeFile(newReadmePath, newReadmeContent);
    console.log(`New README.md generated at ${newReadmePath}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run(token).catch(error => {
  console.error('Error generating README:', error);
  process.exit(1);
});
