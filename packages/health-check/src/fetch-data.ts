import { Repository } from "./models.js";

export async function fetchRepoData<T>(
  endpoint: (params: {
    owner: string;
    repo: string;
    per_page?: number;
  }) => Promise<T>,
  repo: Repository,
  errorMessage: string,
  defaultValue: any,
): Promise<any> {
  try {
    return await endpoint({
      owner: repo.org,
      repo: repo.repo,
      per_page: 1,
    });
  } catch (error) {
    console.error(`${errorMessage} ${repo.org}/${repo.repo}: ${error}`);
    return defaultValue;
  }
}
