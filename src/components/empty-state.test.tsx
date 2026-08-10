import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty-state";

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

describe("EmptyState", () => {
  it("shows the exact normalized candidate labels and copies the English template", () => {
    render(<EmptyState language="en" />);

    expect(
      screen.getByRole("heading", {
        name: "No beginner-labelled issues found"
      })
    ).toBeVisible();
    const labels = screen.getByRole("list", { name: "Labels checked" });
    expect(
      within(labels)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual([
      "good first issue",
      "first timers only",
      "beginner",
      "beginner friendly",
      "help wanted"
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy improvement checklist" })
    );
    expect(writeText).toHaveBeenCalledWith(`## Background

Explain why this change matters.

## Task

- [ ] Describe the bounded change.

## Acceptance criteria

- [ ] State the observable result.

## Verification

Explain how a contributor and reviewer can verify the change.`);
    expect(writeText.mock.calls[0]?.[0]).not.toContain("## 背景");
  });

  it("copies only the natural Simplified Chinese template", () => {
    render(<EmptyState language="zh-CN" />);

    fireEvent.click(screen.getByRole("button", { name: "复制完善清单" }));

    expect(writeText).toHaveBeenCalledWith(`## 背景

说明为什么这项改动很重要。

## 任务

- [ ] 描述范围明确的改动。

## 验收标准

- [ ] 说明可观察的结果。

## 验证

说明贡献者和审核者如何验证这项改动。`);
    expect(writeText.mock.calls[0]?.[0]).not.toContain("## Background");
  });
});
