# Contributing to IssueReady

Thank you for helping make beginner issues easier to evaluate. IssueReady is intentionally small: a bilingual, static, read-only browser application with deterministic and inspectable rules. Contributions should preserve that focus.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security vulnerabilities through the private process in [SECURITY.md](SECURITY.md), never through a public issue or pull request.

## Before starting

- Search existing issues and pull requests for related work.
- Keep the proposed change bounded. One concern per issue or pull request is easier to review and revert.
- Discuss large product, architecture, dependency, or methodology changes before implementing them.
- Do not create artificial `good first issue` tickets. Apply beginner labels only to genuine, supported, bounded work.
- Do not add authentication, GitHub tokens, write operations, a backend, analytics, telemetry, remote fonts/assets, or rendering of remote issue HTML without an explicit, reviewed change in project scope.

## Development environment

IssueReady requires:

- Node.js 24.x
- pnpm 11.x; the repository pins pnpm 11.16.0, and `pnpm` must be available on `PATH`

Install the locked dependencies and Chromium used by Playwright:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

Start Vite locally:

```bash
pnpm dev
```

## Make a focused change

1. Add or update a test that demonstrates the intended behavior and fails for the expected reason.
2. Implement the smallest complete change that makes the test pass.
3. Keep TypeScript types explicit at module boundaries and preserve typed error behavior.
4. Run the focused test while iterating.
5. Run the full local quality gate before requesting review:

```bash
pnpm check
```

`pnpm check` runs linting, formatting verification, all Vitest tests, and a production build. Changes to scoring, transport, caching, or other covered source must keep the repository coverage thresholds passing:

```bash
pnpm test:coverage
```

After a production build, verify the compressed JavaScript budget:

```bash
pnpm build
pnpm check:bundle
```

Then run the three-pass Lighthouse gate with the installed Playwright
Chromium. Every Performance, Accessibility, Best Practices, and SEO score
must be at least 0.95:

```bash
pnpm check:lighthouse
```

## UI and accessibility changes

Any user-interface behavior or layout change must include appropriate component tests and Playwright coverage. Install Chromium as shown above, then run:

```bash
pnpm test:e2e
```

This command runs both the desktop and mobile Chromium projects configured in `playwright.config.ts`. Keep both projects green so local checks match the CI and Pages deployment gates.

Verify keyboard operation, visible focus, meaningful names and status text, no horizontal overflow at supported widths, 44-by-44-pixel interactive targets, reduced-motion behavior, and no serious or critical axe violations. If the visual result changes materially, include screenshots or another concise piece of accessibility/viewport evidence in the pull request.

User-visible copy must retain equivalent English and Simplified Chinese meaning. Review both language modes; do not ship a new message in only one language.

## Methodology changes

The scoring contract is public and versioned. A change to candidate or blocking labels, dictionaries, generic titles, weights, prerequisites, age boundaries, top-100 scope, or classification precedence must include all of the following:

- boundary and regression tests in the analyzer modules;
- any affected English and Simplified Chinese interface copy;
- an update to [docs/methodology.md](docs/methodology.md);
- an intentional decision about whether `RULESET_VERSION` in `src/features/analyzer/rules.ts` must change.

Do not change a score merely to make a particular repository or issue produce a preferred result. Rules must be general, deterministic, explainable, and tested with both English and Chinese examples where relevant.

## Documentation and architecture

Keep both [README.md](README.md) and [README.zh-CN.md](README.zh-CN.md) equivalent when product behavior, setup, limits, privacy, deployment, or contribution instructions change. Update [docs/architecture.md](docs/architecture.md) when data flow, API boundaries, cache behavior, cancellation, CSP, deployment, or threat boundaries change.

## Pull requests

Complete the pull request template. In the summary, explain the user problem and the smallest behavior change. List the commands you actually ran; do not claim a check that was not run. Call out bilingual-copy, methodology, security, privacy, and accessibility impact explicitly, even when the answer is “none.”

Maintainers may ask to split a change that mixes unrelated concerns or expands the project beyond its read-only deterministic purpose.
