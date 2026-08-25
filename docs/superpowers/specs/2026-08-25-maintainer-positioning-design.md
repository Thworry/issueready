# IssueReady Maintainer Positioning Design

## Outcome

Make IssueReady unmistakably useful to repository maintainers before they publish or label beginner work. The project should help with issue quality, pre-submit checks, triage, and contributor onboarding while remaining a deterministic, read-only, browser-local tool.

## Product position

IssueReady checks whether beginner-labelled issues give a contributor enough context, scope, acceptance criteria, verification guidance, freshness, and repository prerequisites to start responsibly. It is a maintainer-side preparation and triage aid, not an automated contribution policy.

IssueReady is distinct from RepoScope. RepoScope helps a prospective adopter understand a public repository; IssueReady helps a maintainer prepare individual tasks that contributors can evaluate and take on.

## Public experience

- Both READMEs expose the verified Live Site as a clickable first-screen link.
- The website hero speaks to maintainers and names pre-publish checks, triage, and onboarding.
- English and Simplified Chinese carry the same meaning in natural language.
- The repository description and topics use the same maintainer-side position.
- No analytics, login, token input, backend, or AI is introduced.

## Engineering quality

CI and Pages must execute both desktop and mobile Playwright projects. Local Playwright uses `pnpm` from `PATH`; no maintainer-specific absolute path may appear in public configuration. Existing coverage, bundle, Lighthouse, CSP, and accessibility thresholds remain unchanged.

## Dependency policy

Compatible Dependabot updates are refreshed against the latest main and merged one at a time only after a fresh complete `quality` check. jsdom 30 is deferred because its Node `^24.15.0` floor conflicts with the published `>=24.0.0 <25` contract. The project will not narrow its support range solely for a test dependency.

## Governance, security, and releases

The `main` ruleset requires pull requests with zero external approvals, strict `quality`, resolved review threads, and protection from deletion and non-fast-forward pushes. Vulnerability alerts, Dependabot security updates, and compatible public CodeQL default setup may be enabled.

These improvements do not automatically justify a release. A minor release is appropriate only if the user-visible website positioning and complete mobile gate land together and all checks pass; metadata-only or repository-setting changes remain on main without a ceremonial release.

## Privacy and authorship

Future commits use `Thworry <31728500+Thworry@users.noreply.github.com>`. Existing public history is preserved. No personal name, public email, location, or company is added.
