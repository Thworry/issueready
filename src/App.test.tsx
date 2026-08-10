import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows one primary analysis action", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "IssueReady" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Analyze repository" })
    ).toBeEnabled();
  });
});
