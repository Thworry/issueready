import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisReport } from "./model";
import type { AnalysisPhase, AnalysisService } from "./service";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; input: string; phase: AnalysisPhase }
  | { status: "success"; input: string; report: AnalysisReport }
  | { status: "error"; input: string; error: unknown };

export function useRepositoryAnalysis(service: AnalysisService) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);

  const analyze = useCallback(
    async (input: string, force = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const request = ++requestRef.current;
      setState({ status: "loading", input, phase: "validating" });

      try {
        const report = await service.analyze(input, {
          force,
          signal: controller.signal,
          onPhase: (phase) => {
            if (request === requestRef.current && !controller.signal.aborted) {
              setState({ status: "loading", input, phase });
            }
          }
        });

        if (request === requestRef.current && !controller.signal.aborted) {
          setState({ status: "success", input, report });
        }
      } catch (error) {
        if (
          request === requestRef.current &&
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setState({ status: "error", input, error });
        }
      }
    },
    [service]
  );

  useEffect(() => () => controllerRef.current?.abort(), []);
  return { state, analyze };
}
