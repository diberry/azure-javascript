import { Repository } from '../models.js';

// Helper function to extract repositories from README
export function extractRepositoriesFromReadme(content: string): Repository[] {
  // First find all reference-style links in the table
  const tableLinksRegex = /\|\s*\[([^\]]+)\]\[([^\]]+)\]\s*\|/g;
  const referenceLinks: Map<string, string> = new Map();
  const repos: Repository[] = [];

  // Then find all reference definitions
  const refDefinitionRegex =
    /\[([^\]]+)\]:\s*https:\/\/github\.com\/([^\/]+)\/([^\s\n]+)/g;

  let refMatch: RegExpExecArray | null;
  // Extract all reference definitions
  while ((refMatch = refDefinitionRegex.exec(content)) !== null) {
    const [_, refId, org, repo] = refMatch;
    referenceLinks.set(refId, `${org}/${repo.trim()}`);
  }

  // Now extract links from the table
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableLinksRegex.exec(content)) !== null) {
    const [_, displayName, refId] = tableMatch;

    // Look up the reference ID
    if (referenceLinks.has(refId)) {
      const [org, repo] = referenceLinks.get(refId)!.split('/');
      repos.push({ name: displayName, org, repo });
    }
  }

  // Fallback to check for inline links if no repos found
  if (repos.length === 0) {
    const inlineRepoRegex: RegExp =
      /\[([^\]]+)\]\(https:\/\/github\.com\/([^\/]+)\/([^\/\)]+)/g;
    let match: RegExpExecArray | null;

    while ((match = inlineRepoRegex.exec(content)) !== null) {
      const [_, linkText, org, repo] = match;
      repos.push({ name: linkText, org, repo });
    }
  }

  console.log(`Found ${repos.length} repositories in README`);

  // Alpha sort repositories by name
  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Converts an array of GitHub URLs to an array of Repository objects
 * @param {string[]} githubUrls - Array of GitHub repository URLs
 * @returns {Repository[]} - Array of Repository objects
 */
export function extractOrgAndRepo(githubUrls: string[]): Repository[] {
  return githubUrls.map((url: string) => {
    // Extract the org/repo part from the GitHub URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)$/i);

    if (match && match[1] && match[2]) {
      return {
        name: match[2], // Using repo name as the display name
        org: match[1],
        repo: match[2],
      };
    }

    // Return a default Repository object if pattern doesn't match
    return {
      name: 'unknown',
      org: 'unknown',
      repo: url,
    };
  });
}
