import { Octokit } from 'octokit';

import {
  Commit,
  DependabotAlert,
  Issue,
  IssueType,
  PullRequest,
  RepoSearchOrder,
  PRSearchSort,
  RepoSearchSort,
  Repository,
  SearchRepositoryItem,
  Workflow,
  PrSearchItem,
  SimpleRepositoryError,
} from '../models.js';

// Alias for workflows response type that we didn't export from models.ts

// Alias for workflows response type that we didn't export from models.ts
export function isRepositoryError(
  repo: Repository | SimpleRepositoryError
): repo is SimpleRepositoryError {
  return 'error' in repo && 'found' in repo && repo.found === false;
}

export default class GitHubRequestor {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepo(
    org: string,
    repo: string
  ): Promise<Repository | SimpleRepositoryError> {
    try {
      console.log(`Fetching repository data for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.get({
        owner: org,
        repo: repo,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching repository data: ${error}`);
      return {
        found: false,
        org: org,
        repo: repo,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getSearchRepository(
    q: string = 'org:azure-samples',
    per_page: number = 5,
    sort: RepoSearchSort = 'updated',
    order: RepoSearchOrder = 'desc'
  ): Promise<SearchRepositoryItem[]> {
    try {
      const params = {
        q,
        sort: sort,
        order,
        per_page,
      };
      console.log(`Parameters: ${JSON.stringify(params)}`);

      const response = await this.octokit.rest.search.repos(params);
      console.log(`Found ${response.data.total_count} repositories`);

      return response.data.items;
    } catch (error) {
      console.error(`Error search repository: ${error}`);
      return [];
    }
  }

  async getRepoTopics(org: string, repo: string): Promise<string[]> {
    try {
      console.log(`Fetching repository topics for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.getAllTopics({
        owner: org,
        repo: repo,
      });
      return response.data.names || [];
    } catch (error) {
      console.error(`Error fetching repository topics: ${error}`);
      return [];
    }
  }

  // state: "open" | "closed" | "all"
  async getIssues(
    org: string,
    repo: string,
    state: IssueType = 'open',
    limit = 1
  ): Promise<Issue[]> {
    try {
      console.log(`Fetching issues for ${org}/${repo}`);
      const response = await this.octokit.rest.issues.listForRepo({
        owner: org,
        repo: repo,
        state: state,
        per_page: limit,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching issues: ${error}`);
      return [];
    }
  }

  async getPullRequests(
    org: string,
    repo: string,
    limit = 1
  ): Promise<PullRequest[]> {
    try {
      console.log(`Fetching pull requests for ${org}/${repo}`);
      const response = await this.octokit.rest.pulls.list({
        owner: org,
        repo: repo,
        state: 'open',
        per_page: limit,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching pull requests: ${error}`);
      return [];
    }
  }

  async searchPullRequests(
    query: string,
    page: number = 1,
    limit = 1,
    sort: PRSearchSort,
    order: RepoSearchOrder
  ): Promise<PrSearchItem[]> {
    try {
      console.log(`Searching pull requests for ${query}`);
      const response = await this.octokit.request('GET /search/issues', {
        q: query,
        sort: sort,
        order: order,
        per_page: limit,
        page: page,
      });
      return response.data.items;
    } catch (error) {
      console.error(`Error searching pull requests: ${error}`);
      return [];
    }
  }

  async getCommits(org: string, repo: string, limit = 1): Promise<Commit[]> {
    try {
      console.log(`Fetching commits for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.listCommits({
        owner: org,
        repo: repo,
        per_page: limit,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching commits: ${error}`);
      return [];
    }
  }

  async getDependabotAlerts(
    org: string,
    repo: string,
    state: IssueType = 'open',
    limit = 1
  ): Promise<DependabotAlert[]> {
    try {
      console.log(`Fetching dependabot alerts for ${org}/${repo}`);
      const response = await this.octokit.rest.dependabot.listAlertsForRepo({
        owner: org,
        repo: repo,
        per_page: limit,
        state: state,
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getRepoWorkflows(org: string, repo: string): Promise<Workflow[]> {
    try {
      console.log(`Fetching workflows for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.listRepoWorkflows({
        owner: org,
        repo: repo,
      });
      return response.data.workflows;
    } catch (error) {
      console.error(`Error fetching workflows: ${error}`);
      return [];
    }
  }
}
