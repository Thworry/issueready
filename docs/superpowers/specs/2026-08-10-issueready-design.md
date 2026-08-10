# IssueReady Design Specification

Date: 2026-08-10  
Status: Approved through the user's instruction to apply the recommended defaults

## 1. Purpose

IssueReady is a free, open-source web tool for maintainers and prospective contributors. A user pastes the URL of a public GitHub repository and receives a transparent assessment of whether its beginner-labelled issues are actually clear, current, and actionable.

The project must become useful on its own merits. Publishing a repository is not treated as sufficient for OpenAI's Codex for Open Source program; genuine maintenance, adoption, and ecosystem value remain separate outcomes that must be earned over time.

## 2. Product principles

- One useful job: assess beginner-friendly issues in one public repository.
- No account, installation, payment, AI API, or GitHub authorization.
- Deterministic and explainable rules rather than an opaque AI score.
- English and Simplified Chinese from the first release.
- Read-only operation: IssueReady never changes a repository or issue.
- Privacy by default: repository data is fetched directly from GitHub in the user's browser and is not sent to or stored by an IssueReady server.
- Honest limitations: incomplete GitHub data, rate limits, and heuristic results are shown explicitly.

## 3. Target users and jobs

### Primary user: open-source maintainer

The maintainer wants to know which `good first issue`, `help wanted`, or equivalent issues need clearer context, acceptance criteria, verification instructions, or renewed attention before newcomers attempt them.

### Secondary user: prospective contributor

The contributor wants to identify which beginner-labelled issues appear ready to start and which contain warning signs such as inactivity, blocking labels, unclear scope, or missing verification instructions.

## 4. Version 1 scope

### Included

1. Accept and normalize a public `github.com/{owner}/{repository}` URL.
2. Read repository metadata, community profile data, and up to the 100 most recently updated open issues through GitHub's public REST API.
3. Detect candidate issues using normalized beginner-oriented labels:
   - `good first issue`
   - `good-first-issue`
   - `first timers only`
   - `first-timers-only`
   - `beginner`
   - `beginner friendly`
   - `beginner-friendly`
   - `help wanted`
4. Exclude pull requests returned by GitHub's issues endpoint.
5. Classify each candidate as `Ready`, `Needs work`, or `Possibly stale`.
6. Explain every passed check, warning, and missing item.
7. Provide a copyable improvement checklist and a link to the original GitHub issue.
8. Summarize the number of issues in each classification.
9. Allow sharing a report with `?repo=owner/repository`; no report data is persisted.
10. Offer English and Simplified Chinese UI with a visible language switcher and browser-language default.

### Explicitly excluded

- Private repositories or GitHub Enterprise instances
- GitHub OAuth, user accounts, or saved dashboards
- Editing issues, opening pull requests, or writing to GitHub
- LLM-generated rewrites or any paid API
- Cross-repository issue discovery or rankings
- Source-code quality, security, vulnerability, or dependency scanning
- GitHub Actions integration, badges, browser extensions, or a CLI
- A hosted database or server-side GitHub token
- Anonymous analytics in the first release

## 5. User flow and interface

### Landing state

The single page contains a short value statement, one repository URL field, an `Analyze repository` button, two real example repositories, a privacy statement, and a link to the published methodology.

### Loading state

The interface names the current phase—validating the repository, reading community files, or assessing issues—and announces progress to assistive technology. Submitting a second repository cancels the previous request.

### Results state

The report contains:

1. Repository header: owner/name, description, activity warning when relevant, and a GitHub link.
2. Repository prerequisites: README, contribution guide, license, archived state, and recent repository activity.
3. Summary: counts for `Ready`, `Needs work`, and `Possibly stale`.
4. Filters for the three classifications.
5. Issue cards with title, labels, last-updated date, assignee state, classification, rule-by-rule evidence, and an `Open on GitHub` action.
6. A copyable checklist containing only the missing sections for that issue. The tool does not overwrite or pretend to rewrite the issue body.
7. Methodology and limitations at the bottom of every report.

If no matching issue exists, the page explains which labels were searched and provides a copyable beginner-issue template for maintainers.

The layout is responsive, keyboard accessible, and never uses color as the only status indicator. Remote Markdown is shown only as escaped plain-text excerpts; arbitrary repository HTML is never rendered.

## 6. Deterministic assessment model

Every rule and weight is published in the repository. Detection supports common English and Simplified Chinese headings and keywords. A visible explanation accompanies each result so users can disagree with the heuristic.

### Issue quality score

| Signal | Points | Passing evidence |
| --- | ---: | --- |
| Specific title | 10 | Trimmed title is 12–120 characters and is not only a generic label word |
| Context | 15 | Body contains at least 120 visible characters or a context/problem heading |
| Bounded task | 15 | Body contains a task/scope heading, ordered steps, or a Markdown checklist |
| Acceptance criteria | 20 | Body contains acceptance/done/expected-result wording or an acceptance checklist |
| Verification | 15 | Body contains test, reproduce, verify, or equivalent Chinese instructions |
| Location hint | 10 | Body identifies a file path, code symbol, component, module, or documentation page |
| Freshness | 10 | Updated within 90 days; 5 points within 91–180 days; otherwise 0 |
| Available to claim | 5 | The issue has no assignee |

The maximum is 100 points.

### Repository-level signals

- Archived repositories are always warned and their issues cannot be `Ready`.
- A repository with no push in the last 180 days receives an inactivity warning.
- README, CONTRIBUTING, and license availability are shown as contributor-onboarding prerequisites. Their absence does not alter the issue's numeric score, but it prevents a `Ready` classification until the missing prerequisite is disclosed on the issue card.
- Repository stars never affect readiness. Popularity is not evidence that an issue is actionable.

### Classification

- `Possibly stale`: the repository is archived; the issue has a normalized `blocked`, `on hold`, `wontfix`, or `waiting` label; or the issue has not been updated for more than 180 days.
- `Ready`: score is at least 70, the repository is not archived or inactive, and a README plus contribution guide are available.
- `Needs work`: every other candidate.

The wording is intentionally probabilistic. IssueReady does not claim that a contribution will be accepted or that a maintainer will respond.

## 7. Technical architecture

### Stack

- Vite, React, and TypeScript
- Plain modular CSS with design tokens; no component framework
- Vitest and Testing Library for unit/component tests
- Playwright for browser-level tests
- npm for dependency and script management
- Static deployment to GitHub Pages through GitHub Actions

### Runtime boundaries

1. `RepoUrlParser` accepts only standard public GitHub repository URLs and produces `{ owner, repo }`.
2. `GitHubClient` performs at most three requests per scan:
   - repository metadata
   - community profile
   - the 100 most recently updated open issues
3. `IssueNormalizer` removes pull requests, normalizes labels, strips Markdown for length checks, and converts dates.
4. `IssueAnalyzer` is a pure, side-effect-free module containing the published rules and classifications.
5. Presentation components render repository status, summaries, filters, issue cards, empty states, and errors.
6. A small static dictionary supplies English and Chinese UI strings without an internationalization framework.

The browser caches a successful normalized response in `sessionStorage` for ten minutes under the public repository slug. The cache is local to the user's tab session and can be bypassed with a visible refresh action.

### Data flow

`URL input -> parse -> fetch three GitHub resources concurrently -> normalize -> analyze with pure rules -> render report -> optionally share query-string URL`

No IssueReady backend receives the URL, issue body, or repository metadata.

## 8. Error and boundary handling

- Invalid URL: explain the accepted URL shape with an example.
- Missing or private repository: report GitHub's 404 without guessing which case applies.
- Rate limit: read `X-RateLimit-Reset`, display the local reset time, and link to GitHub's rate-limit documentation.
- Network failure: retain the entered URL and offer a manual retry.
- Community-profile failure: continue issue assessment, mark prerequisite data unavailable, and avoid treating it as missing.
- No beginner label: show the searched labels and the maintainer template.
- More than 100 open issues: state that version 1 inspected only the 100 most recently updated issues and may omit older candidates.
- Archived or inactive repository: show a prominent warning while preserving the read-only report.
- Superseded request: cancel it with `AbortController` and suppress stale results.
- Malicious issue content: never execute or render its HTML; truncate and escape excerpts.

## 9. Accessibility, performance, and security

- Target WCAG 2.2 AA for keyboard use, focus visibility, contrast, labels, and live status announcements.
- Target at least 95 in Lighthouse Performance, Accessibility, Best Practices, and SEO on the production build.
- Keep initial JavaScript below 200 KB compressed.
- Use a strict Content Security Policy compatible with the static application and GitHub API.
- Pin GitHub Actions to trusted releases and enable dependency updates.
- Do not request a GitHub token or ask users to paste credentials.
- Include `SECURITY.md` with private vulnerability-reporting instructions.

## 10. Testing strategy

### Unit tests

- Valid and invalid GitHub URL normalization
- Label normalization and pull-request exclusion
- Markdown-to-visible-text handling
- English and Chinese heading/keyword detection
- Every scoring boundary and classification threshold
- Archived, inactive, blocked, assigned, stale, and fresh cases
- GitHub API error mapping and rate-limit reset formatting

### Component and integration tests

- Loading, result, empty, partial-data, and error states with mocked GitHub responses
- Filters, copy action, language switching, refresh, and share URL
- Request cancellation when a new repository is submitted
- Safe rendering of hostile Markdown and HTML fixtures

### End-to-end tests

- Analyze a fixture-backed repository from the landing page
- Open a shared `?repo=` report
- Use the complete flow with keyboard only
- Verify responsive behavior at phone and desktop widths
- Verify rate-limit and repository-not-found experiences

Live GitHub API smoke tests remain separate and non-blocking so network availability cannot make the normal test suite flaky.

## 11. Repository quality and release

The public repository will use the MIT license and include:

- English README with a clearly linked Simplified Chinese README
- `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`
- Issue and pull-request templates
- Published methodology and scoring documentation
- Architecture notes and local setup instructions
- Automated tests, formatting, linting, build checks, and GitHub Pages deployment
- A small set of genuinely bounded `good first issue` tasks after version 0.1 is usable

The first release is `v0.1.0`. A custom domain, GitHub Action, and optional maintainer-authorized features are considered only after real user feedback demonstrates demand.

## 12. Acceptance criteria

Version 1 is complete when:

1. A visitor can paste a valid public repository URL and receive a deterministic report without signing in.
2. The client makes no more than three GitHub API requests for a fresh scan.
3. All classifications display their exact evidence and missing signals.
4. English and Simplified Chinese flows are complete and equivalent.
5. Empty, partial, rate-limited, invalid, missing, archived, and hostile-content cases are covered.
6. No repository or issue data reaches an IssueReady-controlled backend.
7. Unit, integration, and end-to-end test suites pass in CI.
8. The production build satisfies the accessibility, performance, and size targets.
9. The public repository contains all community and security files listed above.
10. The deployed GitHub Pages site can analyze IssueReady's own repository and share that report through a query-string URL.

## 13. Known limitations

- GitHub's unauthenticated public API limit applies per visitor.
- Only the 100 most recently updated open issues are inspected.
- Heuristics cannot determine actual task difficulty, maintainer intent, or acceptance probability.
- Keyword detection is initially limited to English and Simplified Chinese.
- `help wanted` can include advanced work, so those issues may score poorly by design.
- Browser-side calls expose only the same public repository information the visitor requested directly from GitHub.

