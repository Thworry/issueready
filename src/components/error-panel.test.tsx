import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubApiError } from "../features/analyzer/model";
import { RepoUrlError } from "../features/analyzer/repo-url";
import { ErrorPanel } from "./error-panel";

afterEach(cleanup);

describe("ErrorPanel", () => {
  it("uses RepoUrlError semantics and does not offer an invalid URL retry", () => {
    render(
      <ErrorPanel error={new RepoUrlError()} language="en" onRetry={vi.fn()} />
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: /Enter a public GitHub repository URL/
      })
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Try again" })
    ).not.toBeInTheDocument();
  });

  it("reports a 404 without guessing private or deleted state", () => {
    render(
      <ErrorPanel
        error={new GitHubApiError("not-found", "raw 404", 404)}
        language="en"
        onRetry={vi.fn()}
      />
    );

    const panel = screen.getByRole("alert");
    expect(
      screen.getByRole("heading", {
        name: "GitHub returned 404 for this repository."
      })
    ).toBeVisible();
    expect(panel).not.toHaveTextContent(/private|deleted/i);
    expect(panel).not.toHaveTextContent("raw 404");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("localizes the rate-limit reset time and links official documentation", () => {
    const resetAt = new Date("2026-08-10T16:30:00Z");
    const expectedTime = new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(resetAt);
    render(
      <ErrorPanel
        error={
          new GitHubApiError("rate-limit", "raw rate details", 403, resetAt)
        }
        language="zh-CN"
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText(`请在 ${expectedTime} 后重试`)).toBeVisible();
    const docs = screen.getByRole("link", { name: "GitHub 请求限制文档" });
    expect(docs).toHaveAttribute(
      "href",
      "https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api"
    );
    expect(docs).toHaveAttribute("target", "_blank");
    expect(docs).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText("raw rate details")).not.toBeInTheDocument();
  });

  it("retries a recoverable network error", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorPanel
        error={new GitHubApiError("network", "offline")}
        language="en"
        onRetry={onRetry}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "GitHub could not be reached. Check your connection and retry."
      })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows an API status without leaking its raw message", () => {
    render(
      <ErrorPanel
        error={new GitHubApiError("api", "upstream internal details", 502)}
        language="en"
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "GitHub returned an unexpected response."
      })
    ).toBeVisible();
    expect(screen.getByText("HTTP 502")).toBeVisible();
    expect(
      screen.queryByText("upstream internal details")
    ).not.toBeInTheDocument();
  });

  it("does not expose unknown error messages or stacks", () => {
    const error = new Error("SECRET ERROR MESSAGE");
    error.stack = "SECRET STACK TRACE";
    render(<ErrorPanel error={error} language="en" onRetry={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "IssueReady could not complete the check."
      })
    ).toBeVisible();
    expect(screen.getByRole("alert")).not.toHaveTextContent(/SECRET/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
