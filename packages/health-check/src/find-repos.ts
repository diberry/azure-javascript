import { Repository } from "./models.js";

// Helper function to extract repositories from README
export function extractRepositoriesFromReadme(content: string): Repository[] {
  const repoRegex: RegExp =
    /\[([^\]]+)\]\(https:\/\/github\.com\/([^\/]+)\/([^\/\)]+)/g;
  let match: RegExpExecArray | null;
  const repos: Repository[] = [];

  while ((match = repoRegex.exec(content)) !== null) {
    const [_, linkText, org, repo] = match;
    repos.push({ name: linkText, org, repo });
  }

  // Alpha sort repositories by name
  return repos.sort((a, b) => a.name.localeCompare(b.name));
}
