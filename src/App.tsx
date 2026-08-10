import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "./components/language-switcher";
import { RepoForm } from "./components/repo-form";
import { StatusAnnouncer } from "./components/status-announcer";
import { GitHubApiError, type Language } from "./features/analyzer/model";
import { repoRefFromSearch, toShareSearch } from "./features/analyzer/repo-url";
import { RepoUrlError } from "./features/analyzer/repo-url";
import { createAnalysisService } from "./features/analyzer/service";
import { useRepositoryAnalysis } from "./features/analyzer/use-repository-analysis";
import { messages } from "./i18n";

const analysisService = createAnalysisService();

const SEARCHED_LABELS = [
  "good first issue",
  "first timers only",
  "beginner",
  "beginner friendly",
  "help wanted"
].join(", ");

function browserLanguage(): Language {
  return typeof navigator !== "undefined" &&
    navigator.language.toLowerCase().startsWith("zh")
    ? "zh-CN"
    : "en";
}

function errorKey(error: unknown) {
  if (error instanceof RepoUrlError) return "invalid-url" as const;
  if (error instanceof GitHubApiError) return error.kind;
  return "unknown" as const;
}

export function App() {
  const [language, setLanguage] = useState<Language>(browserLanguage);
  const [sharedRef] = useState(() => repoRefFromSearch(window.location.search));
  const manualInput = useRef<string | null>(null);
  const { state, analyze } = useRepositoryAnalysis(analysisService);
  const copy = messages[language];
  const sharedUrl = sharedRef
    ? `https://github.com/${sharedRef.owner}/${sharedRef.repo}`
    : undefined;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (sharedUrl) void analyze(sharedUrl);
  }, [analyze, sharedUrl]);

  useEffect(() => {
    if (
      state.status !== "success" ||
      manualInput.current === null ||
      manualInput.current !== state.input
    ) {
      return;
    }

    const [owner, repo] = state.report.repository.fullName.split("/");
    if (owner && repo) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${toShareSearch({ owner, repo })}${window.location.hash}`
      );
    }
    manualInput.current = null;
  }, [state]);

  function submit(input: string) {
    manualInput.current = input;
    void analyze(input);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <p className="wordmark">{copy.brand}</p>
        <LanguageSwitcher language={language} onChange={setLanguage} />
      </header>

      <main className="main-shell" id="main-content">
        <section className="hero" aria-labelledby="page-title">
          <span aria-hidden="true" className="proof-rail" />
          <div className="hero-copy">
            <p aria-hidden="true" className="hero-kicker">
              {copy.brand} / 01
            </p>
            <h1 className="hero-title" id="page-title">
              {copy.brand}
            </h1>
            <p className="hero-intro">
              <strong>{copy.tagline}</strong> {copy.intro}
            </p>
          </div>

          <RepoForm
            defaultValue={sharedUrl}
            language={language}
            loading={state.status === "loading"}
            onSubmit={submit}
          />
        </section>

        <StatusAnnouncer language={language} state={state} />

        {state.status === "loading" ? (
          <section
            aria-busy="true"
            className="status-panel status-panel--loading"
          >
            <h2>{copy.loading[state.phase]}</h2>
          </section>
        ) : null}

        {state.status === "success" && state.report.assessments.length > 0 ? (
          <section className="status-panel">
            <h2>{state.report.repository.fullName}</h2>
            <p>{copy.resultCount(state.report.assessments.length)}</p>
            <p className="scope-note">{copy.scopeNotice}</p>
          </section>
        ) : null}

        {state.status === "success" && state.report.assessments.length === 0 ? (
          <section className="status-panel">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyBody}</p>
            <p className="label-list">
              {copy.searchedLabels}: {SEARCHED_LABELS}
            </p>
            <p className="scope-note">{copy.scopeNotice}</p>
          </section>
        ) : null}

        {state.status === "error" ? (
          <section className="status-panel status-panel--error" role="alert">
            <h2>{copy.errors[errorKey(state.error)]}</h2>
            {state.error instanceof GitHubApiError &&
            state.error.kind === "rate-limit" &&
            state.error.resetAt ? (
              <p>
                {copy.rateLimitReset(
                  new Intl.DateTimeFormat(language, {
                    hour: "numeric",
                    minute: "2-digit"
                  }).format(state.error.resetAt)
                )}
              </p>
            ) : null}
          </section>
        ) : null}
      </main>

      <footer className="site-footer" id="methodology">
        <p>{copy.methodology}</p>
        <p>{copy.privacy}</p>
      </footer>
    </div>
  );
}
