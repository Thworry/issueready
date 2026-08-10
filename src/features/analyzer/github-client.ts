import type {
  GitHubCommunityProfile,
  GitHubIssue,
  GitHubRepository,
  RepoRef,
  RepoSnapshot
} from "./model";
import { GitHubApiError } from "./model";

const ROOT = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};

async function requestJson<T>(
  url: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, { headers: HEADERS, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new GitHubApiError("network", "GitHub could not be reached");
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new GitHubApiError(
        "not-found",
        "The repository is missing or private",
        404
      );
    }
    if (response.status === 403 && response.headers.has("X-RateLimit-Reset")) {
      const seconds = Number(response.headers.get("X-RateLimit-Reset"));
      throw new GitHubApiError(
        "rate-limit",
        "GitHub rate limit reached",
        403,
        Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined
      );
    }
    throw new GitHubApiError(
      "api",
      "GitHub returned status " + response.status,
      response.status
    );
  }

  return (await response.json()) as T;
}

export async function fetchRepoSnapshot(
  ref: RepoRef,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<RepoSnapshot> {
  const base = ROOT + "/repos/" + ref.owner + "/" + ref.repo;
  const repository = requestJson<GitHubRepository>(base, signal, fetcher);
  const community = requestJson<GitHubCommunityProfile>(
    base + "/community/profile",
    signal,
    fetcher
  ).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return null;
  });
  const issues = requestJson<GitHubIssue[]>(
    base + "/issues?state=open&sort=updated&direction=desc&per_page=100",
    signal,
    fetcher
  );

  const values = await Promise.all([repository, community, issues]);
  return { repository: values[0], community: values[1], issues: values[2] };
}
