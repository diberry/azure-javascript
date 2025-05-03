export interface Repository {
  name: string;
  org: string;
  repo: string;
}

export interface RepoData {
  issuesCount: string;
  prsCount: string;
  stars: number;
  forks: number;
  watchers: number;
  lastCommitDate: string;
  securityNotices: string;
  hasVulnerabilities: boolean;
  dependabotEnabled: boolean;
  codeScanning: boolean;
}
