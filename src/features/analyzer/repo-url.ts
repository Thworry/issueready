import type { RepoRef } from "./model";

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const RAW_REPOSITORY_URL =
  /^(?:https:\/\/)?github\.com(?::\d+)?\/[^/?#\\]+\/[^/?#\\]+\/?$/i;

export class RepoUrlError extends Error {
  constructor() {
    super(
      "Enter a public GitHub repository URL such as https://github.com/ossf/scorecard"
    );
    this.name = "RepoUrlError";
  }
}

function validate(owner: string, repoValue: string): RepoRef {
  const repo = repoValue.endsWith(".git") ? repoValue.slice(0, -4) : repoValue;
  if (!OWNER.test(owner) || !REPO.test(repo) || repo === "." || repo === "..") {
    throw new RepoUrlError();
  }
  return { owner, repo };
}

export function parseGitHubRepoUrl(input: string): RepoRef {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new RepoUrlError();
  }
  if (!RAW_REPOSITORY_URL.test(trimmed)) {
    throw new RepoUrlError();
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new RepoUrlError();
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new RepoUrlError();
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new RepoUrlError();
  }
  return validate(segments[0] ?? "", segments[1] ?? "");
}

export function toShareSearch(ref: RepoRef): string {
  return `?${new URLSearchParams({ repo: `${ref.owner}/${ref.repo}` }).toString()}`;
}

export function repoRefFromSearch(search: string): RepoRef | null {
  const slugs = new URLSearchParams(search).getAll("repo");
  if (slugs.length !== 1) {
    return null;
  }
  const slug = slugs[0];
  if (!slug) {
    return null;
  }

  const parts = slug.split("/");
  if (parts.length !== 2) {
    return null;
  }

  try {
    return validate(parts[0] ?? "", parts[1] ?? "");
  } catch {
    return null;
  }
}
