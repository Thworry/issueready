import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisReport } from "./model";
import type { AnalyzeOptions, AnalysisService } from "./service";
import { useRepositoryAnalysis } from "./use-repository-analysis";

const FIRST_URL = "https://github.com/acme/first";
const SECOND_URL = "https://github.com/acme/second";

function report(fullName: string): AnalysisReport {
  return {
    repository: {
      fullName,
      url: `https://github.com/${fullName}`,
      description: "A useful tool",
      archived: false,
      pushedAt: new Date("2026-08-09T12:00:00Z"),
      openItemCount: 0,
      readme: "present",
      contributing: "present",
      license: "present"
    },
    assessments: [],
    counts: { ready: 0, "needs-work": 0, "possibly-stale": 0 },
    inspectedItemCount: 0,
    apiScopeLimit: 100
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

interface ControlledCall extends Deferred<AnalysisReport> {
  input: string;
  options: AnalyzeOptions | undefined;
}

function controlledService(): {
  service: AnalysisService;
  calls: ControlledCall[];
} {
  const calls: ControlledCall[] = [];
  const analyze = vi.fn((input: string, options?: AnalyzeOptions) => {
    const control = deferred<AnalysisReport>();
    calls.push({ input, options, ...control });
    return control.promise;
  });
  return { service: { analyze }, calls };
}

describe("useRepositoryAnalysis", () => {
  it("moves from idle through every phase to success", async () => {
    const { service, calls } = controlledService();
    const { result } = renderHook(() => useRepositoryAnalysis(service));
    expect(result.current.state).toStrictEqual({ status: "idle" });

    let analysis!: Promise<void>;
    act(() => {
      analysis = result.current.analyze(FIRST_URL);
    });
    expect(result.current.state).toStrictEqual({
      status: "loading",
      input: FIRST_URL,
      phase: "validating"
    });

    act(() => calls[0]?.options?.onPhase?.("reading"));
    expect(result.current.state).toMatchObject({
      status: "loading",
      input: FIRST_URL,
      phase: "reading"
    });

    act(() => calls[0]?.options?.onPhase?.("assessing"));
    expect(result.current.state).toMatchObject({
      status: "loading",
      input: FIRST_URL,
      phase: "assessing"
    });

    const success = report("acme/first");
    await act(async () => {
      calls[0]?.resolve(success);
      await analysis;
    });
    expect(result.current.state).toStrictEqual({
      status: "success",
      input: FIRST_URL,
      report: success
    });
  });

  it("exposes a current request failure as an error state", async () => {
    const { service, calls } = controlledService();
    const { result } = renderHook(() => useRepositoryAnalysis(service));
    const failure = new Error("GitHub unavailable");
    let analysis!: Promise<void>;

    act(() => {
      analysis = result.current.analyze(FIRST_URL);
    });
    await act(async () => {
      calls[0]?.reject(failure);
      await analysis;
    });

    expect(result.current.state).toStrictEqual({
      status: "error",
      input: FIRST_URL,
      error: failure
    });
  });

  it("aborts the earlier request and prevents its late success replacing the second", async () => {
    const { service, calls } = controlledService();
    const { result } = renderHook(() => useRepositoryAnalysis(service));
    let firstAnalysis!: Promise<void>;
    let secondAnalysis!: Promise<void>;

    act(() => {
      firstAnalysis = result.current.analyze(FIRST_URL);
    });
    const firstSignal = calls[0]?.options?.signal;
    act(() => {
      secondAnalysis = result.current.analyze(SECOND_URL);
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(calls[1]?.options?.signal?.aborted).toBe(false);

    const secondReport = report("acme/second");
    await act(async () => {
      calls[1]?.resolve(secondReport);
      await secondAnalysis;
    });
    await act(async () => {
      calls[0]?.resolve(report("acme/first"));
      await firstAnalysis;
    });

    expect(result.current.state).toStrictEqual({
      status: "success",
      input: SECOND_URL,
      report: secondReport
    });
  });

  it("aborts an in-flight request on unmount", async () => {
    const { service, calls } = controlledService();
    const { result, unmount } = renderHook(() =>
      useRepositoryAnalysis(service)
    );
    let analysis!: Promise<void>;

    act(() => {
      analysis = result.current.analyze(FIRST_URL);
    });
    const signal = calls[0]?.options?.signal;
    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => {
      calls[0]?.resolve(report("acme/first"));
      await analysis;
    });
  });

  it("ignores stale phases and errors from the first request", async () => {
    const { service, calls } = controlledService();
    const { result } = renderHook(() => useRepositoryAnalysis(service));
    let firstAnalysis!: Promise<void>;
    let secondAnalysis!: Promise<void>;

    act(() => {
      firstAnalysis = result.current.analyze(FIRST_URL);
      secondAnalysis = result.current.analyze(SECOND_URL);
    });
    expect(result.current.state).toMatchObject({
      status: "loading",
      input: SECOND_URL,
      phase: "validating"
    });

    act(() => calls[0]?.options?.onPhase?.("assessing"));
    expect(result.current.state).toMatchObject({
      status: "loading",
      input: SECOND_URL,
      phase: "validating"
    });

    await act(async () => {
      calls[0]?.reject(new Error("late first failure"));
      await firstAnalysis;
    });
    expect(result.current.state).toMatchObject({
      status: "loading",
      input: SECOND_URL,
      phase: "validating"
    });

    act(() => calls[1]?.options?.onPhase?.("reading"));
    const success = report("acme/second");
    await act(async () => {
      calls[1]?.resolve(success);
      await secondAnalysis;
    });
    expect(result.current.state).toStrictEqual({
      status: "success",
      input: SECOND_URL,
      report: success
    });
  });

  it("forwards force to the service", async () => {
    const { service, calls } = controlledService();
    const { result } = renderHook(() => useRepositoryAnalysis(service));
    let analysis!: Promise<void>;

    act(() => {
      analysis = result.current.analyze(FIRST_URL, true);
    });
    expect(calls[0]?.options?.force).toBe(true);

    await act(async () => {
      calls[0]?.resolve(report("acme/first"));
      await analysis;
    });
  });
});
