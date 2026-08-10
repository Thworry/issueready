import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IssueAssessment,
  SignalKey,
  SignalResult
} from "../features/analyzer/model";
import { IssueCard } from "./issue-card";

const weights: Record<SignalKey, number> = {
  "specific-title": 10,
  context: 15,
  "bounded-task": 15,
  acceptance: 20,
  verification: 15,
  location: 10,
  freshness: 10,
  available: 5
};

function signal(key: SignalKey, passed: boolean): SignalResult {
  return {
    key,
    earned: passed ? weights[key] : 0,
    available: weights[key],
    passed,
    evidence: `${key}:${passed ? "passed" : "missing"}`
  };
}

function assessment(): IssueAssessment {
  const signals = (Object.keys(weights) as SignalKey[]).map((key) =>
    signal(key, key !== "acceptance" && key !== "verification")
  );

  return {
    issue: {
      number: 42,
      title: "Render <img alt='injected' src=x> as plain text",
      url: "https://github.com/acme/tool/issues/42",
      body: "REMOTE BODY SECRET <script>window.hacked=true</script>",
      labels: ["good first issue", "<svg><script>bad()</script></svg>"],
      updatedAt: new Date("2026-08-09T12:00:00Z"),
      assigneeCount: 0
    },
    score: 65,
    classification: "needs-work",
    signals,
    missingSignals: ["acceptance", "verification"],
    warnings: [
      "repository-archived",
      "repository-inactive",
      "prerequisites-incomplete"
    ]
  };
}

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("IssueCard", () => {
  it("renders all deterministic evidence without injecting remote text", () => {
    const { container } = render(
      <IssueCard assessment={assessment()} language="en" />
    );
    const article = screen.getByRole("article");
    const issueLink = within(article).getByRole("link", {
      name: /Render <img alt='injected' src=x> as plain text/
    });

    expect(issueLink).toHaveAttribute(
      "href",
      "https://github.com/acme/tool/issues/42"
    );
    expect(issueLink).toHaveAttribute("target", "_blank");
    expect(issueLink).toHaveAttribute("rel", "noopener noreferrer");
    const openGitHub = within(article).getByRole("link", {
      name: "Open on GitHub"
    });
    expect(openGitHub).toHaveAttribute(
      "href",
      "https://github.com/acme/tool/issues/42"
    );
    expect(openGitHub).toHaveAttribute("target", "_blank");
    expect(openGitHub).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(article).getByText("Needs work")).toBeVisible();
    expect(within(article).getByText("65/100")).toBeVisible();
    expect(within(article).getByText("Unassigned")).toBeVisible();
    expect(
      within(article).getByText("<svg><script>bad()</script></svg>")
    ).toBeVisible();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByText(/REMOTE BODY SECRET/)).not.toBeInTheDocument();

    const evidence = within(article).getByRole("list", {
      name: "Scoring evidence"
    });
    const rows = within(evidence).getAllByRole("listitem");
    expect(rows).toHaveLength(8);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Specific title.*Passed.*10\/10/),
      expect.stringMatching(/Context.*Passed.*15\/15/),
      expect.stringMatching(/Bounded task.*Passed.*15\/15/),
      expect.stringMatching(/Acceptance criteria.*Missing.*0\/20/),
      expect.stringMatching(/Verification.*Missing.*0\/15/),
      expect.stringMatching(/Location hint.*Passed.*10\/10/),
      expect.stringMatching(/Freshness.*Passed.*10\/10/),
      expect.stringMatching(/Available to claim.*Passed.*5\/5/)
    ]);
  });

  it("explains warnings and lists only missing checks in its checklist", () => {
    render(<IssueCard assessment={assessment()} language="en" />);

    expect(screen.getByText("Repository is archived")).toBeVisible();
    expect(
      screen.getByText("No repository push in more than 180 days")
    ).toBeVisible();
    expect(
      screen.getByText(
        "Contributor prerequisites are incomplete or unavailable"
      )
    ).toBeVisible();

    const checklist = screen.getByRole("list", {
      name: "Missing checks"
    });
    expect(within(checklist).getAllByRole("listitem")).toHaveLength(2);
    expect(within(checklist).getByText("Acceptance criteria")).toBeVisible();
    expect(within(checklist).getByText("Verification")).toBeVisible();
    expect(within(checklist).queryByText("Specific title")).toBeNull();
  });

  it("formats the update date and assignee state in the selected locale", () => {
    const assigned = assessment();
    assigned.issue.assigneeCount = 2;
    render(<IssueCard assessment={assigned} language="zh-CN" />);

    expect(
      screen.getByText(
        new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(
          assigned.issue.updatedAt
        )
      )
    ).toBeVisible();
    expect(screen.getByText("已有 2 人领取")).toBeVisible();
    expect(screen.getByText("需要完善")).toBeVisible();
    const openGitHub = screen.getByRole("link", { name: "在 GitHub 打开" });
    expect(openGitHub).toHaveAttribute(
      "href",
      "https://github.com/acme/tool/issues/42"
    );
    expect(openGitHub).toHaveAttribute("target", "_blank");
    expect(openGitHub).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("uses the singular English assignee noun for exactly one person", () => {
    const singular = assessment();
    singular.issue.assigneeCount = 1;
    const { rerender } = render(
      <IssueCard assessment={singular} language="en" />
    );

    expect(screen.getByText("Assigned to 1 person")).toBeVisible();
    expect(screen.queryByText("Assigned to 1 people")).toBeNull();

    const plural = assessment();
    plural.issue.assigneeCount = 2;
    rerender(<IssueCard assessment={plural} language="en" />);
    expect(screen.getByText("Assigned to 2 people")).toBeVisible();
  });

  it("copies only missing signals in display order and never the remote body", () => {
    const result = assessment();
    result.missingSignals = ["verification", "acceptance"];
    render(<IssueCard assessment={result} language="en" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy improvement checklist" })
    );

    expect(writeText).toHaveBeenCalledWith(
      "- [ ] Acceptance criteria\n- [ ] Verification"
    );
    const copied = writeText.mock.calls[0]?.[0] ?? "";
    expect(copied).not.toContain("Specific title");
    expect(copied).not.toContain("Context");
    expect(copied).not.toContain("REMOTE BODY SECRET");
    expect(copied).not.toContain("<script>");
  });
});
