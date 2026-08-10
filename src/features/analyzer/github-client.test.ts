import { describe, expect, it, vi } from "vitest";
import { fetchRepoSnapshot } from "./github-client";
import {
  GitHubApiError,
  type GitHubCommunityProfile,
  type GitHubIssue,
  type GitHubRepository
} from "./model";

const REPOSITORY_URL = "https://api.github.com/repos/o/r";
const COMMUNITY_URL = "https://api.github.com/repos/o/r/community/profile";
const ISSUES_URL =
  "https://api.github.com/repos/o/r/issues?state=open&sort=updated&direction=desc&per_page=100";
const REQUEST_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};

const repository: GitHubRepository = {
  full_name: "o/r",
  html_url: "https://github.com/o/r",
  description: "A repository",
  archived: false,
  pushed_at: "2026-08-01T00:00:00Z",
  open_issues_count: 1,
  default_branch: "main"
};

const community: GitHubCommunityProfile = {
  health_percentage: 100,
  files: {
    readme: {
      url: "https://api.github.com/repos/o/r/readme",
      html_url: "https://github.com/o/r/blob/main/README.md"
    },
    contributing: {
      url: "https://api.github.com/repos/o/r/contents/CONTRIBUTING.md",
      html_url: "https://github.com/o/r/blob/main/CONTRIBUTING.md"
    },
    license: {
      url: "https://api.github.com/repos/o/r/license",
      html_url: "https://github.com/o/r/blob/main/LICENSE"
    }
  }
};

const issues: GitHubIssue[] = [
  {
    number: 1,
    title: "Document the analyzer",
    html_url: "https://github.com/o/r/issues/1",
    body: "Add usage instructions.",
    labels: [{ name: "good first issue" }],
    updated_at: "2026-08-09T00:00:00Z",
    assignees: []
  }
];

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

function responseFor(url: string): Response {
  if (url === REPOSITORY_URL) return jsonResponse(repository);
  if (url === COMMUNITY_URL) return jsonResponse(community);
  if (url === ISSUES_URL) return jsonResponse(issues);
  throw new Error(`Unexpected URL: ${url}`);
}

function bodyReadErrorResponse(error: unknown): Response {
  const response = jsonResponse({});
  vi.spyOn(response, "json").mockRejectedValue(error);
  return response;
}

function endpointFetcher(
  overrides: Partial<Record<string, Response | Error>> = {}
) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const override = overrides[url];
    if (override !== undefined) {
      if (override instanceof Response) return override;
      throw override;
    }
    return responseFor(url);
  }) as unknown as typeof fetch;
}

describe("fetchRepoSnapshot", () => {
  it("starts exactly three requests concurrently with the expected URLs and options", async () => {
    const controller = new AbortController();
    const resolvers = new Map<string, (response: Response) => void>();
    const fetcher = vi.fn(
      (input: string | URL | Request) =>
        new Promise<Response>((resolve) => {
          resolvers.set(String(input), resolve);
        })
    ) as unknown as typeof fetch;

    const snapshotPromise = fetchRepoSnapshot(
      { owner: "o", repo: "r" },
      controller.signal,
      fetcher
    );

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenNthCalledWith(1, REPOSITORY_URL, {
      headers: REQUEST_HEADERS,
      signal: controller.signal
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, COMMUNITY_URL, {
      headers: REQUEST_HEADERS,
      signal: controller.signal
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, ISSUES_URL, {
      headers: REQUEST_HEADERS,
      signal: controller.signal
    });

    resolvers.get(ISSUES_URL)?.(jsonResponse(issues));
    resolvers.get(REPOSITORY_URL)?.(jsonResponse(repository));
    resolvers.get(COMMUNITY_URL)?.(jsonResponse(community));

    await expect(snapshotPromise).resolves.toEqual({
      repository,
      community,
      issues
    });
  });

  it("degrades only a failing community profile request to null", async () => {
    const fetcher = endpointFetcher({
      [COMMUNITY_URL]: jsonResponse({ message: "Server error" }, 500)
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).resolves.toEqual({ repository, community: null, issues });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("maps a repository 404 to not-found", async () => {
    const fetcher = endpointFetcher({
      [REPOSITORY_URL]: jsonResponse({ message: "Not Found" }, 404)
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      kind: "not-found",
      message: "The repository is missing or private",
      status: 404
    });
  });

  it("maps an issues 403 with a reset header to rate-limit and a Date", async () => {
    const fetcher = endpointFetcher({
      [ISSUES_URL]: jsonResponse({ message: "API rate limit exceeded" }, 403, {
        "X-RateLimit-Reset": "1786320000"
      })
    });

    let caught: unknown;
    try {
      await fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(GitHubApiError);
    expect(caught).toMatchObject({
      name: "GitHubApiError",
      kind: "rate-limit",
      message: "GitHub rate limit reached",
      status: 403,
      resetAt: new Date(1786320000 * 1000)
    });
  });

  it.each([
    ["an empty value", ""],
    ["a whitespace-only value", "   "],
    ["an out-of-Date-range value", "100000000000000000000"]
  ])(
    "keeps a rate-limit error without resetAt for %s",
    async (_label, resetHeader) => {
      const fetcher = endpointFetcher({
        [ISSUES_URL]: jsonResponse(
          { message: "API rate limit exceeded" },
          403,
          { "X-RateLimit-Reset": resetHeader }
        )
      });

      await expect(
        fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
      ).rejects.toMatchObject({
        name: "GitHubApiError",
        kind: "rate-limit",
        status: 403,
        resetAt: undefined
      });
    }
  );

  it("maps a repository fetch rejection to network", async () => {
    const fetcher = endpointFetcher({
      [REPOSITORY_URL]: new TypeError("Failed to fetch")
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      kind: "network",
      message: "GitHub could not be reached"
    });
  });

  it("maps an issues 451 to a generic api error", async () => {
    const fetcher = endpointFetcher({
      [ISSUES_URL]: jsonResponse({ message: "Unavailable" }, 451)
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      kind: "api",
      message: "GitHub returned status 451",
      status: 451
    });
  });

  it("maps an invalid JSON repository response to an api error", async () => {
    const fetcher = endpointFetcher({
      [REPOSITORY_URL]: new Response("not JSON", {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      kind: "api",
      message: "GitHub returned an invalid response",
      status: 200
    });
  });

  it("maps a repository body-read TypeError to network", async () => {
    const fetcher = endpointFetcher({
      [REPOSITORY_URL]: bodyReadErrorResponse(
        new TypeError("The response body could not be read")
      )
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      kind: "network",
      message: "GitHub could not be reached"
    });
  });

  it("maps an unexpected issues body-read error to a deterministic api error", async () => {
    const fetcher = endpointFetcher({
      [ISSUES_URL]: bodyReadErrorResponse(new Error("Decoder failed"))
    });

    await expect(
      fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher)
    ).rejects.toMatchObject({
      name: "GitHubApiError",
      kind: "api",
      message: "GitHub response could not be read",
      status: 200
    });
  });

  it("preserves a community body-read AbortError by identity", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    const fetcher = endpointFetcher({
      [COMMUNITY_URL]: bodyReadErrorResponse(abortError)
    });

    let caught: unknown;
    try {
      await fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(abortError);
    expect(caught).toMatchObject({ name: "AbortError" });
  });

  it("preserves an issues AbortError by identity and name", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    const fetcher = endpointFetcher({ [ISSUES_URL]: abortError });

    let caught: unknown;
    try {
      await fetchRepoSnapshot({ owner: "o", repo: "r" }, undefined, fetcher);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(abortError);
    expect(caught).toMatchObject({ name: "AbortError" });
  });
});
