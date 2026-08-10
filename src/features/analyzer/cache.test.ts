import { describe, expect, it } from "vitest";
import { clearCachedInput, loadCachedInput, saveCachedInput } from "./cache";
import type { AnalysisInput, RepoRef } from "./model";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const ref: RepoRef = { owner: "acme", repo: "tool" };

const input: AnalysisInput = {
  repository: {
    fullName: "acme/tool",
    url: "https://github.com/acme/tool",
    description: "A useful tool",
    archived: false,
    pushedAt: new Date("2026-08-08T09:15:00Z"),
    openItemCount: 27,
    readme: "present",
    contributing: "present",
    license: "present"
  },
  issues: [
    {
      number: 1,
      title: "Document the public analyzer flow",
      url: "https://github.com/acme/tool/issues/1",
      body: "Add verification instructions.",
      labels: ["good first issue"],
      updatedAt: new Date("2026-08-09T12:30:00Z"),
      assigneeCount: 0
    }
  ],
  inspectedItemCount: 12,
  apiScopeLimit: 100
};

describe("IssueReady session cache", () => {
  it("loads a saved value throughout the ten-minute TTL and revives dates", () => {
    const storage = new MemoryStorage();

    saveCachedInput(storage, ref, input, 1_000);
    const restored = loadCachedInput(storage, ref, 600_999);

    expect(restored).toStrictEqual(input);
    expect(restored?.repository.pushedAt).toBeInstanceOf(Date);
    expect(restored?.issues[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it("expires and removes a value older than ten minutes", () => {
    const storage = new MemoryStorage();

    saveCachedInput(storage, ref, input, 1_000);

    expect(loadCachedInput(storage, ref, 601_001)).toBeNull();
    expect(storage.getItem("issueready:v1:acme/tool")).toBeNull();
  });

  it("removes malformed JSON instead of allowing cache corruption to escape", () => {
    const storage = new MemoryStorage();
    storage.setItem("issueready:v1:acme/tool", "{malformed");

    expect(loadCachedInput(storage, ref, 2_000)).toBeNull();
    expect(storage.getItem("issueready:v1:acme/tool")).toBeNull();
  });

  it("degrades blocked reads and cleanup to a cache miss", () => {
    const blocked = {
      getItem(): string | null {
        throw new DOMException("Blocked", "SecurityError");
      },
      removeItem(): void {
        throw new DOMException("Blocked", "SecurityError");
      }
    };

    expect(loadCachedInput(blocked, ref, 2_000)).toBeNull();
  });

  it("ignores blocked writes so analysis can continue", () => {
    const blocked = {
      setItem(): void {
        throw new DOMException("Blocked", "SecurityError");
      }
    };

    expect(() => saveCachedInput(blocked, ref, input, 1_000)).not.toThrow();
  });

  it("clears the repository cache and ignores blocked removals", () => {
    const storage = new MemoryStorage();
    saveCachedInput(storage, ref, input, 1_000);

    clearCachedInput(storage, ref);

    expect(storage.getItem("issueready:v1:acme/tool")).toBeNull();
    expect(() =>
      clearCachedInput(
        {
          removeItem(): void {
            throw new DOMException("Blocked", "SecurityError");
          }
        },
        ref
      )
    ).not.toThrow();
  });
});
