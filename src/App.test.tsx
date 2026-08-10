import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubApiError, type AnalysisReport } from "./features/analyzer/model";
import { RepoUrlError } from "./features/analyzer/repo-url";

const mocks = vi.hoisted(() => ({
  analyze: vi.fn()
}));

vi.mock("./features/analyzer/service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./features/analyzer/service")>();
  return {
    ...original,
    createAnalysisService: () => ({ analyze: mocks.analyze })
  };
});

import { App } from "./App";

function report(fullName: string, assessmentCount = 1): AnalysisReport {
  return {
    repository: {
      fullName,
      url: `https://github.com/${fullName}`,
      description: "A public project",
      archived: false,
      pushedAt: new Date("2026-08-09T12:00:00Z"),
      openItemCount: assessmentCount,
      readme: "present",
      contributing: "present",
      license: "present"
    },
    assessments:
      assessmentCount === 0
        ? []
        : [
            {
              issue: {
                number: 1,
                title: "Document the contributor workflow",
                url: `https://github.com/${fullName}/issues/1`,
                body: "",
                labels: ["good first issue"],
                updatedAt: new Date("2026-08-09T12:00:00Z"),
                assigneeCount: 0
              },
              score: 80,
              classification: "ready",
              signals: [],
              missingSignals: [],
              warnings: []
            }
          ],
    counts: {
      ready: assessmentCount,
      "needs-work": 0,
      "possibly-stale": 0
    },
    inspectedItemCount: assessmentCount,
    apiScopeLimit: 100
  };
}

beforeEach(() => {
  mocks.analyze.mockReset();
  mocks.analyze.mockResolvedValue(report("acme/tool"));
  window.history.replaceState(null, "", "/");
  document.documentElement.lang = "en";
});

afterEach(cleanup);

describe("App", () => {
  it("renders a semantic English landing shell with one primary action", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "IssueReady" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Analyze repository" })
    ).toBeEnabled();
    expect(screen.getByRole("main")).toBeVisible();
    expect(screen.getAllByText(/Read-only\. No login\./)[0]).toBeVisible();
  });

  it("switches copy and synchronizes the document language", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Simplified Chinese" })
    );

    expect(screen.getByRole("button", { name: "分析仓库" })).toBeEnabled();
    expect(document.documentElement.lang).toBe("zh-CN");
  });

  it("starts in Chinese when the browser language begins with zh", () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "language");
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "zh-Hans-CN"
    });

    try {
      render(<App />);
      expect(screen.getByRole("button", { name: "分析仓库" })).toBeEnabled();
    } finally {
      if (descriptor) {
        Object.defineProperty(navigator, "language", descriptor);
      } else {
        Reflect.deleteProperty(navigator, "language");
      }
    }
  });

  it("auto-analyzes a valid shared slug as a canonical GitHub URL", async () => {
    window.history.replaceState(null, "", "/?repo=ossf%2Fscorecard");
    mocks.analyze.mockResolvedValue(report("ossf/scorecard"));

    render(<App />);

    await waitFor(() => {
      expect(mocks.analyze).toHaveBeenCalledWith(
        "https://github.com/ossf/scorecard",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
    expect(
      await screen.findByRole("heading", { name: "ossf/scorecard" })
    ).toBeVisible();
  });

  it("updates the share search only after a successful manual analysis", async () => {
    const user = userEvent.setup();
    mocks.analyze.mockResolvedValue(report("acme/tool"));
    render(<App />);

    await user.type(
      screen.getByRole("textbox", { name: "Public GitHub repository" }),
      "https://github.com/acme/tool"
    );
    await user.click(
      screen.getByRole("button", { name: "Analyze repository" })
    );

    expect(
      await screen.findByRole("heading", { name: "acme/tool" })
    ).toBeVisible();
    expect(window.location.search).toBe("?repo=acme%2Ftool");
  });

  it("renders a minimal localized empty status", async () => {
    mocks.analyze.mockResolvedValue(report("acme/empty", 0));
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByRole("textbox", { name: "Public GitHub repository" }),
      "https://github.com/acme/empty"
    );
    await user.click(
      screen.getByRole("button", { name: "Analyze repository" })
    );

    expect(
      await screen.findByRole("heading", {
        name: "No beginner-labelled issues found"
      })
    ).toBeVisible();
  });

  it("announces the current loading phase without moving focus", async () => {
    const user = userEvent.setup();
    let resolve!: (value: AnalysisReport) => void;
    mocks.analyze.mockImplementation(
      () =>
        new Promise<AnalysisReport>((resolvePromise) => {
          resolve = resolvePromise;
        })
    );
    render(<App />);

    const input = screen.getByRole("textbox", {
      name: "Public GitHub repository"
    });
    await user.type(input, "https://github.com/acme/tool");
    const submit = screen.getByRole("button", { name: "Analyze repository" });
    await user.click(submit);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Validating repository"
    );
    expect(document.activeElement).toBe(submit);
    resolve(report("acme/tool"));
    await screen.findByRole("heading", { name: "acme/tool" });
  });

  it("renders a minimal localized invalid URL error", async () => {
    const user = userEvent.setup();
    mocks.analyze.mockRejectedValue(new RepoUrlError());
    render(<App />);

    await user.type(
      screen.getByRole("textbox", { name: "Public GitHub repository" }),
      "not-a-repository"
    );
    await user.click(
      screen.getByRole("button", { name: "Analyze repository" })
    );

    expect(
      await screen.findByRole("heading", {
        name: /Enter a public GitHub repository URL/
      })
    ).toBeVisible();
  });

  it("shows a local retry time for GitHub rate limits", async () => {
    const user = userEvent.setup();
    mocks.analyze.mockRejectedValue(
      new GitHubApiError(
        "rate-limit",
        "limit reached",
        403,
        new Date("2026-08-10T16:30:00Z")
      )
    );
    render(<App />);

    await user.type(
      screen.getByRole("textbox", { name: "Public GitHub repository" }),
      "https://github.com/acme/tool"
    );
    await user.click(
      screen.getByRole("button", { name: "Analyze repository" })
    );

    expect(
      await screen.findByRole("heading", {
        name: "GitHub request limit reached."
      })
    ).toBeVisible();
    expect(screen.getByText(/^Try again after /)).toBeVisible();
  });
});
