import { Octokit } from 'octokit';
import { SuggestedRepo } from '../models.js';

/**
 * Class for searching GitHub repositories with various criteria
 */
export default class GitHubSearcher {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Search GitHub repositories with given query and return results
   * @param query GitHub search query
   * @param maxResults Maximum number of results to return (default 100)
   * @param includeArchived Whether to include archived repositories (default false)
   * @returns Array of SuggestedRepo objects
   */
  async searchRepositories(
    query: string,
    maxResults = 100,
    includeArchived = false
  ): Promise<SuggestedRepo[]> {
    // Add archived:false filter if includeArchived is false
    if (!includeArchived && !query.includes('archived:')) {
      query += ' archived:false';
    }

    console.log(`Searching GitHub repositories with query: ${query}`);

    const repos: SuggestedRepo[] = [];
    let page = 1;
    let hasMoreRepos = true;
    const perPage = Math.min(100, maxResults); // GitHub API allows max 100 per page

    while (hasMoreRepos && repos.length < maxResults) {
      try {
        console.log(`Fetching page ${page}...`);
        const response = await this.octokit.rest.search.repos({
          q: query,
          sort: 'updated',
          order: 'desc',
          per_page: perPage,
          page,
        });

        if (response.data.items.length === 0) {
          hasMoreRepos = false;
        } else {
          for (const repo of response.data.items) {
            await this.processRepositoryItem(repo, repos);

            if (repos.length >= maxResults) {
              hasMoreRepos = false;
              break;
            }
          }

          page++;
        }
      } catch (error) {
        console.error(
          `Error searching repositories: ${error instanceof Error ? error.message : String(error)}`
        );
        hasMoreRepos = false;
      }
    }

    console.log(`Found ${repos.length} repositories matching query`);
    return repos;
  }

  /**
   * Process a repository item from GitHub search results
   * @param repo GitHub repository item from search results
   * @param repos Array to add processed repos to
   */
  private async processRepositoryItem(
    repo: any, // Using 'any' type for repo parameter to avoid type issues
    repos: SuggestedRepo[]
  ): Promise<void> {
    // Get the last commit date for this repository
    let lastCommitDate = 'N/A';

    try {
      // Check if owner login exists before attempting to fetch commits
      const ownerLogin = repo?.owner?.login || repo?.full_name?.split('/')[0];

      if (ownerLogin && repo.name) {
        const commitsData = await this.octokit.rest.repos.listCommits({
          owner: ownerLogin,
          repo: repo.name,
          per_page: 1,
        });

        if (commitsData.data.length > 0) {
          lastCommitDate = new Date(
            commitsData.data[0].commit.committer?.date || ''
          )
            .toISOString()
            .split('T')[0];
        }
      }
    } catch (commitError) {
      console.warn(
        `Could not fetch commit data for ${repo.full_name}: ${commitError}`
      );
    }

    repos.push({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || 'No description provided',
      url: repo.html_url,
      stars: repo.stargazers_count,
      updatedAt: repo.updated_at,
      topics: repo.topics || [],
      isArchived: repo.archived || false,
      lastCommitDate,
    });
  }

  /**
   * Search for repositories in specific organizations with language filters
   * @param orgs Array of GitHub organization names to search
   * @param languages Array of programming languages to filter by
   * @param updatedSince Date string (YYYY-MM-DD) for how recent repos should be updated
   * @param topics Array of topics to filter by
   * @param includeArchived Whether to include archived repositories (default false)
   * @returns Array of SuggestedRepo objects
   */
  async searchOrgRepositories(
    orgs: string[] = ['Azure-Samples'],
    languages: string[] = ['javascript', 'typescript'],
    updatedSince?: string,
    topics: string[] = ['azure'],
    includeArchived = false
  ): Promise<SuggestedRepo[]> {
    const allRepos: SuggestedRepo[] = [];

    for (const org of orgs) {
      console.log(`\nSearching in organization: ${org}`);

      for (const language of languages) {
        // Build the query string
        let query = `org:${org} language:${language}`;

        // Add topics filter if provided
        if (topics.length > 0) {
          query += ` ${topics.map(topic => `topic:${topic}`).join(' ')}`;
        }

        // Add updated filter if provided
        if (updatedSince) {
          query += ` updated:>=${updatedSince}`;
        }

        console.log(`- Searching for ${language} repos in ${org}`);
        const reposForLanguage = await this.searchRepositories(
          query,
          100,
          includeArchived
        );
        console.log(
          `- Found ${reposForLanguage.length} ${language} repositories`
        );
        allRepos.push(...reposForLanguage);
      }
    }

    return allRepos;
  }

  /**
   * Find trending repositories related to Azure
   * @param daysBack Number of days to look back for trending repos
   * @returns Array of SuggestedRepo objects
   */
  async findTrendingAzureRepos(daysBack = 30): Promise<SuggestedRepo[]> {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0];

    console.log(`Looking for trending Azure repos updated since ${dateString}`);

    return this.searchRepositories(
      `topic:azure created:>=${dateString} stars:>10`,
      50
    );
  }

  /**
   * Find repositories similar to a given repository
   * @param repoFullName Full repository name (format: owner/repo)
   * @returns Array of SuggestedRepo objects
   */
  async findSimilarRepos(repoFullName: string): Promise<SuggestedRepo[]> {
    console.log(`Finding repositories similar to ${repoFullName}`);

    const [owner, repo] = repoFullName.split('/');

    try {
      // Get repository information to extract topics and language
      const repoInfo = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const language = repoInfo.data.language?.toLowerCase() || '';
      const topics = repoInfo.data.topics || [];

      // If we have topics, use them to find similar repos
      if (topics.length > 0) {
        const topicsQuery = topics
          .slice(0, 3)
          .map(topic => `topic:${topic}`)
          .join(' ');
        const query = `${topicsQuery} language:${language} -repo:${repoFullName}`;

        console.log(`Searching for similar repos with query: ${query}`);
        return this.searchRepositories(query);
      }

      return [];
    } catch (error) {
      console.error(
        `Error finding similar repos: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }
}
