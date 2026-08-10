import { describe, expect, it, vi } from "vitest";
import type { RepoSnapshot } from "./model";
import { RepoUrlError } from "./repo-url";
import {
  createAnalysisService,
  type AnalysisDependencies,
  type AnalysisPhase
} from "./service";

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

const NOW = new Date("2026-08-10T12:00:00Z");
const URL = "https://github.com/acme/tool";

function snapshot(
  fullName = "acme/tool",
  issueUpdatedAt = "2026-08-09T12:00:00Z"
): RepoSnapshot {
  return {
    repository: {
      full_name: fullName,
      html_url: `https://github.com/${fullName}`,
      description: "A useful public tool",
      archived: false,
      pushed_at: "2026-08-08T12:00:00Z",
      open_issues_count: 1,
      default_branch: "main"
    },
    community: {
      health_percentage: 100,
      files: {
        readme: { url: "api/readme", html_url: "web/readme" },
        contributing: {
          url: "api/contributing",
          html_url: "web/contributing"
        },
        license: { url: "api/license", html_url: "web/license" }
      }
    },
    issues: [
      {
        number: 7,
        title: "Document the repository analysis workflow",
        html_url: `https://github.com/${fullName}/issues/7`,
        body: [
          "## Context",
          "New contributors need a clear explanation of the analyzer workflow and its boundaries.",
          "## Task",
          "- [ ] Update `docs/analyzer.md` with the implementation steps.",
          "## Acceptance criteria",
          "The page explains every phase and expected result.",
          "## Verification",
          "Run the documentation tests and verify all links."
        ].join("\n"),
        labels: ["good first issue"],
        updated_at: issueUpdatedAt,
        assignees: []
      }
    ]
  };
}

function dependencies(
  fetchSnapshot = vi.fn<AnalysisDependencies["fetchSnapshot"]>()
): AnalysisDependencies {
  return {
    fetchSnapshot,
    storage: new MemoryStorage(),
    now: () => NOW
  };
}

async function withUnavailableSessionStorage(
  run: () => void | Promise<void>
): Promise<void> {
  const descriptor = Object.getOwnPropertyDescriptor(window, "sessionStorage");
  if (!descriptor) throw new Error("Expected jsdom to define sessionStorage");

  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    get() {
      throw new DOMException("Blocked", "SecurityError");
    }
  });

  try {
    await run();
  } finally {
    Object.defineProperty(window, "sessionStorage", descriptor);
  }
}

describe("analysis service", () => {
  it("creates the default service when the sessionStorage getter is unavailable", async () => {
    await withUnavailableSessionStorage(() => {
      expect(() => createAnalysisService()).not.toThrow();
    });
  });

  it("analyzes with three default GitHub calls when sessionStorage is unavailable", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/community/profile")) {
        return new Response(JSON.stringify(snapshot().community), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (url.includes("/issues?")) {
        return new Response(JSON.stringify(snapshot().issues), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify(snapshot().repository), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    vi.stubGlobal("fetch", fetcher);
    try {
      await withUnavailableSessionStorage(async () => {
        const service = createAnalysisService();

        const result = await service.analyze(URL);

        expect(result.repository.fullName).toBe("acme/tool");
        expect(result.assessments).toHaveLength(1);
        expect(fetcher).toHaveBeenCalledTimes(3);
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("validates, reads, assesses, caches, and then assesses a cache hit without fetching", async () => {
    const fetchSnapshot = vi.fn<AnalysisDependencies["fetchSnapshot"]>();
    fetchSnapshot.mockResolvedValue(snapshot());
    const deps = dependencies(fetchSnapshot);
    const service = createAnalysisService(deps);
    const firstPhases: AnalysisPhase[] = [];
    const secondPhases: AnalysisPhase[] = [];

    const first = await service.analyze(URL, {
      onPhase: (phase) => firstPhases.push(phase)
    });
    const second = await service.analyze(URL, {
      onPhase: (phase) => secondPhases.push(phase)
    });

    expect(firstPhases).toStrictEqual(["validating", "reading", "assessing"]);
    expect(secondPhases).toStrictEqual(["validating", "assessing"]);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).toHaveBeenCalledWith(
      { owner: "acme", repo: "tool" },
      undefined
    );
    expect(second).toStrictEqual(first);
    expect(deps.storage.getItem("issueready:v1:acme/tool")).not.toBeNull();
  });

  it("force bypasses the cache, refetches, and overwrites the stored input", async () => {
    const fetchSnapshot = vi.fn<AnalysisDependencies["fetchSnapshot"]>();
    fetchSnapshot
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValueOnce(snapshot("acme/tool-renamed"));
    const deps = dependencies(fetchSnapshot);
    const service = createAnalysisService(deps);
    await service.analyze(URL);
    const phases: AnalysisPhase[] = [];

    const forced = await service.analyze(URL, {
      force: true,
      onPhase: (phase) => phases.push(phase)
    });
    const cached = await service.analyze(URL);

    expect(phases).toStrictEqual(["validating", "reading", "assessing"]);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(forced.repository.fullName).toBe("acme/tool-renamed");
    expect(cached.repository.fullName).toBe("acme/tool-renamed");
  });

  it("rejects invalid input before reading cache or fetching", async () => {
    const deps = dependencies();
    const service = createAnalysisService(deps);
    const phases: AnalysisPhase[] = [];

    await expect(
      service.analyze("not a repository", {
        onPhase: (phase) => phases.push(phase)
      })
    ).rejects.toBeInstanceOf(RepoUrlError);

    expect(phases).toStrictEqual(["validating"]);
    expect(deps.fetchSnapshot).not.toHaveBeenCalled();
  });

  it("uses the injected time for deterministic issue classification", async () => {
    const fetchSnapshot = vi.fn<AnalysisDependencies["fetchSnapshot"]>();
    fetchSnapshot.mockResolvedValue(
      snapshot("acme/tool", "2026-02-01T00:00:00Z")
    );
    const service = createAnalysisService(dependencies(fetchSnapshot));

    const report = await service.analyze(URL);

    expect(report.assessments[0]?.classification).toBe("possibly-stale");
  });

  it("passes the caller's AbortSignal to the snapshot dependency unchanged", async () => {
    const fetchSnapshot = vi.fn<AnalysisDependencies["fetchSnapshot"]>();
    fetchSnapshot.mockResolvedValue(snapshot());
    const service = createAnalysisService(dependencies(fetchSnapshot));
    const controller = new AbortController();

    await service.analyze(URL, { signal: controller.signal });

    expect(fetchSnapshot).toHaveBeenCalledWith(
      { owner: "acme", repo: "tool" },
      controller.signal
    );
  });
});
