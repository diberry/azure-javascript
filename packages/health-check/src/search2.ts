import GitHubRequestor from './github/github.js';

async function searchAzureSamplesRepos() {
  const request = new GitHubRequestor(process.env.GITHUB_TOKEN!);

  try {
    // Perform repository search
    const items = await request.getSearchRepository(
      'org:microsoft',
      10,
      'updated',
      'desc'
    );

    // @ts-ignore
    items.forEach((repo, index): any => {
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
