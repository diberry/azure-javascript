import {
  Commit,
  RepoData,
  Repository,
  SearchRepositoryItem,
  SimpleRepositoryError,
} from '../models.js';

import GitHubRequestor, { isRepositoryError } from './github.js';

export default class RepoDataCollector {
  private requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  async collectRepoData(repo: {
    org: string;
    repo: string;
  }): Promise<RepoData> {
    // Get repository information
    let stars = 0,
      forks = 0,
      watchers = 0;
    let description = '';

    const retrievedRepo: Repository | SimpleRepositoryError =
      await this.requestor.getRepo(repo.org, repo.repo);

    // TypeGuard: if SimpleRepositoryError, return empty object
    if (isRepositoryError(retrievedRepo)) {
      console.error(
        `Repository ${repo.org}/${repo.repo} not found. Error: ${retrievedRepo.error}`
      );
      return {
        name: repo.repo,
        org: repo.org,
        repo: repo.repo,
        full_name: `${repo.org}/${repo.repo}`,
        description: '',
        issues: 0,
        prsCount: 0,
        stars: 0,
        forks: 0,
        watchers: 0,
        lastCommitDate: '',
        lastCommitterLogin: '',
        lastCommitterAvatar: '',
        lastCommitterUrl: '',
        securityNotices: 0,
        hasVulnerabilities: false,
        dependabotAlerts: 0,
        codeScanning: false,
        topics: [],
      };
    }

    // Get stars, forks, watchers and description from the repository data
    stars = retrievedRepo.stargazers_count || 0;
    forks = retrievedRepo.forks_count || 0;
    watchers = retrievedRepo.watchers_count || 0;
    description = retrievedRepo.description || '';

    // Get issues - now returning the full issues array
    const issues = await this.requestor.getIssues(repo.org, repo.repo);
    const topics = await this.requestor.getRepoTopics(repo.org, repo.repo);
    const prs = await this.requestor.getPullRequests(repo.org, repo.repo);

    // Get last commit date and committer information
    let lastCommit = {} as Commit;
    let lastCommitDate = '';
    let lastCommitterLogin = '';
    let lastCommitterAvatar = '';
    let lastCommitterUrl = '';

    const commits = await this.requestor.getCommits(repo.org, repo.repo);

    if (commits.length === 0) {
      console.log(`No commits found for ${repo.org}/${repo.repo}`);
    } else {
      lastCommit = commits[0];
      lastCommitDate = new Date(
        lastCommit.commit.committer?.date || ''
      ).toISOString();

      // Get committer information if available
      // GitHub API might return null for author if the commit email doesn't match a GitHub account
      if (lastCommit.author) {
        lastCommitterLogin = lastCommit.author.login;
        lastCommitterAvatar = lastCommit.author.avatar_url;
        lastCommitterUrl = lastCommit.author.html_url;
      } else if (lastCommit.committer) {
        // Fallback to committer if author is not available
        lastCommitterLogin = lastCommit.committer.login;
        lastCommitterAvatar = lastCommit.committer.avatar_url;
        lastCommitterUrl = lastCommit.committer.html_url;
      }
    }

    // Check for security vulnerabilities (requires 'security_events' permission)
    let dependabotAlerts = await this.requestor.getDependabotAlerts(
      repo.org,
      repo.repo
    );
    const securityNotices = dependabotAlerts.filter(
      alert => alert.state === 'open' || alert.state === 'dismissed'
    );
    const hasVulnerabilities = securityNotices.length > 0;

    // Check if code scanning is enabled
    let codeScanning = false;

    let workflows = await this.requestor.getRepoWorkflows(repo.org, repo.repo);
    if (workflows.length > 0) {
      // Check if any workflow contains CodeQL or code scanning
      codeScanning = workflows.some(
        workflow =>
          workflow.name.toLowerCase().includes('codeql') ||
          workflow.name.toLowerCase().includes('code-scanning') ||
          workflow.name.toLowerCase().includes('code scanning')
      );
    }
    // Create the full repository information with the required properties needed by report generators
    return {
      name: retrievedRepo.name,
      org: repo.org,
      repo: repo.repo,
      full_name: `${repo.org}/${repo.repo}`,
      description,
      issues: issues.length,
      prsCount: prs.length,
      stars,
      forks,
      watchers,
      lastCommitDate,
      lastCommitterLogin,
      lastCommitterAvatar,
      lastCommitterUrl,
      securityNotices: securityNotices.length,
      hasVulnerabilities: hasVulnerabilities,
      dependabotAlerts: dependabotAlerts.length,
      codeScanning,
      topics,
    };
  }

  async searchRepo(
    query: string,
    limit: number
  ): Promise<SearchRepositoryItem[]> {
    try {
      // Removed unused includeArchived parameter
      const response = await this.requestor.getSearchRepository(
        query,
        limit,
        'updated',
        'desc'
      );
      return response;
    } catch (error) {
      console.error(`Error searching repository: ${error}`);
      throw error;
    }
  }
}
