import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalysisReport } from "../features/analyzer/model";
import { RepositorySummary } from "./repository-summary";

const NOW = new Date("2026-08-10T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function report(
  overrides: Partial<AnalysisReport["repository"]> = {}
): AnalysisReport {
  return {
    repository: {
      fullName: "acme/tool",
      url: "https://github.com/acme/tool",
      description: "A small public contributor tool",
      archived: false,
      pushedAt: new Date(NOW.getTime() - 180 * DAY_MS),
      openItemCount: 3,
      readme: "present",
      contributing: "missing",
      license: "unknown",
      ...overrides
    },
    assessments: [],
    counts: { ready: 0, "needs-work": 0, "possibly-stale": 0 },
    inspectedItemCount: 3,
    apiScopeLimit: 100
  };
}

afterEach(cleanup);

describe("RepositorySummary", () => {
  it("renders safe repository details and exact prerequisite states", () => {
    render(<RepositorySummary language="en" now={NOW} report={report()} />);

    expect(screen.getByRole("link", { name: "acme/tool" })).toHaveAttribute(
      "href",
      "https://github.com/acme/tool"
    );
    expect(screen.getByRole("link", { name: "acme/tool" })).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
    expect(screen.getByText("A small public contributor tool")).toBeVisible();

    expect(screen.getByText("README").nextElementSibling).toHaveTextContent(
      "Present"
    );
    expect(
      screen.getByText("Contribution guide").nextElementSibling
    ).toHaveTextContent("Missing");
    expect(screen.getByText("License").nextElementSibling).toHaveTextContent(
      "Unavailable"
    );
    expect(screen.getAllByText("Missing")).toHaveLength(1);
    expect(
      screen.queryByText("No repository push in more than 180 days")
    ).not.toBeInTheDocument();
  });

  it("warns for archived and strictly older-than-180-day repositories", () => {
    render(
      <RepositorySummary
        language="en"
        now={NOW}
        report={report({
          archived: true,
          pushedAt: new Date(NOW.getTime() - 181 * DAY_MS)
        })}
      />
    );

    expect(screen.getByText("Repository is archived")).toBeVisible();
    expect(
      screen.getByText("No repository push in more than 180 days")
    ).toBeVisible();
  });
});
