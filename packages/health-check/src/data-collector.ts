import { Octokit } from "octokit";
import { Repository } from "./models.js";

export default class RepoDataCollector {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async collectRepoData(repo: Repository): Promise<{
    issuesCount: string;
    prsCount: string;
    stars: number;
    forks: number;
    watchers: number;
    lastCommitDate: string;
    lastCommitterLogin: string;
    lastCommitterAvatar: string;
    lastCommitterUrl: string;
    securityNotices: string;
    hasVulnerabilities: boolean;
    dependabotEnabled: boolean;
    codeScanning: boolean;
  }> {
    // Get repository information
    let stars = 0,
      forks = 0,
      watchers = 0;
    try {
      const repoInfo = await this.octokit.rest.repos.get({
        owner: repo.org,
        repo: repo.repo,
      });

      stars = repoInfo.data.stargazers_count;
      forks = repoInfo.data.forks_count;
      watchers = repoInfo.data.subscribers_count;
    } catch (error) {
      console.error(
        `Error fetching repository info for ${repo.org}/${repo.repo}: ${error}`,
      );
    }

    // Get issues count
    let issuesCount = "0";
    try {
      const issuesData = await this.octokit.rest.issues.listForRepo({
        owner: repo.org,
        repo: repo.repo,
        state: "open",
        per_page: 1,
      });
      issuesCount = issuesData.data.length.toString();
    } catch (error) {
      console.error(
        `Error fetching issues for ${repo.org}/${repo.repo}: ${error}`,
      );
      issuesCount = "request error";
    }

    // Get PRs count
    let prsCount = "0";
    try {
      const prsData = await this.octokit.rest.pulls.list({
        owner: repo.org,
        repo: repo.repo,
        state: "open",
        per_page: 1,
      });
      prsCount = prsData.data.length.toString();
    } catch (error) {
      console.error(
        `Error fetching PRs for ${repo.org}/${repo.repo}: ${error}`,
      );
      prsCount = "request error";
    }

    // Get last commit date and committer information
    let lastCommitDate = "N/A";
    let lastCommitterLogin = "";
    let lastCommitterAvatar = "";
    let lastCommitterUrl = "";

    try {
      const commitsData = await this.octokit.rest.repos.listCommits({
        owner: repo.org,
        repo: repo.repo,
        per_page: 1,
      });

      if (commitsData.data.length > 0) {
        const lastCommit = commitsData.data[0];

        // Get commit date
        lastCommitDate = new Date(lastCommit.commit.committer?.date || "")
          .toISOString()
          .split("T")[0];

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
    } catch (error) {
      console.error(
        `Error fetching commits for ${repo.org}/${repo.repo}: ${error}`,
      );
      lastCommitDate = "request error";
    }

    // Check for security vulnerabilities (requires 'security_events' permission)
    let securityNotices = "none";
    let hasVulnerabilities = false;
    try {
      // The correct API endpoint is dependabot.listAlertsForRepo
      const vulnerabilityAlertsData =
        await this.octokit.rest.dependabot.listAlertsForRepo({
          owner: repo.org,
          repo: repo.repo,
          per_page: 10,
          state: "open",
        });

      if (vulnerabilityAlertsData.data.length > 0) {
        hasVulnerabilities = true;
        securityNotices = `${vulnerabilityAlertsData.data.length} vulnerabilities`;
      }
    } catch (error) {
      console.error(
        `Error checking security vulnerabilities for ${repo.org}/${repo.repo}: ${error}`,
      );
      securityNotices = "cannot access";
    }

    // Check if Dependabot is enabled
    let dependabotEnabled = false;
    try {
      // Check for .github/dependabot.yml file
      await this.octokit.rest.repos.getContent({
        owner: repo.org,
        repo: repo.repo,
        path: ".github/dependabot.yml",
      });
      dependabotEnabled = true;
    } catch (error) {
      // Try .yaml extension
      try {
        await this.octokit.rest.repos.getContent({
          owner: repo.org,
          repo: repo.repo,
          path: ".github/dependabot.yaml",
        });
        dependabotEnabled = true;
      } catch (innerError) {
        // Dependabot config not found
      }
    }

    // Check if code scanning is enabled
    let codeScanning = false;
    try {
      const workflows = await this.octokit.rest.actions.listRepoWorkflows({
        owner: repo.org,
        repo: repo.repo,
      });

      // Check if any workflow contains CodeQL or code scanning
      codeScanning = workflows.data.workflows.some(
        (workflow) =>
          workflow.name.toLowerCase().includes("codeql") ||
          workflow.name.toLowerCase().includes("code-scanning") ||
          workflow.name.toLowerCase().includes("code scanning"),
      );
    } catch (error) {
      console.error(
        `Error checking code scanning for ${repo.org}/${repo.repo}: ${error}`,
      );
    }

    return {
      issuesCount,
      prsCount,
      stars,
      forks,
      watchers,
      lastCommitDate,
      lastCommitterLogin,
      lastCommitterAvatar,
      lastCommitterUrl,
      securityNotices,
      hasVulnerabilities,
      dependabotEnabled,
      codeScanning,
    };
  }
}
