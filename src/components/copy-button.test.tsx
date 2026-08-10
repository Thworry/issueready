import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard"
);
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("CopyButton", () => {
  it("copies exact text, announces success, and resets after two seconds", async () => {
    vi.useFakeTimers();
    render(
      <CopyButton
        copiedLabel="Copied"
        errorLabel="Could not copy"
        idleLabel="Copy checklist"
        text="- [ ] Verification"
      />
    );

    expect(
      screen.getByRole("button", { name: "Copy checklist" })
    ).toBeEnabled();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    fireEvent.click(screen.getByRole("button", { name: "Copy checklist" }));
    await act(async () => Promise.resolve());

    expect(writeText).toHaveBeenCalledWith("- [ ] Verification");
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    act(() => vi.advanceTimersByTime(2_000));
    expect(
      screen.getByRole("button", { name: "Copy checklist" })
    ).toBeVisible();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("uses the supplied localized failure message", async () => {
    writeText.mockRejectedValue(new Error("permission denied"));
    render(
      <CopyButton
        copiedLabel="已复制"
        errorLabel="复制失败"
        idleLabel="复制完善清单"
        text="测试"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "复制完善清单" }));

    expect(
      await screen.findByRole("button", { name: "复制失败" })
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("复制失败");
    expect(screen.queryByText("permission denied")).not.toBeInTheDocument();
  });

  it("clears its pending reset timer when unmounted", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <CopyButton
        copiedLabel="Copied"
        errorLabel="Could not copy"
        idleLabel="Copy checklist"
        text="checklist"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy checklist" }));
    await act(async () => Promise.resolve());
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
