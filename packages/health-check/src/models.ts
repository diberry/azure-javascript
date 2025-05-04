export interface Repository {
  name: string;
  org: string;
  repo: string;
}

export interface SuggestedRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  updatedAt: string;
  topics: string[];
  isArchived: boolean; // Added property
  lastCommitDate: string; // Added property
}

// Repository owner information
export interface GitHubOwner {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  type?: 'User' | 'Organization';
  site_admin: boolean;
  name?: string | null;
  email?: string | null;
}

// Permission levels for a repository
export interface GitHubPermissions {
  admin: boolean;
  maintain?: boolean;
  push: boolean;
  triage?: boolean;
  pull: boolean;
}

// Repository license information
export interface GitHubLicense {
  key: string;
  name: string;
  spdx_id: string;
  url: string;
  node_id: string;
}

// Repository item returned from search
export interface GitHubRepoSearchItem {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: GitHubOwner | null; // Making owner nullable
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  master_branch?: string;
  default_branch: string;
  score: number;
  archived: boolean;
  disabled: boolean;
  visibility?: 'public' | 'private';
  topics: string[];
  license?: GitHubLicense | null;
  permissions?: GitHubPermissions;
  allow_forking?: boolean;
  is_template?: boolean;
  web_commit_signoff_required?: boolean;
}

// Complete search response structure
export interface GitHubRepoSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepoSearchItem[];
}

// Type for the octokit.rest.search.repos response
// Use a simpler type definition that will work with what Octokit actually returns
export type GitHubRepoSearchResult = {
  data: GitHubRepoSearchResponse;
  status: number;
  url: string;
  headers: Record<string, string>;
};

export interface RepoWithDescription extends Repository {
  description: string;
  stars: number;
  watchers: number;
  lastCommitDate: string;
  topics: string[];
}

export interface RepoData extends Repository {
  description?: string;
  issuesCount?: string;
  prsCount?: string;
  stars?: number;
  forks?: number;
  watchers?: number;
  lastCommitDate?: string;
  lastCommitterLogin?: string;
  lastCommitterAvatar?: string;
  lastCommitterUrl?: string;
  securityNotices?: string;
  hasVulnerabilities?: boolean;
  dependabotEnabled?: boolean;
  codeScanning?: boolean;
  topics?: string[];
}
