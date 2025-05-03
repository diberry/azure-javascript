import { promises as fs } from "fs";
import { Repository } from "./models.js";

export default class ReportGenerator {
  static generateMarkdownReport(
    repoDataList: Array<
      Repository & {
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
      }
    >,
  ): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      timeZoneName: "short",
    });

    let markdown: string = "# Repository Health Check Report\n\n";
    markdown += `*Generated on: ${formattedDate}*\n\n`;

    // Main repository stats table
    markdown += "## Repository Statistics\n\n";
    markdown +=
      "| Repository | Issues | PRs | Stars | Forks | Watchers | Last Commit | Last Committer |\n";
    markdown +=
      "|------------|--------|-----|-------|-------|----------|-------------|---------------|\n";

    for (const data of repoDataList) {
      const committerCell = data.lastCommitterLogin
        ? `[![${data.lastCommitterLogin}](${data.lastCommitterAvatar}&s=20)](${data.lastCommitterUrl})`
        : "";

      markdown += `| [${data.name}](https://github.com/${data.org}/${data.repo}) | ${data.issuesCount} | ${data.prsCount} | ${data.stars} | ${data.forks} | ${data.watchers} | ${data.lastCommitDate} | ${committerCell} |\n`;
    }

    // Security section
    markdown += "\n\n## Security Status\n\n";
    markdown +=
      "| Repository | Security Notices | Dependabot | Code Scanning | Status |\n";
    markdown +=
      "|------------|-----------------|-----------|--------------|--------|\n";

    for (const data of repoDataList) {
      const securityStatus = data.hasVulnerabilities
        ? "⚠️ Issues"
        : !data.dependabotEnabled && !data.codeScanning
          ? "⚠️ No protections"
          : "✅ Good";

      const dependabotIcon = data.dependabotEnabled ? "✅" : "❌";
      const codeScanningIcon = data.codeScanning ? "✅" : "❌";

      markdown += `| [${data.name}](https://github.com/${data.org}/${data.repo}) | ${data.securityNotices} | ${dependabotIcon} | ${codeScanningIcon} | ${securityStatus} |\n`;
    }

    return markdown;
  }

  static async saveReport(markdown: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, markdown);
    console.log(`Health check report generated successfully to ${filePath}`);
  }
}
