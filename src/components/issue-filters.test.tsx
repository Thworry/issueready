import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IssueFilters } from "./issue-filters";

const counts = { ready: 2, "needs-work": 3, "possibly-stale": 1 } as const;

afterEach(cleanup);

describe("IssueFilters", () => {
  it("shows visible counts and changes the filter with a pointer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IssueFilters
        active="all"
        counts={counts}
        language="en"
        onChange={onChange}
      />
    );

    expect(
      screen.getByRole("button", { name: "All issues 6" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ready 2" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Needs work 3" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Possibly stale 1" })
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Needs work 3" }));
    expect(onChange).toHaveBeenCalledWith("needs-work");
  });

  it("uses native button keyboard activation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IssueFilters
        active="ready"
        counts={counts}
        language="en"
        onChange={onChange}
      />
    );

    const ready = screen.getByRole("button", { name: "Ready 2" });
    const stale = screen.getByRole("button", { name: "Possibly stale 1" });
    ready.focus();
    await user.keyboard("{Enter}");
    stale.focus();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenNthCalledWith(1, "ready");
    expect(onChange).toHaveBeenNthCalledWith(2, "possibly-stale");
  });
});
