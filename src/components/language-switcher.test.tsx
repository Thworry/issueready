import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "./language-switcher";

afterEach(cleanup);

describe("LanguageSwitcher", () => {
  it("exposes text-labelled pressed states and reports a language change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageSwitcher language="en" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const chinese = screen.getByRole("button", { name: "Simplified Chinese" });
    expect(chinese).toHaveAttribute("aria-pressed", "false");

    await user.click(chinese);
    expect(onChange).toHaveBeenCalledWith("zh-CN");
  });
});
