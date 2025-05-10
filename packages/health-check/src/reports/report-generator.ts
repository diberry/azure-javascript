import { promises as fs } from 'fs';
import { RepositoryItemExtened, RepoData } from '../models.js';

export default class ReportGenerator {
  static async saveReport(markdown: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, markdown);
    console.log(`Health check report generated successfully to ${filePath}`);
  }

  static generateHealthCheckMarkdownReport(repoDataList: RepoData[]): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });

    let markdown: string = '# Repository Health Check Report\n\n';
    markdown += `*Generated on: ${formattedDate}*\n\n`;

    // Main repository stats table
    markdown += '## Repository Statistics\n\n';
    markdown +=
      '| Repository | Issues | PRs | Stars | Forks | Watchers | Last Commit | Last Committer |\n';
    markdown +=
      '|------------|--------|-----|-------|-------|----------|-------------|---------------|\n';

    for (const data of repoDataList) {
      // Using safe property access with fallback values
      const repoName =
        data.name ||
        data?.org + (data?.repo ?? '') ||
        data.full_name ||
        data.description.split(' ')[0] ||
        'Unknown';
      const org =
        data.org || data.topics.includes('microsoft') ? 'microsoft' : 'azure';
      const repo = data.repo || repoName.toLowerCase();

      const committerCell = data.lastCommitterLogin
        ? `[![${data.lastCommitterLogin}](${data.lastCommitterAvatar}&s=20)](${data.lastCommitterUrl})`
        : '';

      const lastCommitDate = data.lastCommitDate
        ? new Date(data.lastCommitDate).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : 'N/A or 404';

      markdown += `| [${repoName}](https://github.com/${org}/${repo}) | ${data.issues} | ${data.prsCount} | ${data.stars} | ${data.forks} | ${data.watchers} | ${lastCommitDate} | ${committerCell} |\n`;
    }

    // Security section
    markdown += '\n\n## Security Status\n\n';
    markdown +=
      '| Repository | Security Notices | Dependabot | Code Scanning | Status |\n';
    markdown +=
      '|------------|-----------------|-----------|--------------|--------|\n';

    for (const data of repoDataList) {
      // Using safe property access with fallback values
      const repoName = data.name || data.description.split(' ')[0] || 'Unknown';
      const org =
        data.org || data.topics.includes('microsoft') ? 'microsoft' : 'azure';
      const repo = data.repo || repoName.toLowerCase();

      const securityStatus = data.hasVulnerabilities
        ? '⚠️ Issues'
        : data.dependabotAlerts === 0 && !data.codeScanning
          ? '⚠️ No protections'
          : '✅ Good';

      const dependabotIcon = data.dependabotAlerts >= 0 ? '✅' : '❌';
      const codeScanningIcon = data.codeScanning ? '✅' : '❌';

      markdown += `| [${repoName}](https://github.com/${org}/${repo}) | ${data.securityNotices} | ${dependabotIcon} | ${codeScanningIcon} | ${securityStatus} |\n`;
    }

    return markdown;
  }

  static generateSuggestedReposMarkdownReport(
    repositories: RepositoryItemExtened[]
  ): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });
    let newReadmeReferences: string = '';

    let markdown = `# Suggested Azure JavaScript/TypeScript Repositories\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `Found ${repositories.length} repositories updated in the last 3 months.\n\n`;

    markdown += `## Top Repositories\n\n`;
    markdown += `| Repository | Description | Stars | Last Commit | Status | Topics |\n`;
    markdown += `| ---------- | ----------- | ----: | ----------- | :----: | ------ |\n`;

    // Display top 20 repos
    const topRepos = repositories.slice(0, 20);

    for (const repo of topRepos) {
      // Format topics
      const topics = repo?.topics?.join(', ') || '';

      // Status indicator (archived or active)
      const status = repo?.archived ? '📦 Archived' : '✅ Active';

      // Use HTML URL if available, otherwise construct one
      const repoUrl =
        repo.html_url || `https://github.com/${repo.org}/${repo.repo}`;

      // Add row to table
      markdown += `| [${repo.full_name}](${repoUrl}) | ${repo.description || ''} | ${repo.stargazers_count || 0} | ${repo.last_commit_date || 'N/A'} | ${status} | ${topics} |\n`;

      newReadmeReferences += `[${repo?.repo}]: https://github.com/${repo.org}/${repo.repo}\n`;
    }

    markdown += `\n## How to Add to README\n\n`;
    markdown += `To add any of these repositories to the main README.md, use the following markdown format:\n\n`;

    markdown += '```markdown\n';
    markdown +=
      '| [repo-name][repo-link] | [Service Name][service-doc-link] | ✅/- | ✅/- | ✅/- |\n\n';
    markdown += '<!-- Reference Links -->\n';
    markdown += '[repo-link]: https://github.com/org/repo-name\n';
    markdown +=
      '[service-doc-link]: https://learn.microsoft.com/azure/service-name/\n';
    markdown += '```\n';

    markdown += newReadmeReferences;

    return markdown;
  }

  static generateReadme(reposWithData: RepoData[]): string {
    let newReadme: string = '';
    let newReadmeReferences: string = '';

    // Add the table header with the new Topics column
    newReadme += '| Sample | Description | Topics | Stats |\n';
    newReadme += '| ------ | ----------- | ------ | ----- |\n';

    // Add each repository with its data
    for (const repo of reposWithData) {
      // Generate a display name from description if name is not available
      const repoName =
        repo?.name || repo?.description.split(' ')[0] || 'Unknown';
      const orgName = repo?.org || 'github'; // Default to 'github' if org not specified
      const repoSlug = repo?.repo || repoName.toLowerCase().replace(/\s/g, '-');

      // Format repository stats without using pipe characters
      const stats = `⭐ ${repo?.stars} <br> 👀 ${repo?.watchers} <br> 🔄 ${repo?.lastCommitDate}`;

      // Format topics as badges
      const topicsFormatted =
        Array.isArray(repo?.topics) && repo?.topics?.length > 0
          ? repo?.topics?.map(topic => `\`${topic}\``).join(' ')
          : '-';

      // Add the row to the table
      newReadme += `| [${repoName}][${repoName.toLowerCase().replace(/\s/g, '-')}] | ${repo?.description} | ${topicsFormatted} | ${stats} |\n`;

      newReadmeReferences += `[${repoName.toLowerCase().replace(/\s/g, '-')}]: ${'https://github.com/' + orgName + '/' + repoSlug}\n`;
    }
    return newReadme + `\n\n` + newReadmeReferences;
  }

  static generateCloudAdvocateActivityReport(
    reposWithContributions: RepositoryItemExtened[],
    advocateContributions: Map<string, Map<string, number>>
  ): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });

    let markdown = `# Cloud Advocate Sample Repository Activity\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This report shows Azure Cloud Advocate contributions to sample repositories over the last 30 days.\n\n`;

    // 1. Top repositories by contribution activity
    markdown += `## Top Active Repositories\n\n`;
    markdown += `| Repository | Description | Total Contributions | Contributors | Last Commit | Topics |\n`;
    markdown += `| ---------- | ----------- | -----------------: | ----------: | ----------- | ------ |\n`;

    // Sort repos by total contribution count
    const reposWithTotals = reposWithContributions.map(repo => {
      let totalContributions = 0;
      // Ensure we have a full_name to use as a key
      const repoFullName = repo.full_name || `${repo.org}/${repo.repo}`;
      const repoContributors = advocateContributions.get(repoFullName);
      if (repoContributors) {
        for (const count of repoContributors.values()) {
          totalContributions += count;
        }
      }
      return {
        repo,
        totalContributions,
        contributorCount: repoContributors?.size || 0,
      };
    });

    // Sort by total contributions, descending
    reposWithTotals.sort((a, b) => b.totalContributions - a.totalContributions);

    // Show top repositories
    for (const {
      repo,
      totalContributions,
      contributorCount,
    } of reposWithTotals.slice(0, 15)) {
      // Format topics
      const topicsFormatted =
        Array.isArray(repo?.topics) && repo?.topics?.length > 0
          ? repo?.topics?.map(topic => `\`${topic}\``).join(' ')
          : '-';

      markdown += `| [${repo.full_name}](${repo.html_url}) | ${repo.description || 'No description'} | ${totalContributions} | ${contributorCount} | ${repo.last_commit_date || 'N/A'} | ${topicsFormatted} |\n`;
    }

    // 2. Top Cloud Advocate contributors
    markdown += `\n## Top Cloud Advocate Contributors\n\n`;
    markdown += `| Contributor | Repositories | Total Contributions | Most Active In |\n`;
    markdown += `| ----------- | -----------: | ------------------: | -------------- |\n`;

    // Aggregate contributions by advocate
    const advocateStats = new Map<
      string,
      {
        repoCount: number;
        totalContribs: number;
        topRepos: Array<{ repo: string; count: number }>;
      }
    >();

    for (const [repoName, contributors] of advocateContributions.entries()) {
      for (const [advocate, count] of contributors.entries()) {
        if (!advocateStats.has(advocate)) {
          advocateStats.set(advocate, {
            repoCount: 0,
            totalContribs: 0,
            topRepos: [],
          });
        }

        const stats = advocateStats.get(advocate)!;
        stats.repoCount++;
        stats.totalContribs += count;
        stats.topRepos.push({ repo: repoName, count });

        // Keep only top 3 repos by contribution count
        stats.topRepos.sort((a, b) => b.count - a.count);
        if (stats.topRepos.length > 3) {
          stats.topRepos = stats.topRepos.slice(0, 3);
        }
      }
    }

    // Convert to array and sort by total contributions
    const sortedAdvocates = Array.from(advocateStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalContribs - a.totalContribs);

    // Show top contributors
    for (const {
      name,
      repoCount,
      totalContribs,
      topRepos,
    } of sortedAdvocates.slice(0, 10)) {
      const topReposFormatted = topRepos
        .map(r => `[${r.repo}](https://github.com/${r.repo}): ${r.count}`)
        .join('<br>');

      markdown += `| [${name}](https://github.com/${name}) | ${repoCount} | ${totalContribs} | ${topReposFormatted} |\n`;
    }

    // 3. Recent Activity Timeline
    markdown += `\n## Recent Activity Timeline\n\n`;
    markdown += `| Date | Repository | Contributors | Activity |\n`;
    markdown += `| ---- | ---------- | ------------ | -------- |\n`;

    // For a real implementation, we'd need to gather commit dates and details
    // This is a placeholder for demonstration
    markdown += `| *Timeline data would require additional GitHub API calls to fetch commit history* |\n`;

    // 4. Docker command to run this report
    markdown += `\n## Running This Report with Docker\n\n`;
    markdown += `This report can be generated using Docker with the following command:\n\n`;
    markdown += '```bash\n';
    markdown +=
      '# Replace YOUR_GITHUB_TOKEN with a valid GitHub personal access token\n';
    markdown +=
      'docker run -e GITHUB_TOKEN=YOUR_GITHUB_TOKEN -v $(pwd):/workspaces/azure-javascript azure-health-check\n';
    markdown += '```\n\n';

    markdown += `## Insights\n\n`;
    markdown += `- ${reposWithTotals.length} repositories received contributions from Cloud Advocates in the last 30 days.\n`;
    markdown += `- ${sortedAdvocates.length} Cloud Advocates were active in these repositories.\n`;
    markdown += `- The most active repository had ${reposWithTotals[0]?.totalContributions || 0} contributions.\n`;
    markdown += `- The most active contributor made ${sortedAdvocates[0]?.totalContribs || 0} contributions across ${sortedAdvocates[0]?.repoCount || 0} repositories.\n`;

    return markdown;
  }
}
