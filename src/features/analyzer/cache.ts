import type { AnalysisInput, NormalizedIssue, RepoRef } from "./model";

const TTL = 10 * 60 * 1000;
const keyFor = (ref: RepoRef) => "issueready:v1:" + ref.owner + "/" + ref.repo;

type SerializedInput = Omit<AnalysisInput, "repository" | "issues"> & {
  repository: Omit<AnalysisInput["repository"], "pushedAt"> & {
    pushedAt: string;
  };
  issues: Array<
    Omit<NormalizedIssue, "updatedAt"> & {
      updatedAt: string;
    }
  >;
};

export function loadCachedInput(
  storage: Pick<Storage, "getItem" | "removeItem">,
  ref: RepoRef,
  nowMs: number
): AnalysisInput | null {
  const key = keyFor(ref);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      input: SerializedInput;
    };
    if (nowMs - parsed.savedAt > TTL) {
      storage.removeItem(key);
      return null;
    }
    return {
      ...parsed.input,
      repository: {
        ...parsed.input.repository,
        pushedAt: new Date(parsed.input.repository.pushedAt)
      },
      issues: parsed.input.issues.map((issue) => ({
        ...issue,
        updatedAt: new Date(issue.updatedAt)
      }))
    };
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be disabled by browser privacy settings.
    }
    return null;
  }
}

export function saveCachedInput(
  storage: Pick<Storage, "setItem">,
  ref: RepoRef,
  input: AnalysisInput,
  nowMs: number
): void {
  try {
    storage.setItem(keyFor(ref), JSON.stringify({ savedAt: nowMs, input }));
  } catch {
    // Caching is optional; analysis remains functional without storage.
  }
}

export function clearCachedInput(
  storage: Pick<Storage, "removeItem">,
  ref: RepoRef
): void {
  try {
    storage.removeItem(keyFor(ref));
  } catch {
    // Refresh remains functional even if storage is unavailable.
  }
}
