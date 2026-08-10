import type {
  AnalysisInput,
  AnalysisReport,
  RepoRef,
  RepoSnapshot
} from "./model";
import { loadCachedInput, saveCachedInput } from "./cache";
import { fetchRepoSnapshot } from "./github-client";
import { normalizeSnapshot } from "./normalize";
import { parseGitHubRepoUrl } from "./repo-url";
import { analyzeRepository } from "./rules";

export type AnalysisPhase = "validating" | "reading" | "assessing";

export interface AnalyzeOptions {
  force?: boolean;
  signal?: AbortSignal;
  onPhase?: (phase: AnalysisPhase) => void;
}

export interface AnalysisService {
  analyze(input: string, options?: AnalyzeOptions): Promise<AnalysisReport>;
}

export interface AnalysisDependencies {
  fetchSnapshot: (ref: RepoRef, signal?: AbortSignal) => Promise<RepoSnapshot>;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  now: () => Date;
}

export function createAnalysisService(
  deps: AnalysisDependencies = {
    fetchSnapshot: (ref, signal) => fetchRepoSnapshot(ref, signal),
    storage: window.sessionStorage,
    now: () => new Date()
  }
): AnalysisService {
  return {
    async analyze(input, options = {}) {
      options.onPhase?.("validating");
      const ref = parseGitHubRepoUrl(input);
      const now = deps.now();
      let normalized: AnalysisInput | null = options.force
        ? null
        : loadCachedInput(deps.storage, ref, now.getTime());

      if (!normalized) {
        options.onPhase?.("reading");
        normalized = normalizeSnapshot(
          await deps.fetchSnapshot(ref, options.signal)
        );
        saveCachedInput(deps.storage, ref, normalized, now.getTime());
      }

      options.onPhase?.("assessing");
      return analyzeRepository(normalized, now);
    }
  };
}
