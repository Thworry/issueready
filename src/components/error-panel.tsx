import { GitHubApiError, type Language } from "../features/analyzer/model";
import { RepoUrlError } from "../features/analyzer/repo-url";
import { messages } from "../i18n";

const RATE_LIMIT_DOCS =
  "https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api";

const localCopy: Record<
  Language,
  { notFound: string; retry: string; rateDocs: string }
> = {
  en: {
    notFound: "GitHub returned 404 for this repository.",
    retry: "Try again",
    rateDocs: "GitHub rate limit documentation"
  },
  "zh-CN": {
    notFound: "GitHub 对此仓库返回了 404。",
    retry: "重试",
    rateDocs: "GitHub 请求限制文档"
  }
};

interface ErrorPanelProps {
  error: unknown;
  language: Language;
  onRetry: () => void;
}

export function ErrorPanel({ error, language, onRetry }: ErrorPanelProps) {
  const copy = messages[language];
  const panelCopy = localCopy[language];
  const invalidUrl = error instanceof RepoUrlError;
  const githubError = error instanceof GitHubApiError ? error : null;
  const kind = invalidUrl ? "invalid-url" : (githubError?.kind ?? "unknown");
  const title = kind === "not-found" ? panelCopy.notFound : copy.errors[kind];
  const resetAt =
    githubError?.kind === "rate-limit" &&
    githubError.resetAt &&
    Number.isFinite(githubError.resetAt.getTime())
      ? githubError.resetAt
      : null;

  return (
    <section
      className="status-panel status-panel--error error-panel"
      role="alert"
    >
      <h2>{title}</h2>

      {githubError?.kind === "api" && githubError.status ? (
        <p>HTTP {githubError.status}</p>
      ) : null}

      {resetAt ? (
        <p>
          {copy.rateLimitReset(
            new Intl.DateTimeFormat(language, {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(resetAt)
          )}
        </p>
      ) : null}

      {githubError?.kind === "rate-limit" ? (
        <p>
          <a href={RATE_LIMIT_DOCS} rel="noopener noreferrer" target="_blank">
            {panelCopy.rateDocs}
          </a>
        </p>
      ) : null}

      {!invalidUrl ? (
        <button
          className="example-action error-panel__retry"
          onClick={onRetry}
          type="button"
        >
          {panelCopy.retry}
        </button>
      ) : null}
    </section>
  );
}
