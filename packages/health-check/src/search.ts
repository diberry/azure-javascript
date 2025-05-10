import { Octokit } from 'octokit';

async function searchAzureSamplesRepos() {
  // Initialize Octokit - replace with your token or use process.env.GITHUB_TOKEN
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    // Perform repository search
    const response = await octokit.rest.search.repos({
      q: 'org:azure-samples',
      sort: 'updated',
      order: 'desc',
      per_page: 10,
    });

    // Get rate limit information
    const rateLimitRemaining = parseInt(
      response.headers['x-ratelimit-remaining'] || '0'
    );
    const rateLimitReset = parseInt(
      response.headers['x-ratelimit-reset'] || '0'
    );

    console.log(`Rate limit remaining: ${rateLimitRemaining}`);
    console.log(
      `Rate limit resets at: ${new Date(rateLimitReset * 1000).toLocaleString()}`
    );

    // Display results
    console.log(
      `Found ${response.data.total_count} repositories in azure-samples`
    );

    response.data.items.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name}: ${repo.description}`);
      console.log(`   URL: ${repo.html_url}`);
      console.log(
        `   Stars: ${repo.stargazers_count}, Forks: ${repo.forks_count}`
      );
      console.log(
        `   Last updated: ${new Date(repo.updated_at).toLocaleString()}`
      );
      console.log('---');
    });
  } catch (error: any) {
    console.error('Error searching repositories:', error.message);

    // Check for rate limit errors
    if (error.status === 403 && error.message?.includes('rate limit')) {
      const resetTime = error.headers?.['x-ratelimit-reset']
        ? new Date(
            parseInt(error.headers['x-ratelimit-reset']) * 1000
          ).toLocaleString()
        : 'unknown time';

      console.error(
        `GitHub API rate limit exceeded. Try again after ${resetTime}`
      );
    }
  }
}

// Run the search function
searchAzureSamplesRepos();
