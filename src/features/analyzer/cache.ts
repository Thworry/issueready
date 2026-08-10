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

type CacheEnvelope = {
  savedAt: number;
  input: SerializedInput;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFileState(value: unknown): boolean {
  return value === "present" || value === "missing" || value === "unknown";
}

function isSerializedRepository(
  value: unknown
): value is SerializedInput["repository"] {
  if (!isRecord(value)) return false;

  return (
    typeof value.fullName === "string" &&
    typeof value.url === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    typeof value.archived === "boolean" &&
    typeof value.pushedAt === "string" &&
    isNonnegativeInteger(value.openItemCount) &&
    isFileState(value.readme) &&
    isFileState(value.contributing) &&
    isFileState(value.license)
  );
}

function isSerializedIssue(
  value: unknown
): value is SerializedInput["issues"][number] {
  if (!isRecord(value)) return false;

  return (
    isNonnegativeInteger(value.number) &&
    value.number > 0 &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.body === "string" &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => typeof label === "string") &&
    typeof value.updatedAt === "string" &&
    isNonnegativeInteger(value.assigneeCount)
  );
}

function isSerializedInput(value: unknown): value is SerializedInput {
  if (!isRecord(value)) return false;

  return (
    isSerializedRepository(value.repository) &&
    Array.isArray(value.issues) &&
    value.issues.every(isSerializedIssue) &&
    isNonnegativeInteger(value.inspectedItemCount) &&
    value.apiScopeLimit === 100
  );
}

function isCacheEnvelope(value: unknown): value is CacheEnvelope {
  return (
    isRecord(value) &&
    typeof value.savedAt === "number" &&
    Number.isFinite(value.savedAt) &&
    isSerializedInput(value.input)
  );
}

function removeInvalidEntry(
  storage: Pick<Storage, "removeItem">,
  key: string
): null {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
  return null;
}

export function loadCachedInput(
  storage: Pick<Storage, "getItem" | "removeItem">,
  ref: RepoRef,
  nowMs: number
): AnalysisInput | null {
  const key = keyFor(ref);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCacheEnvelope(parsed) || !Number.isFinite(nowMs)) {
      return removeInvalidEntry(storage, key);
    }

    const age = nowMs - parsed.savedAt;
    if (!Number.isFinite(age) || age < 0 || age > TTL) {
      return removeInvalidEntry(storage, key);
    }

    const pushedAt = new Date(parsed.input.repository.pushedAt);
    const issues = parsed.input.issues.map((issue) => ({
      ...issue,
      updatedAt: new Date(issue.updatedAt)
    }));
    if (
      !Number.isFinite(pushedAt.getTime()) ||
      issues.some((issue) => !Number.isFinite(issue.updatedAt.getTime()))
    ) {
      return removeInvalidEntry(storage, key);
    }

    return {
      ...parsed.input,
      repository: {
        ...parsed.input.repository,
        pushedAt
      },
      issues
    };
  } catch {
    return removeInvalidEntry(storage, key);
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
