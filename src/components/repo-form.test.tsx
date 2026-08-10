import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepoForm } from "./repo-form";

afterEach(cleanup);

describe("RepoForm", () => {
  it("submits the value from its visibly labelled URL field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RepoForm language="en" loading={false} onSubmit={onSubmit} />);

    const input = screen.getByRole("textbox", {
      name: "Public GitHub repository"
    });
    await user.type(input, "https://github.com/ossf/scorecard");
    await user.click(
      screen.getByRole("button", { name: "Analyze repository" })
    );

    expect(onSubmit).toHaveBeenCalledWith("https://github.com/ossf/scorecard");
    expect(screen.getByText(/Paste the full URL/)).toHaveAttribute(
      "id",
      input.getAttribute("aria-describedby")
    );
  });

  it("shows inline validation and does not submit an empty value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RepoForm language="en" loading={false} onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("button", { name: "Analyze repository" })
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Enter a public GitHub repository URL/)
    ).toHaveAttribute("role", "alert");
    expect(
      screen.getByRole("textbox", { name: "Public GitHub repository" })
    ).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    [
      "firstcontributions/first-contributions",
      "https://github.com/firstcontributions/first-contributions"
    ],
    ["ossf/scorecard", "https://github.com/ossf/scorecard"]
  ])("fills the %s example", async (name, url) => {
    const user = userEvent.setup();
    render(<RepoForm language="en" loading={false} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name }));

    expect(
      screen.getByRole("textbox", { name: "Public GitHub repository" })
    ).toHaveValue(url);
  });

  it("disables form controls while analysis is loading", () => {
    render(<RepoForm language="en" loading onSubmit={vi.fn()} />);

    expect(
      screen.getByRole("textbox", { name: "Public GitHub repository" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Analyze repository" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "firstcontributions/first-contributions"
      })
    ).toBeDisabled();
  });

  it("states the read-only browser-to-GitHub privacy boundary", () => {
    render(<RepoForm language="en" loading={false} onSubmit={vi.fn()} />);

    expect(
      screen.getByText(
        "Read-only. No login. Data stays between your browser and GitHub."
      )
    ).toBeVisible();
  });
});
