import type { AnalysisState } from "../features/analyzer/use-repository-analysis";
import type { Language } from "../features/analyzer/model";
import { messages } from "../i18n";

interface StatusAnnouncerProps {
  state: AnalysisState;
  language: Language;
}

export function StatusAnnouncer({ state, language }: StatusAnnouncerProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="sr-status"
      role="status"
    >
      {state.status === "loading"
        ? messages[language].loading[state.phase]
        : ""}
    </div>
  );
}
