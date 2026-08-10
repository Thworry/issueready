# IssueReady

[简体中文](README.zh-CN.md)

IssueReady checks whether beginner-labelled issues in a public GitHub repository are clear, current, and actionable. It produces a bilingual, read-only report with an explainable score, contributor-prerequisite checks, and a copyable improvement checklist.

The analysis is deterministic. IssueReady does not use AI to judge an issue and does not claim that a high-scoring issue is safe, correct, or guaranteed to be accepted by a maintainer.

## Use IssueReady

1. Open the deployed IssueReady site.
2. Paste a full public repository URL such as `https://github.com/ossf/scorecard`.
3. Select **Analyze repository**.
4. Review the repository prerequisites, filter the issue cards, open the original issues on GitHub, or copy a missing-checks checklist.
5. Use **Refresh public data** when you need to bypass the ten-minute cache.

After a successful manual analysis, the address bar contains a shareable `?repo=owner%2Frepository` query. Opening that URL runs the same public analysis automatically. IssueReady accepts only public `https://github.com/owner/repository` URLs; it cannot read private repositories.

IssueReady considers issues carrying one of these normalized labels:

- `good first issue`
- `first timers only`
- `beginner`
- `beginner friendly`
- `help wanted`

Hyphens and underscores in labels are normalized to spaces, and matching is case-insensitive.

## What the report means

Each candidate issue receives a score out of 100 from eight visible checks: specific title, context, bounded task, acceptance criteria, verification, location hint, freshness, and availability to claim. The report classifies each issue as **Ready**, **Needs work**, or **Possibly stale**. Staleness rules take precedence over the score.

Ruleset `1.0.0`, every weight, dictionary, boundary, prerequisite, and precedence rule are published in [the methodology](docs/methodology.md). The result is a maintenance aid, not an automated contribution policy; always read the repository's own guidance and confirm with its maintainers.

## Scope and limits

- A fresh analysis makes at most three unauthenticated, read-only GitHub REST API requests.
- It examines only the 100 most recently updated open items returned by GitHub and removes pull requests locally. Older issues may be omitted.
- GitHub's unauthenticated API rate limit applies. When GitHub supplies a reset time, IssueReady shows it; otherwise retry later or wait for the limit to reset.
- If GitHub's community-profile response is unavailable, README, contribution-guide, and license states are shown as **Unavailable**, never as confirmed missing.
- The checks are text heuristics. They do not execute code, inspect the complete repository tree, assess technical difficulty, or predict maintainer decisions.
- Only public data is supported. There is no login or personal access token input.

## Privacy and security

IssueReady has no backend, account system, analytics, ads, or telemetry. Repository data travels directly between your browser and `api.github.com`. A normalized copy of the public response is stored in the current browser session for no more than ten minutes to avoid repeated API requests. The repository slug may appear in the shareable page URL.

Remote issue bodies are used only by the local scoring rules and are never rendered as HTML. React renders remote titles, labels, and descriptions as text. Production builds apply a restrictive Content Security Policy and load no remote fonts, scripts, or images. See [the architecture and threat boundaries](docs/architecture.md).

For a suspected security vulnerability, follow [the private reporting instructions](SECURITY.md). Do not disclose a vulnerability in a public issue.

## Local development

Requirements:

- Node.js 24.x
- pnpm 11.16.0

Install dependencies and the Playwright browser:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

Start the development server:

```bash
pnpm dev
```

The main project commands are:

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
pnpm build
pnpm check:bundle
pnpm test:e2e
pnpm check:lighthouse
pnpm check
```

`pnpm check` runs linting, formatting verification, unit/component tests, and a production build. Run `pnpm build` before the bundle-size and Lighthouse commands. The end-to-end command builds and serves the application through its Playwright configuration.

## Deployment

The repository includes a GitHub Pages workflow. A push to `main` or a manual workflow dispatch runs the quality gates, builds with the repository-specific base path, uploads `dist`, and deploys it with GitHub Pages. In repository settings, configure Pages to use **GitHub Actions** as its source. No server or runtime secret is required.

For another static host, run `pnpm build` and publish `dist`. Set `ISSUEREADY_BASE_PATH` during the build when the site is served below a subpath.

## Contributing

Contributions are welcome when they stay focused on the read-only, deterministic product scope. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and follow the [Code of Conduct](CODE_OF_CONDUCT.md). Rule changes must update tests, bilingual copy where visible, and [the methodology](docs/methodology.md).

Please do not create artificial `good first issue` tickets. Use that label only for genuine, bounded work that the repository is ready to support.

## License

IssueReady is available under the [MIT License](LICENSE).
