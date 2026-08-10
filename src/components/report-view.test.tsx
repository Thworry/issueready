import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AnalysisReport,
  Classification,
  IssueAssessment,
  SignalKey
} from "../features/analyzer/model";
import { ReportView } from "./report-view";

const NOW = new Date("2026-08-10T12:00:00Z");
const signalKeys: SignalKey[] = [
  "specific-title",
  "context",
  "bounded-task",
  "acceptance",
  "verification",
  "location",
  "freshness",
  "available"
];

function item(
  number: number,
  title: string,
  classification: Classification,
  score: number
): IssueAssessment {
  return {
    issue: {
      number,
      title,
      url: `https://github.com/acme/tool/issues/${number}`,
      body: `remote body ${number}`,
      labels: ["good first issue"],
      updatedAt: new Date("2026-08-09T12:00:00Z"),
      assigneeCount: 0
    },
    score,
    classification,
    signals: signalKeys.map((key) => ({
      key,
      earned: 0,
      available: key === "acceptance" ? 20 : key === "available" ? 5 : 10,
      passed: false,
      evidence: `${key}:missing`
    })),
    missingSignals: signalKeys,
    warnings: []
  };
}

function report(): AnalysisReport {
  return {
    repository: {
      fullName: "acme/tool",
      url: "https://github.com/acme/tool",
      description: "A public project",
      archived: false,
      pushedAt: new Date("2026-08-09T12:00:00Z"),
      openItemCount: 4,
      readme: "present",
      contributing: "present",
      license: "present"
    },
    assessments: [
      item(8, "Stale eighth", "possibly-stale", 90),
      item(5, "Ready fifth", "ready", 80),
      item(3, "Needs third", "needs-work", 85),
      item(2, "Ready second", "ready", 80)
    ],
    counts: { ready: 2, "needs-work": 1, "possibly-stale": 1 },
    inspectedItemCount: 9,
    apiScopeLimit: 100
  };
}

afterEach(cleanup);

describe("ReportView", () => {
  it("shows all counts and deterministically sorts the default all view", () => {
    render(
      <ReportView
        language="en"
        now={NOW}
        onRefresh={vi.fn()}
        report={report()}
      />
    );

    expect(
      screen.getByRole("button", { name: "All issues 4" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ready 2" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Needs work 1" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Possibly stale 1" })
    ).toBeVisible();

    expect(
      screen
        .getAllByRole("article")
        .map(
          (article) =>
            within(article).getByRole("heading", { level: 3 }).textContent
        )
    ).toEqual([
      "#2 Ready second",
      "#5 Ready fifth",
      "#3 Needs third",
      "#8 Stale eighth"
    ]);
  });

  it("derives a filtered view without duplicating report state", async () => {
    const user = userEvent.setup();
    render(
      <ReportView
        language="en"
        now={NOW}
        onRefresh={vi.fn()}
        report={report()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Needs work 1" }));

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "#3 Needs third" })
    ).toBeVisible();
    expect(screen.queryByText("Ready second")).not.toBeInTheDocument();
  });

  it("discloses scope, links safely in-page, and explains the ruleset", () => {
    render(
      <ReportView
        language="en"
        now={NOW}
        onRefresh={vi.fn()}
        report={report()}
      />
    );

    expect(
      screen.getByText(
        "IssueReady inspected only the 100 most recently updated open items returned by GitHub and removed pull requests locally. Older issues may be omitted."
      )
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "How scoring works" })
    ).toHaveAttribute("href", "#methodology");

    const methodology = screen.getByRole("region", {
      name: "How scoring works"
    });
    expect(methodology).toHaveAttribute("id", "methodology");
    expect(within(methodology).getByText(/Ruleset 1\.0\.0/)).toBeVisible();
    expect(
      within(methodology).getByText(/Possibly stale takes precedence/)
    ).toBeVisible();
    expect(within(methodology).getByText(/score of at least 70/)).toBeVisible();
    expect(within(methodology).getAllByRole("listitem")).toHaveLength(8);
    expect(
      within(methodology).getByText("Acceptance criteria — 20 points")
    ).toBeVisible();
  });

  it("calls the refresh action", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(
      <ReportView
        language="en"
        now={NOW}
        onRefresh={onRefresh}
        report={report()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Refresh public data" })
    );
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
