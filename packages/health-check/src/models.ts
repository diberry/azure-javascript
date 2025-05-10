// Define types for GitHub repository data
import { Endpoints } from '@octokit/types';

// Import types directly from Endpoints
type OctokitRepo = Endpoints['GET /repos/{owner}/{repo}']['response']['data'];
type OctokitSearchRepo =
  Endpoints['GET /search/repositories']['response']['data']['items'][0];
type OctokitGetRepoParams =
  Endpoints['GET /repos/{owner}/{repo}']['parameters'];
export type PrSearchItem =
  Endpoints['GET /search/issues']['response']['data']['items'][0];

// Only define types that are not already in models.ts
export type IssueType = 'open' | 'closed' | 'all' | undefined;
export type RepoSearchSort =
  | 'stars'
  | 'forks'
  | 'help-wanted-issues'
  | 'updated'
  | undefined;
export type RepoSearchOrder = 'desc' | 'asc' | undefined;
export type PRSearchSort =
  | 'updated'
  | 'created'
  | 'comments'
  | 'reactions'
  | 'reactions-+1'
  | 'reactions--1'
  | 'reactions-smile'
  | 'reactions-thinking_face'
  | 'reactions-heart'
  | 'reactions-tada'
  | 'interactions'
  | undefined;

// Common GitHub repository interface extending Octokit's repository type
export interface RepositoryItemExtened extends Partial<OctokitSearchRepo> {
  org: string;
  repo: string;
  full_name?: string; // Ensuring full_name is defined, common in both interfaces
  last_commit_date?: string;
  // Extended properties we add in our app that aren't in Octokit's types
  issues?: number;
  prsCount?: number;
  securityNotices?: number;
  hasVulnerabilities?: boolean;
  dependabotAlerts?: number;
  codeScanning?: boolean;
}

export interface SimpleRepositoryError {
  org: string;
  repo: string;
  found: boolean;
  error: string;
}

// Type for repo data we collect and analyze
// This is more specialized for our application's needs
export interface RepoData {
  // Common properties with Repository
  name?: string; // Adding name for report generator
  org?: string; // Adding org for report generator
  repo?: string; // Adding repo for report generator
  full_name?: string; // Adding full_name for consistent access

  // Application specific properties
  description: string;
  issues: number;
  prsCount: number;
  stars: number;
  forks: number;
  watchers: number;
  lastCommitDate: string;
  lastCommitterLogin: string;
  lastCommitterAvatar: string;
  lastCommitterUrl: string;
  securityNotices: number;
  hasVulnerabilities: boolean;
  dependabotAlerts: number;
  codeScanning: boolean;
  topics: string[];
}

// Replace custom GetRepoParams with Octokit's type
export type GetRepoParams = OctokitGetRepoParams;

// Export useful Octokit types to be used throughout the application
export type Repository = OctokitRepo;
//export type SearchRepositoryItem = OctokitSearchRepo;
export type SearchRepositoryItem =
  Endpoints['GET /search/repositories']['response']['data']['items'][0];
export type Issue =
  Endpoints['GET /repos/{owner}/{repo}/issues']['response']['data'][0];
export type PullRequest =
  Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0];
export type Commit =
  Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data'][0];
export type DependabotAlert =
  Endpoints['GET /repos/{owner}/{repo}/dependabot/alerts']['response']['data'][0];
export type Workflow =
  Endpoints['GET /repos/{owner}/{repo}/actions/workflows']['response']['data']['workflows'][0];

export interface GitHubApiError {
  status?: number;
  message?: string;
  headers?: {
    'x-ratelimit-reset'?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
