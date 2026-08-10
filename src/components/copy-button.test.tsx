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

function deferredCopy() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

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

  it("does not let an older success overwrite a newer failure", async () => {
    vi.useFakeTimers();
    const older = deferredCopy();
    const newer = deferredCopy();
    writeText
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);
    render(
      <CopyButton
        copiedLabel="Copied"
        errorLabel="Could not copy"
        idleLabel="Copy checklist"
        text="checklist"
      />
    );

    const button = screen.getByRole("button", { name: "Copy checklist" });
    fireEvent.click(button);
    fireEvent.click(button);

    await act(async () => {
      newer.reject(new Error("newer request failed"));
      await Promise.resolve();
    });
    expect(
      screen.getByRole("button", { name: "Could not copy" })
    ).toBeVisible();

    await act(async () => {
      older.resolve();
      await Promise.resolve();
    });
    expect(
      screen.getByRole("button", { name: "Could not copy" })
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Could not copy");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps only the latest timer across out-of-order success and invalidates requests on unmount", async () => {
    vi.useFakeTimers();
    const first = deferredCopy();
    const second = deferredCopy();
    const latest = deferredCopy();
    const cleanupRequest = deferredCopy();
    writeText
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockImplementationOnce(() => latest.promise)
      .mockImplementationOnce(() => cleanupRequest.promise);
    const { unmount } = render(
      <CopyButton
        copiedLabel="Copied"
        errorLabel="Could not copy"
        idleLabel="Copy checklist"
        text="checklist"
      />
    );

    const button = screen.getByRole("button", { name: "Copy checklist" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => {
      latest.resolve();
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(1_000));
    await act(async () => {
      first.resolve();
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole("button", { name: "Copy checklist" })
    ).toBeVisible();
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Copy checklist" }));
    await act(async () => {
      cleanupRequest.resolve();
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      second.resolve();
      await Promise.resolve();
    });
    act(() => vi.runAllTimers());
    expect(vi.getTimerCount()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
