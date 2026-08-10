# IssueReady architecture

IssueReady is a static React application. Analysis runs entirely in the browser; there is no application backend, database, account system, analytics service, or token exchange.

## Data flow

After validating a public GitHub repository URL, one fresh analysis sends these three read-only requests in parallel:

```text
GET https://api.github.com/repos/{owner}/{repo}
GET https://api.github.com/repos/{owner}/{repo}/community/profile
GET https://api.github.com/repos/{owner}/{repo}/issues?state=open&sort=updated&direction=desc&per_page=100
```

The repository response supplies identity, description, archive state, last-push time, and open-item count. The community profile supplies README, contribution-guide, and license presence. The issues response supplies the latest 100 open items; IssueReady removes pull requests and selects supported labels locally.

All calls are unauthenticated and use GitHub's `application/vnd.github+json` media type and REST API version `2022-11-28`. No write endpoint is called. A repository or issues failure stops the analysis with an explicit not-found, rate-limit, network, or API state. A community-profile failure degrades only its three file states to `unknown`; an abort still cancels the entire operation.

```text
validated github.com URL
          │
          ▼
three public GitHub GET requests
          │
          ▼
normalize labels, dates, files, and issues
          │
          ├── save normalized public input in sessionStorage (10-minute TTL)
          ▼
deterministic ruleset 1.0.0
          │
          ▼
React renders text-only bilingual report
```

## Module boundaries

- `src/features/analyzer/repo-url.ts` accepts only the supported GitHub repository URL shape and creates/parses the share query.
- `src/features/analyzer/github-client.ts` owns the three REST requests and converts transport/status failures into typed application errors.
- `src/features/analyzer/normalize.ts` removes pull requests, normalizes labels and dates, selects candidates, and assigns contributor-file states.
- `src/features/analyzer/cache.ts` serializes and validates normalized public analysis input in session storage.
- `src/features/analyzer/rules.ts` contains the versioned, deterministic signals, warnings, scores, and classification precedence.
- `src/features/analyzer/service.ts` sequences validation, cache lookup, fetching, normalization, caching, and assessment.
- `src/features/analyzer/use-repository-analysis.ts` owns cancellable React lifecycle state and prevents stale results from replacing newer ones.
- `src/components/` renders forms, state panels, repository summaries, filters, issue cards, copy actions, and methodology disclosure.
- `src/App.tsx` composes the page, language choice, shared-query startup, retry, and forced refresh.

The full scoring contract is documented in [methodology.md](methodology.md).

## Cache and browser state

The cache key is scoped to `issueready:v1:{owner}/{repo}`. The cached payload is normalized public repository and issue data plus its save time. Entries are accepted for at most 10 minutes (600,000 milliseconds); an entry older than that, from the future, malformed, or containing invalid dates/shapes is removed. Storage access is optional: privacy settings or quota failures cannot prevent analysis.

The cache is `sessionStorage`, so it is scoped to the site's origin and browser-tab session rather than shared with an IssueReady server. A normal repeat analysis can use the cache without GitHub requests. **Refresh public data** bypasses the cache and overwrites it after a successful fetch.

After a successful manual analysis, `history.replaceState` records only `?repo=owner%2Frepository`. The repository slug is therefore shareable and can appear in browser history; report contents and scores are not encoded into the URL.

## Cancellation and concurrency

Every analysis owns an `AbortController`. Starting another analysis aborts the previous controller, and unmounting the analysis hook aborts in-flight work. A request identifier prevents an earlier promise from replacing the state of a later analysis even if a dependency does not honor cancellation. Abort errors are preserved instead of being converted to network errors.

## Content Security Policy

Production builds inject this policy as a `<meta http-equiv="Content-Security-Policy">` element:

```text
default-src 'self';
connect-src 'self' https://api.github.com;
img-src 'self' data:;
style-src 'self';
script-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests
```

Development omits the meta policy so Vite can provide hot-module replacement. The production application has no inline scripts or styles and loads no remote font, script, stylesheet, or image. GitHub API access is the only cross-origin connection allowed by the application policy.

## Threat boundaries

IssueReady treats all user and GitHub content as untrusted.

- Input parsing permits only HTTPS `github.com` URLs with exactly two path segments. Credentials, non-default ports, query strings, fragments, subdomains, extra paths, backslashes, and non-GitHub hosts are rejected before network access. An explicit default HTTPS port (`:443`) canonicalizes to the accepted origin. The user cannot choose an arbitrary request origin or path.
- There is no login or token field. Credentials are neither requested nor persisted.
- Remote issue bodies feed plain-text heuristics but are never inserted into the document. Remote titles, labels, repository descriptions, and names are rendered by React as text, not as HTML.
- External issue and repository links open in a new tab with `rel="noopener noreferrer"`.
- The application cannot verify that public GitHub content is truthful or safe. Following a repository or issue link crosses the IssueReady trust boundary.
- The community-profile endpoint is advisory. Failure becomes `unknown`, not evidence that contributor files are absent.
- Browser extensions, a compromised GitHub response, a compromised build dependency, the hosting platform, and the user's device remain outside the guarantees of the application code. Dependency and GitHub Actions updates are monitored by Dependabot, while CI enforces tests, coverage, bundle size, browser accessibility checks, Lighthouse budgets, and the production build.

## Build and deployment

Vite emits a static `dist` directory. `ISSUEREADY_BASE_PATH` controls Vite's base path; the Pages workflow sets it to `/{repository-name}/`. GitHub Actions runs on Node.js 24 with pnpm 11.16.0, validates the project, uploads the static artifact, and deploys through GitHub Pages. Deployment needs Pages permissions in Actions but no runtime secret or backend service.
