import { promises as fs } from 'fs';
import { RepositoryItemExtened, RepoData } from '../models.js';

export default class ReportGenerator {
  static async saveReport(markdown: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, markdown);
    console.log(`Health check report generated successfully to ${filePath}`);
  }

  static generateMarkdownReport(repoDataList: RepoData[]): string {
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
      const committerCell = data.lastCommitterLogin
        ? `[![${data.lastCommitterLogin}](${data.lastCommitterAvatar}&s=20)](${data.lastCommitterUrl})`
        : '';

      markdown += `| [${data.name}](https://github.com/${data.org}/${data.repo}) | ${data.issuesCount} | ${data.prsCount} | ${data.stars} | ${data.forks} | ${data.watchers} | ${data.lastCommitDate} | ${committerCell} |\n`;
    }

    // Security section
    markdown += '\n\n## Security Status\n\n';
    markdown +=
      '| Repository | Security Notices | Dependabot | Code Scanning | Status |\n';
    markdown +=
      '|------------|-----------------|-----------|--------------|--------|\n';

    for (const data of repoDataList) {
      const securityStatus = data.hasVulnerabilities
        ? '⚠️ Issues'
        : !data.dependabotEnabled && !data.codeScanning
          ? '⚠️ No protections'
          : '✅ Good';

      const dependabotIcon = data.dependabotEnabled ? '✅' : '❌';
      const codeScanningIcon = data.codeScanning ? '✅' : '❌';

      markdown += `| [${data.name}](https://github.com/${data.org}/${data.repo}) | ${data.securityNotices} | ${dependabotIcon} | ${codeScanningIcon} | ${securityStatus} |\n`;
    }

    return markdown;
  }

  static generatSuggestedReposMarkdownReport(
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
      const topics = repo?.topics?.join(', ');

      // Status indicator (archived or active)
      const status = repo?.archived ? '📦 Archived' : '✅ Active';

      // Add row to table
      markdown += `| [${repo.full_name}](${repo.url}) | ${repo.description} | ${repo.stargazers_count} | ${repo.last_commit_date} | ${status} | ${topics} |\n`;

      newReadmeReferences += `[${repo?.name}]: https://${repo?.org}/${repo.repo}}\n`;
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
      // Format repository stats without using pipe characters
      const stats = `⭐ ${repo?.stars} <br> 👀 ${repo?.watchers} <br> 🔄 ${repo?.lastCommitDate}`;

      // Format topics as badges
      const topicsFormatted =
        Array.isArray(repo?.topics) && repo?.topics?.length > 0
          ? repo?.topics?.map(topic => `\`${topic}\``).join(' ')
          : '-';

      // Add the row to the table
      newReadme += `| [${repo?.name}][${repo?.name.toLowerCase().replace(/\s/g, '-')}] | ${repo?.description} | ${topicsFormatted} | ${stats} |\n`;

      newReadmeReferences += `[${repo?.name}]: ${`https://${repo?.org}/${repo.repo}`}\n`;
    }
    return newReadme + `\n\n` + newReadmeReferences;
  }
}
/*
async function generateReadme(
  reposWithData: RepoWithDescription[]
): Promise<string> {
  // Read the original README to preserve the structure
  const readmePath: string = path.join(process.cwd(), '../../README.md');
  const originalReadme: string = await fs.readFile(readmePath, 'utf8');

  // Extract the header part (everything before the table)
  const headerMatch = originalReadme.match(
    /(.+?)(\| Sample \| Azure services)/s
  );
  const header = headerMatch ? headerMatch[1] : '';

  // Start constructing the new README
  let newReadme = header;

  // Add the table header with the new Topics column
  newReadme +=
    '| Sample | Description | Azure services & SDKs | [AZD][azd-link] | [Azure AI][azure-ai-link] | [DevContainer][devcontainer-link] | Topics | Stats |\n';
  newReadme +=
    '| ------ | ----------- | --------------------- | :-------------: | :-----------------------: | :------------------------------: | ------ | ----- |\n';

  // Add each repository with its data
  for (const repo of reposWithData) {
    // Find the original entry to preserve the checkmarks
    const repoPattern = new RegExp(
      `\\| \\[${repo.name}\\].+?\\|\\s+(✅|-)\\s+\\|\\s+(✅|-)\\s+\\|\\s+(✅|-)\\s+\\|`,
      'i'
    );
    const originalEntryMatch = originalReadme.match(repoPattern);

    // Extract the checkmarks
    let azdMark = '-';
    let aiMark = '-';
    let devContainerMark = '-';

    if (originalEntryMatch) {
      const parts = originalEntryMatch[0].split('|');
      if (parts.length >= 5) {
        azdMark = parts[parts.length - 3].trim();
        aiMark = parts[parts.length - 2].trim();
        devContainerMark = parts[parts.length - 1].trim();
      }
    }

    // Find services part from original entry
    const servicesPattern = new RegExp(
      `\\| \\[${repo.name}\\].+?\\| (.+?) \\|\\s+(✅|-)\\s+\\|`,
      'i'
    );
    const servicesMatch = originalReadme.match(servicesPattern);
    const servicesPart = servicesMatch ? servicesMatch[1] : '';

    // Format repository stats without using pipe characters
    const stats = `⭐ ${repo.stars} · 👀 ${repo.watchers} · 🔄 ${repo.lastCommitDate}`;
    
    // Format topics as badges
    const topicsFormatted = repo.topics.length > 0 
      ? repo.topics.map(topic => `\`${topic}\``).join(' ') 
      : '-';

    // Add the row to the table
    newReadme += `| [${repo.name}][${repo.name.toLowerCase().replace(/\s/g, '-')}] | ${repo.description} | ${servicesPart} | ${azdMark} | ${aiMark} | ${devContainerMark} | ${topicsFormatted} | ${stats} |\n`;
  }

  // Extract reference links section
  const refLinksMatch = originalReadme.match(
    /<!-- Reference Links -->\s*([\s\S]+)$/
  );
  const refLinks = refLinksMatch ? refLinksMatch[1] : '';

  // Add the reference links section
  newReadme += '\n## Troubleshooting\n\n';
  newReadme +=
    'If you have difficulty wih an issue or PR in these samples, open an issue on this repository.\n\n';
  newReadme += '<!-- Reference Links -->\n';
  newReadme += refLinks;

  return newReadme;
}
*/
