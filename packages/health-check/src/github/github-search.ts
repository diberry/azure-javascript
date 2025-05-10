import { RepositoryItemExtened } from '../models.js';
import GitHubRequestor, { isRepositoryError } from './github.js';
/**
 * Class for searching GitHub repositories with various criteria
 */
export default class GitHubSearcher {
  private requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
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
  ): Promise<RepositoryItemExtened[]> {

    console.log(`Searching GitHub repositories with query: ${query}`);

    const repos: RepositoryItemExtened[] = [];
    let hasMoreRepos = true;

      try {
        // Use repoDataCollector instead of direct Octokit call
        const items = await this.requestor.getSearchRepository(
          query,
          maxResults,
          'updated',
          'desc'
        );

        if (items.length === 0) {
          hasMoreRepos = false;
        } else {
          for (const repo of items) {
            const extendedRepo: RepositoryItemExtened =
              await this.processRepositoryItem(repo);

            repos.push(extendedRepo);

            if (repos.length >= maxResults) {
              hasMoreRepos = false;
              break;
            }
          }
        }


    console.log(`Found ${repos.length} repositories matching query`);
    return repos;
  }

  /**
   * Process a repository item from GitHub search results
   * @param repo GitHub repository item from search results
   * @returns Extended repository item with additional information
   */
  private async processRepositoryItem(
    repo: any // Using 'any' type for repo
  ): Promise<RepositoryItemExtened> {
    const [org, repo_name] = repo.full_name.split('/') as [string, string];

    try {
      // Get last commit from RepoDataCollector
      const commits = await this.requestor.getCommits(org, repo_name, 1);

      let lastCommitDate = 'N/A';
      if (commits && commits.length > 0) {
        lastCommitDate = new Date(commits[0].commit.committer?.date || '')
          .toISOString()
          .split('T')[0];
      }

      return {
        ...repo,
        last_commit_date: lastCommitDate,
        org,
        repo: repo_name,
      };
    } catch (commitError) {
      console.warn(
        `Could not fetch commit data for ${repo.full_name}: ${commitError}`
      );

      // Return with default value if we can't get commit data
      return {
        ...repo,
        last_commit_date: 'N/A',
        org,
        repo: repo_name,
      };
    }
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
    orgs: string[],
    languages: string[],
    topics: string[],
    updatedSince?: string,
    includeArchived = false
  ): Promise<RepositoryItemExtened[]> {
    const allRepos: RepositoryItemExtened[] = [];

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
  async findTrendingAzureRepos(
    daysBack = 30
  ): Promise<RepositoryItemExtened[]> {
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
   * Search for repositories owned by Microsoft organizations and contributed to by
   * Azure Cloud Advocates in the last 30 days that are not in the existing repos list
   * @param existingRepos Array of repository URLs to exclude from the results
   * @param daysBack Number of days to look back for contributions
   * @returns Array of repositories matching the criteria
   */
  async findContributedRepos(
    existingRepos: string[] = [],
    contributors: string[] = [],
    daysBack = 30
  ): Promise<RepositoryItemExtened[]> {
    // Get the date for the period we want to search
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0];

    console.log(
      `Searching for repos with Cloud Advocate PR contributions since ${dateString}`
    );

    // Convert existing repos to set of full names for faster lookups
    const existingRepoSet = new Set<string>();
    existingRepos.forEach(repoUrl => {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)$/i);
      if (match && match[1] && match[2]) {
        existingRepoSet.add(`${match[1]}/${match[2]}`.toLowerCase());
      }
    });

    // List of Microsoft organizations to search
    const orgs = ['microsoft', 'azure', 'azure-samples'];

    // Create a search query that finds PRs from any Cloud Advocate user
    // in JavaScript/TypeScript repos owned by Microsoft orgs
    const languages = ['javascript', 'typescript'];
    const allResults: RepositoryItemExtened[] = [];
    const processedRepos = new Set<string>(); // To track unique repos across all contributors

    // For each organization
    for (const org of orgs) {
      // For each language
      for (const language of languages) {
        // For each Cloud Advocate
        for (const advocate of contributors) {
          // Search for PRs where this advocate is the author
          const query = `org:${org} language:${language} author:${advocate} is:pr created:>=${dateString}`;

          console.log(
            `Searching for ${language} repos in ${org} with PRs from ${advocate}...`
          );

          try {
            // We need to search for pull requests directly using the Octokit API
            // since searchRepositories is designed for repos, not PRs
            let page = 1;
            let hasMorePrs = true;
            const perPage = 100;
            const reposByAdvocate = new Set<string>();

            while (hasMorePrs) {
              console.log(`Fetching PR page ${page} for ${advocate}...`);
              const prs = await this.requestor.searchPullRequests(
                query,
                page,
                perPage,
                'created',
                'desc'
              );

              if (prs.length === 0) {
                hasMorePrs = false;
              } else {
                // Extract repo information from each PR
                for (const pr of prs) {
                  // PR URL format: https://api.github.com/repos/OWNER/REPO/pulls/NUMBER
                  const repoUrl = pr.repository_url;
                  const repoFullName = repoUrl.replace(
                    'https://api.github.com/repos/',
                    ''
                  );

                  // Skip if we've already processed this repo or if it's in the existing list
                  if (
                    !processedRepos.has(repoFullName.toLowerCase()) &&
                    !existingRepoSet.has(repoFullName.toLowerCase())
                  ) {
                    reposByAdvocate.add(repoFullName);
                    processedRepos.add(repoFullName.toLowerCase());
                  }
                }

                page++;
                // Limit pages to avoid excessive API calls
                if (page > 3) {
                  hasMorePrs = false;
                }
              }
            }

            // Now fetch detailed information for each repository
            if (reposByAdvocate.size > 0) {
              console.log(
                `Found ${reposByAdvocate.size} repos with PRs from ${advocate}, fetching details...`
              );

              for (const repoFullName of reposByAdvocate) {
                const [owner, repoName] = repoFullName.split('/');

                try {
                  let repositoryItemExtened: RepositoryItemExtened = {
                    org: owner,
                    repo: repoName,
                  };

                  const repoDetails = await this.requestor.getRepo(
                    owner,
                    repoName
                  );

                  if (isRepositoryError(repoDetails)) {
                    console.error(
                      `Repository ${repoDetails.org}/${repoDetails.repo} not found. Error: ${repoDetails.error}`
                    );
                  }

                  const extendedRepo = await this.processRepositoryItem({
                    ...repoDetails,
                    ...repositoryItemExtened,
                  });
                  allResults.push(extendedRepo);
                } catch (repoError) {
                  console.error(
                    `Error fetching repo details for ${repoFullName}: ${
                      repoError instanceof Error
                        ? repoError.message
                        : String(repoError)
                    }`
                  );
                }
              }
            }
          } catch (error) {
            console.error(
              `Error searching for repos with ${advocate} PR contributions: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      }
    }

    console.log(
      `Found ${allResults.length} unique repositories with PR contributions from specified contributors`
    );
    return allResults;
  }

  /**
   * Find repositories similar to a given repository
   * @param repoFullName Full repository name (format: owner/repo)
   * @returns Array of SuggestedRepo objects
   */
  async findSimilarRepos(
    repoFullName: string
  ): Promise<RepositoryItemExtened[]> {
    console.log(`Finding repositories similar to ${repoFullName}`);

    const [owner, repo] = repoFullName.split('/');

    try {
      // Get repository information to extract topics and language
      const repoInfo = await this.requestor.getRepo(owner, repo);

      if (isRepositoryError(repoInfo)) {
        console.error(
          `Repository ${repoInfo.org}/${repoInfo.repo} not found. Error: ${repoInfo.error}`
        );
        return [];
      }

      const language = repoInfo.language?.toLowerCase() || '';
      const topics = repoInfo.topics || [];

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
