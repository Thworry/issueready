# IssueReady Maintainer Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn IssueReady's public first impression and release gates into a clear maintainer-side issue-quality workflow.

**Architecture:** Keep the existing deterministic browser analyzer and eight-signal issue model. Refine the bilingual message layer and public documentation, make Playwright portable, run the complete responsive browser matrix in GitHub Actions, and add solo-maintainer-safe GitHub governance and security controls.

**Tech Stack:** TypeScript 6, React 19, Vite 8, Vitest 4, Playwright, pnpm 11, GitHub Actions, GitHub Pages, GitHub REST/GraphQL APIs.

## Global Constraints

- Support only public GitHub repositories with read-only unauthenticated requests.
- Keep analysis deterministic, browser-local, backend-free, analytics-free, advertising-free, and AI-free.
- English and Simplified Chinese application copy remain semantically equivalent and naturally written.
- Keep Node support at `>=24.0.0 <25`; defer dependencies that require a higher floor.
- Do not weaken lint, coverage, accessibility, bundle, Lighthouse, CSP, or browser-test thresholds.
- Future commits use `Thworry <31728500+Thworry@users.noreply.github.com>`; do not rewrite published history.
- The main ruleset must not require an external approval or block the solo maintainer from merging a green pull request.
- Do not publish a version merely to create activity; release only when the completed user-visible change warrants it.

---

### Task 1: Make local and hosted browser gates portable and complete

**Files:**
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

**Interfaces:**
- Consumes: package script `test:e2e = playwright test` and the existing desktop/mobile Playwright projects.
- Produces: the `quality` check and Pages build running both browser projects with a portable `pnpm` command.

- [ ] **Step 1: Add a repository-contract regression assertion**

Extend `src/repository-files.test.ts` to assert that `playwright.config.ts` contains no `/Users/` path and that both workflow files invoke the complete `pnpm test:e2e` command without `--project=desktop-chromium`.

- [ ] **Step 2: Run the contract test before implementation**

Run: `pnpm exec vitest run src/repository-files.test.ts`

Expected: FAIL on the absolute pnpm path and desktop-only workflow commands.

- [ ] **Step 3: Use portable Playwright commands**

Delete the absolute `localPnpm` constant and use `pnpm build && pnpm preview --host 127.0.0.1` as `webServer.command` on every platform.

- [ ] **Step 4: Run both projects in CI and Pages**

Replace each `pnpm test:e2e --project=desktop-chromium` step with `pnpm test:e2e`. Keep retries, timeouts, accessibility tests, bundle checks, and Lighthouse thresholds unchanged.

- [ ] **Step 5: Verify locally**

Run:

```bash
pnpm exec vitest run src/repository-files.test.ts
pnpm test:e2e
```

Expected: PASS with desktop and mobile project results.

### Task 2: Make the first viewport explicitly maintainer-side

**Files:**
- Modify: `src/i18n.ts`
- Modify: `src/i18n.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/app.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: `Messages`, `messages.en`, and `messages["zh-CN"]`.
- Produces: a visible maintainer workflow and a concise RepoScope boundary without changing the primary form action.

- [ ] **Step 1: Add bilingual copy tests**

Assert that the English hero contains `maintainer`, `before`, and `triage` or `onboarding`; assert Chinese contains `维护者`, `发布前`, and `分诊` or `贡献者上手`. Assert the landing page exposes a RepoScope link and explains the adopter/maintainer distinction.

- [ ] **Step 2: Run the focused tests before implementation**

Run: `pnpm exec vitest run src/i18n.test.ts src/App.test.tsx`

Expected: FAIL because the current hero asks only whether beginner issues are ready.

- [ ] **Step 3: Update the message contract and hero**

Add a `scope` message and use these meaning-equivalent core messages:

```text
EN tagline: Prepare beginner issues before contributors find them.
EN intro: A maintainer-side pre-publish check for context, scope, acceptance criteria, verification, freshness, triage, and contributor onboarding.
ZH tagline: 在贡献者看到任务之前，先把新手 Issue 准备好。
ZH intro: 面向维护者的发布前检查，核对背景、范围、验收标准、验证方法、时效、分诊和贡献者上手条件。
```

Render the scope sentence after the intro: RepoScope helps people evaluate a repository before adoption; IssueReady helps maintainers prepare actionable issues. Link only the RepoScope product name.

- [ ] **Step 4: Update HTML metadata and responsive styles**

Set the document description to the maintainer-side issue-quality position. Style the scope sentence as secondary copy within the existing editorial system, preserving headline hierarchy, focus visibility, touch targets, and 360–1440px reflow.

- [ ] **Step 5: Verify the public experience**

Run:

```bash
pnpm exec vitest run src/i18n.test.ts src/App.test.tsx
pnpm format:check
pnpm build
pnpm test:e2e
pnpm check:lighthouse
```

Expected: all PASS with no horizontal overflow or serious/critical Axe violation.

### Task 3: Put the verified Live Site and maintainer workflow in both READMEs

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: verified Pages URL `https://thworry.github.io/issueready/`.
- Produces: first-screen Live Site links, explicit pre-publish/triage/onboarding use cases, and a RepoScope distinction.

- [ ] **Step 1: Add the Live Site directly below the language link**

Use `**Live site:** <https://thworry.github.io/issueready/>` in English and `**在线站点：** <https://thworry.github.io/issueready/>` in Chinese.

- [ ] **Step 2: Rewrite the opening paragraph around maintainers**

Explain that maintainers run IssueReady before publishing or applying beginner labels, during triage, and when improving contributor onboarding. Keep deterministic and non-guarantee boundaries in the first screen.

- [ ] **Step 3: Add a short product boundary**

State that RepoScope helps adopters understand repositories, while IssueReady helps maintainers prepare individual tasks. Link to `https://github.com/Thworry/reposcope`.

- [ ] **Step 4: Keep contribution instructions aligned**

Document that public-copy changes require bilingual tests and that browser changes require both Playwright projects.

### Task 4: Review compatible Dependabot updates one at a time

**Files:**
- Modify through dependency PRs only: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: latest `main` and GitHub Actions `quality` check.
- Produces: fresh, individually validated dependency merges or an explicit compatibility deferral.

- [ ] **Step 1: Rebase and merge low-risk updates**

Process #3 (`eslint-plugin-react-refresh`), #4 (`@testing-library/user-event`), #5 (`typescript-eslint`), then #2 (`eslint`). For each PR: update the branch to current main, inspect package and lockfile diffs, wait for a fresh complete `quality` success on the updated SHA, merge, then wait for main CI and Pages before proceeding.

- [ ] **Step 2: Defer jsdom 30**

Do not merge #1. Record that jsdom 30 requires Node `^24.15.0` while IssueReady publicly supports `>=24.0.0 <25`. Close or leave it unmerged with that exact compatibility reason; do not narrow the project's support range for this dev dependency.

### Task 5: Apply repository metadata, feedback, governance, and security settings

**Files:**
- Remote GitHub settings for `Thworry/issueready`

**Interfaces:**
- Consumes: the passing `quality` status context and current Pages URL.
- Produces: a maintainable repository surface without analytics or external-approval deadlock.

- [ ] **Step 1: Update metadata**

Set description to `Maintainer-side checks for clear, current, actionable beginner issues before publishing or triage.` Keep Homepage `https://thworry.github.io/issueready/`. Add topics `issue-quality`, `issue-triage`, and `contributor-onboarding` while preserving existing relevant topics.

- [ ] **Step 2: Enable Discussions as the transparent feedback path**

Enable Discussions and add a README feedback link only if the Discussions endpoint is live. Do not add analytics, telemetry, or a third-party feedback widget.

- [ ] **Step 3: Enable compatible security automation**

Enable vulnerability alerts, Dependabot security updates, and CodeQL default setup for Actions and JavaScript/TypeScript. Verify every setting through read APIs and confirm the first public-repository CodeQL analysis completes.

- [ ] **Step 4: Create the solo-maintainer ruleset**

Target `refs/heads/main`; require pull requests with zero approvals, resolved review threads, strict `quality`, and block deletion/non-fast-forward updates. Do not require CODEOWNERS, last-push approval, or an outside reviewer. Verify a green owner PR remains mergeable.

### Task 6: Decide release value and complete final verification

**Files:**
- Modify only if releasing: `package.json`, `src/repository-files.test.ts`, new `CHANGELOG.md`

**Interfaces:**
- Consumes: merged user-visible positioning, portable full browser gate, dependency decisions, and successful Pages deployment.
- Produces: either an honest minor release or a documented no-release decision.

- [ ] **Step 1: Run the complete local gate**

Run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm test:coverage
pnpm build
pnpm check:bundle
pnpm test:e2e
pnpm check:lighthouse
pnpm audit --prod
```

Expected: every command PASS and both Playwright projects execute.

- [ ] **Step 2: Evaluate whether a release helps users**

Release a minor version only if the website hero, README workflow, portable setup, and complete browser matrix all land together and remote CI/Pages pass. If only metadata/settings land, keep v0.1.0 and state that no user-facing package release was warranted.

- [ ] **Step 3: If releasing, produce complete artifacts**

Set package/test version consistently, add a changelog describing maintainer positioning and complete responsive gates, merge through a green PR, then create the matching GitHub release. Never claim functionality beyond the deterministic eight-signal report.

- [ ] **Step 4: Final remote verification**

Confirm remote main SHA, latest CI, Pages deployment and HTTP 200, release/tag decision, ruleset, security settings, Discussions, repository metadata, noreply author attribution, and preservation of the pre-existing untracked design document.
