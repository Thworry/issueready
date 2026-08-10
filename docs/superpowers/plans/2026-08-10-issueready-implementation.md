# IssueReady Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build and publish IssueReady v0.1.0, a bilingual, read-only web application that assesses whether beginner-labelled issues in a public GitHub repository are actionable.

**Architecture:** A static Vite and React application calls three unauthenticated GitHub REST endpoints directly from the browser. Pure TypeScript modules normalize public data and apply versioned deterministic rules; React orchestrates state and renders explanations. No backend, account, database, analytics, AI API, or GitHub write access is introduced.

**Tech Stack:** Node.js 24, pnpm 11, React 19.2.8, Vite 8.2.1, TypeScript 6.0.3, Vitest 4.1.10, Testing Library, Playwright 1.62.1, plain modular CSS, GitHub Actions, and GitHub Pages.

## Global Constraints

- Use Node.js 24.x and pnpm 11.16.0. Workspace pnpm: /Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.
- Preserve the unrelated untracked file docs/superpowers/specs/2026-08-01-deepseek-worker-flash-default-design.md. Never stage it.
- Accept only public github.com repository URLs; never request a GitHub token.
- Make no more than three GitHub API requests for one uncached scan.
- Inspect only the 100 most recently updated open items, remove pull requests locally, and disclose the scope.
- Keep rules deterministic, versioned, explainable, and bilingual.
- Do not add a backend, database, authentication, analytics, AI API, source-code scanner, GitHub write operation, badge, CLI, or IssueReady GitHub Action.
- Cache normalized public responses in sessionStorage for ten minutes only.
- Render remote issue content as escaped text, never HTML.
- Target WCAG 2.2 AA, Lighthouse scores of at least 95, and less than 200 KB compressed initial JavaScript.
- Use ui-ux-pro-max and elevate-web-design before visual UI implementation.
- Use TDD and one focused commit per task.

---

## File map

- package.json, pnpm-lock.yaml, tsconfig files, vite.config.ts, eslint.config.js: reproducible build.
- src/features/analyzer/model.ts: shared raw and normalized types.
- src/features/analyzer/repo-url.ts: strict URL and share-query parsing.
- src/features/analyzer/github-client.ts: three-request GitHub client.
- src/features/analyzer/normalize.ts: safe normalization and candidate detection.
- src/features/analyzer/cache.ts: ten-minute session cache.
- src/features/analyzer/rules.ts: deterministic scoring.
- src/features/analyzer/service.ts: fetch/cache/analyze orchestration.
- src/features/analyzer/use-repository-analysis.ts: cancellable React lifecycle.
- src/i18n.ts and src/components: bilingual UI.
- src/styles: tokens, global rules, and responsive layout.
- e2e and scripts: browser, accessibility, Lighthouse, and size checks.
- .github: CI, Pages deployment, Dependabot, and contribution templates.
- README files, governance files, docs/methodology.md, docs/architecture.md: public project documentation.

---

### Task 1: Establish the tested React project

**Files:**
- Create: package.json, pnpm-lock.yaml
- Create: tsconfig.json, tsconfig.app.json, tsconfig.node.json
- Create: vite.config.ts, eslint.config.js, .prettierrc.json, .prettierignore, .gitignore
- Create: index.html, src/vite-env.d.ts, src/test/setup.ts
- Create: src/App.test.tsx, src/App.tsx, src/main.tsx

**Interfaces:**
- Consumes: none.
- Produces: scripts dev, build, test, test:coverage, test:e2e, lint, format, format:check, and check.

- [ ] **Step 1: Create package.json**

~~~json
{
  "name": "issueready",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.16.0",
  "engines": { "node": ">=24.0.0 <25" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "check": "pnpm lint && pnpm format:check && pnpm test && pnpm build"
  },
  "dependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.12.1",
    "@eslint/js": "10.0.1",
    "@playwright/test": "1.62.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.3",
    "@types/node": "26.2.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitejs/plugin-react": "6.0.5",
    "@vitest/coverage-v8": "4.1.10",
    "eslint": "10.0.1",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-react-refresh": "0.5.3",
    "globals": "17.9.0",
    "jsdom": "29.1.1",
    "prettier": "3.9.6",
    "typescript": "6.0.3",
    "typescript-eslint": "8.66.0",
    "vite": "8.2.1",
    "vitest": "4.1.10"
  }
}
~~~

- [ ] **Step 2: Create strict TypeScript and Vite configuration**

tsconfig.json:

~~~json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
~~~

tsconfig.app.json:

~~~json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "skipLibCheck": true
  },
  "include": ["src"]
}
~~~

tsconfig.node.json:

~~~json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2024",
    "lib": ["ES2024"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "playwright.config.ts"]
}
~~~

vite.config.ts:

~~~ts
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.ISSUEREADY_BASE_PATH ?? "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 }
    }
  }
});
~~~

Create src/test/setup.ts:

~~~ts
import "@testing-library/jest-dom/vitest";
~~~

- [ ] **Step 3: Create lint, format, ignore, and HTML configuration**

eslint.config.js:

~~~js
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["coverage", "dist", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
    }
  }
);
~~~

Use .prettierrc.json with semi true, singleQuote false, trailingComma none. Ignore dist, coverage, playwright-report, test-results, and pnpm-lock.yaml. Ignore node_modules and generated outputs in git.

index.html:

~~~html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Check whether beginner-labelled GitHub issues are clear, current, and actionable." />
    <title>IssueReady</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
~~~

- [ ] **Step 4: Install and create the lockfile**

~~~bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm install
~~~

Expected: pnpm-lock.yaml exists with no peer-dependency failure.

- [ ] **Step 5: Write a failing App smoke test**

~~~tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows one primary analysis action", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "IssueReady" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Analyze repository" })).toBeEnabled();
  });
});
~~~

Run the focused test. Expected: FAIL because App.tsx is absent.

- [ ] **Step 6: Implement the minimal app**

~~~tsx
export function App() {
  return (
    <main>
      <h1>IssueReady</h1>
      <button type="button">Analyze repository</button>
    </main>
  );
}
~~~

main.tsx:

~~~tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("IssueReady root element is missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
~~~

- [ ] **Step 7: Verify and commit**

Run test, lint, format:check, and build. Expected: PASS.

~~~bash
git add package.json pnpm-lock.yaml tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js .prettierrc.json .prettierignore .gitignore index.html src
git commit -m "chore: establish IssueReady web project"
~~~

### Task 2: Parse repository URLs and shared reports

**Files:**
- Create: src/features/analyzer/model.ts
- Create: src/features/analyzer/repo-url.ts
- Create: src/features/analyzer/repo-url.test.ts

**Interfaces:**
- Produces: RepoRef, RepoUrlError, parseGitHubRepoUrl, repoRefFromSearch, toShareSearch.

- [ ] **Step 1: Define raw shared types**

~~~ts
export type Language = "en" | "zh-CN";
export type Classification = "ready" | "needs-work" | "possibly-stale";
export type FileState = "present" | "missing" | "unknown";
export interface RepoRef { owner: string; repo: string }

export interface GitHubRepository {
  full_name: string;
  html_url: string;
  description: string | null;
  archived: boolean;
  pushed_at: string;
  open_issues_count: number;
  default_branch: string;
}
export interface GitHubCommunityFile { url: string; html_url: string }
export interface GitHubCommunityProfile {
  health_percentage: number;
  files: {
    readme: GitHubCommunityFile | null;
    contributing: GitHubCommunityFile | null;
    license: GitHubCommunityFile | null;
  };
}
export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  labels: Array<string | { name: string }>;
  updated_at: string;
  assignees: Array<{ login: string }>;
  pull_request?: unknown;
}
export interface RepoSnapshot {
  repository: GitHubRepository;
  community: GitHubCommunityProfile | null;
  issues: GitHubIssue[];
}
~~~

- [ ] **Step 2: Write failing URL tests**

Test normalization for full URL, missing protocol, trailing slash, and .git. Reject empty, GitLab, missing repo, extra paths, embedded credentials, query, hash, and whitespace. Test share-query round trip and invalid query returning null.

Run focused test. Expected: FAIL.

- [ ] **Step 3: Implement strict parsing**

~~~ts
import type { RepoRef } from "./model";

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

export class RepoUrlError extends Error {
  constructor() {
    super("Enter a public GitHub repository URL such as https://github.com/ossf/scorecard");
    this.name = "RepoUrlError";
  }
}

function validate(owner: string, repoValue: string): RepoRef {
  const repo = repoValue.endsWith(".git") ? repoValue.slice(0, -4) : repoValue;
  if (!OWNER.test(owner) || !REPO.test(repo)) throw new RepoUrlError();
  return { owner, repo };
}

export function parseGitHubRepoUrl(input: string): RepoRef {
  const trimmed = input.trim();
  if (!trimmed) throw new RepoUrlError();
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : "https://" + trimmed);
  } catch {
    throw new RepoUrlError();
  }
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username || url.password || url.search || url.hash
  ) throw new RepoUrlError();

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) throw new RepoUrlError();
  return validate(segments[0] ?? "", segments[1] ?? "");
}

export function toShareSearch(ref: RepoRef): string {
  return "?" + new URLSearchParams({ repo: ref.owner + "/" + ref.repo }).toString();
}

export function repoRefFromSearch(search: string): RepoRef | null {
  const slug = new URLSearchParams(search).get("repo");
  if (!slug) return null;
  const parts = slug.split("/");
  if (parts.length !== 2) return null;
  try { return validate(parts[0] ?? "", parts[1] ?? ""); } catch { return null; }
}
~~~

- [ ] **Step 4: Verify and commit**

Run focused and full tests, lint, and build. Commit:

~~~bash
git add src/features/analyzer/model.ts src/features/analyzer/repo-url.ts src/features/analyzer/repo-url.test.ts
git commit -m "feat: parse public GitHub repository URLs"
~~~

### Task 3: Fetch one snapshot in three requests

**Files:**
- Create: src/features/analyzer/github-client.ts
- Create: src/features/analyzer/github-client.test.ts
- Modify: src/features/analyzer/model.ts

**Interfaces:**
- Produces: GitHubApiError and fetchRepoSnapshot(ref, signal, fetcher).

- [ ] **Step 1: Add error types and failing tests**

Add this exact error model to model.ts:

~~~ts
export type GitHubErrorKind = "not-found" | "rate-limit" | "network" | "api";

export class GitHubApiError extends Error {
  constructor(
    public readonly kind: GitHubErrorKind,
    message: string,
    public readonly status?: number,
    public readonly resetAt?: Date
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}
~~~

Tests must assert exactly these URLs:

~~~text
https://api.github.com/repos/o/r
https://api.github.com/repos/o/r/community/profile
https://api.github.com/repos/o/r/issues?state=open&sort=updated&direction=desc&per_page=100
~~~

Also assert community-only 500 returns community null; 404 maps not-found; 403 with X-RateLimit-Reset maps rate-limit and Date; fetch rejection maps network; 451 maps api; abort remains AbortError.

Run focused test. Expected: FAIL.

- [ ] **Step 2: Implement the client**

~~~ts
import type {
  GitHubCommunityProfile, GitHubIssue, GitHubRepository, RepoRef, RepoSnapshot
} from "./model";
import { GitHubApiError } from "./model";

const ROOT = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};

async function requestJson<T>(
  url: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, { headers: HEADERS, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GitHubApiError("network", "GitHub could not be reached");
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new GitHubApiError("not-found", "The repository is missing or private", 404);
    }
    if (response.status === 403 && response.headers.has("X-RateLimit-Reset")) {
      const seconds = Number(response.headers.get("X-RateLimit-Reset"));
      throw new GitHubApiError(
        "rate-limit",
        "GitHub rate limit reached",
        403,
        Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined
      );
    }
    throw new GitHubApiError("api", "GitHub returned status " + response.status, response.status);
  }
  return (await response.json()) as T;
}

export async function fetchRepoSnapshot(
  ref: RepoRef,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<RepoSnapshot> {
  const base = ROOT + "/repos/" + ref.owner + "/" + ref.repo;
  const repository = requestJson<GitHubRepository>(base, signal, fetcher);
  const community = requestJson<GitHubCommunityProfile>(
    base + "/community/profile", signal, fetcher
  ).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  });
  const issues = requestJson<GitHubIssue[]>(
    base + "/issues?state=open&sort=updated&direction=desc&per_page=100",
    signal,
    fetcher
  );
  const values = await Promise.all([repository, community, issues]);
  return { repository: values[0], community: values[1], issues: values[2] };
}
~~~

- [ ] **Step 3: Verify and commit**

Run focused tests, coverage, lint, and build. Commit:

~~~bash
git add src/features/analyzer/model.ts src/features/analyzer/github-client.ts src/features/analyzer/github-client.test.ts
git commit -m "feat: read public GitHub repository snapshots"
~~~

### Task 4: Normalize and cache public data

**Files:**
- Create: src/features/analyzer/normalize.ts, normalize.test.ts
- Create: src/features/analyzer/cache.ts, cache.test.ts
- Modify: src/features/analyzer/model.ts

**Interfaces:**
- Produces: AnalysisInput, normalizeLabel, stripMarkdown, normalizeSnapshot, loadCachedInput, saveCachedInput, clearCachedInput.

- [ ] **Step 1: Add normalized types**

~~~ts
export interface NormalizedRepository {
  fullName: string;
  url: string;
  description: string | null;
  archived: boolean;
  pushedAt: Date;
  openItemCount: number;
  readme: FileState;
  contributing: FileState;
  license: FileState;
}
export interface NormalizedIssue {
  number: number;
  title: string;
  url: string;
  body: string;
  labels: string[];
  updatedAt: Date;
  assigneeCount: number;
}
export interface AnalysisInput {
  repository: NormalizedRepository;
  issues: NormalizedIssue[];
  inspectedItemCount: number;
  apiScopeLimit: 100;
}
~~~

- [ ] **Step 2: Write failing normalization tests**

Assert Good-First_Issue normalizes to good first issue. Assert only normalized labels good first issue, first timers only, beginner, beginner friendly, and help wanted are candidates. Assert pull requests and unrelated labels are excluded. Assert null community produces unknown, not missing. Assert HTML tags are removed from visible text.

Run focused test. Expected: FAIL.

- [ ] **Step 3: Implement normalization**

~~~ts
import type {
  AnalysisInput, FileState, GitHubCommunityProfile, GitHubIssue, RepoSnapshot
} from "./model";

const CANDIDATES = new Set([
  "good first issue", "first timers only", "beginner", "beginner friendly", "help wanted"
]);

export function normalizeLabel(label: string): string {
  return label.toLowerCase().trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#~]/g, " ")
    .replace(/\x60+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fileState(
  community: GitHubCommunityProfile | null,
  key: "readme" | "contributing" | "license"
): FileState {
  if (!community) return "unknown";
  return community.files[key] ? "present" : "missing";
}

function labelName(label: GitHubIssue["labels"][number]): string {
  return typeof label === "string" ? label : label.name;
}

export function normalizeSnapshot(snapshot: RepoSnapshot): AnalysisInput {
  const issues = snapshot.issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title.trim(),
      url: issue.html_url,
      body: issue.body ?? "",
      labels: issue.labels.map(labelName).map(normalizeLabel),
      updatedAt: new Date(issue.updated_at),
      assigneeCount: issue.assignees.length
    }))
    .filter((issue) => issue.labels.some((label) => CANDIDATES.has(label)));

  return {
    repository: {
      fullName: snapshot.repository.full_name,
      url: snapshot.repository.html_url,
      description: snapshot.repository.description,
      archived: snapshot.repository.archived,
      pushedAt: new Date(snapshot.repository.pushed_at),
      openItemCount: snapshot.repository.open_issues_count,
      readme: fileState(snapshot.community, "readme"),
      contributing: fileState(snapshot.community, "contributing"),
      license: fileState(snapshot.community, "license")
    },
    issues,
    inspectedItemCount: snapshot.issues.length,
    apiScopeLimit: 100
  };
}
~~~

- [ ] **Step 4: Write failing cache tests**

Use a memory Storage stub. Save at 1000 ms; load at 600999 ms; expire at 601001 ms. Assert Date objects restore, malformed JSON is removed, and blocked sessionStorage reads or writes do not prevent analysis.

- [ ] **Step 5: Implement ten-minute cache**

~~~ts
import type {
  AnalysisInput,
  NormalizedIssue,
  RepoRef
} from "./model";

const TTL = 10 * 60 * 1000;
const keyFor = (ref: RepoRef) => "issueready:v1:" + ref.owner + "/" + ref.repo;

type SerializedInput = Omit<AnalysisInput, "repository" | "issues"> & {
  repository: Omit<AnalysisInput["repository"], "pushedAt"> & {
    pushedAt: string;
  };
  issues: Array<
    Omit<NormalizedIssue, "updatedAt"> & {
      updatedAt: string;
    }
  >;
};

export function loadCachedInput(
  storage: Pick<Storage, "getItem" | "removeItem">,
  ref: RepoRef,
  nowMs: number
): AnalysisInput | null {
  const key = keyFor(ref);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      input: SerializedInput;
    };
    if (nowMs - parsed.savedAt > TTL) {
      storage.removeItem(key);
      return null;
    }
    return {
      ...parsed.input,
      repository: {
        ...parsed.input.repository,
        pushedAt: new Date(parsed.input.repository.pushedAt)
      },
      issues: parsed.input.issues.map((issue) => ({
        ...issue,
        updatedAt: new Date(issue.updatedAt)
      }))
    };
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be disabled by browser privacy settings.
    }
    return null;
  }
}

export function saveCachedInput(
  storage: Pick<Storage, "setItem">,
  ref: RepoRef,
  input: AnalysisInput,
  nowMs: number
): void {
  try {
    storage.setItem(keyFor(ref), JSON.stringify({ savedAt: nowMs, input }));
  } catch {
    // Caching is optional; analysis remains functional without storage.
  }
}

export function clearCachedInput(
  storage: Pick<Storage, "removeItem">,
  ref: RepoRef
): void {
  try {
    storage.removeItem(keyFor(ref));
  } catch {
    // Refresh remains functional even if storage is unavailable.
  }
}
~~~

- [ ] **Step 6: Verify and commit**

Run focused tests, coverage, lint, format check, and build. Commit:

~~~bash
git add src/features/analyzer/model.ts src/features/analyzer/normalize.ts src/features/analyzer/normalize.test.ts src/features/analyzer/cache.ts src/features/analyzer/cache.test.ts
git commit -m "feat: normalize and cache public issue data"
~~~

### Task 5: Implement deterministic scoring

**Files:**
- Create: src/features/analyzer/rules.ts, rules.test.ts
- Modify: src/features/analyzer/model.ts

**Interfaces:**
- Produces: SignalKey, SignalResult, IssueAssessment, AnalysisReport, assessIssue, analyzeRepository.

- [ ] **Step 1: Add output types**

~~~ts
export type SignalKey =
  | "specific-title" | "context" | "bounded-task" | "acceptance"
  | "verification" | "location" | "freshness" | "available";
export interface SignalResult {
  key: SignalKey;
  earned: number;
  available: number;
  passed: boolean;
  evidence: string;
}
export interface IssueAssessment {
  issue: NormalizedIssue;
  score: number;
  classification: Classification;
  signals: SignalResult[];
  missingSignals: SignalKey[];
  warnings: string[];
}
export interface AnalysisReport {
  repository: NormalizedRepository;
  assessments: IssueAssessment[];
  counts: Record<Classification, number>;
  inspectedItemCount: number;
  apiScopeLimit: 100;
}
~~~

- [ ] **Step 2: Write boundary-first failing tests**

With now fixed at 2026-08-10T12:00:00Z, test title lengths 11 and 12; body lengths 119 and 120; every English and Chinese dictionary family; ordered list and checklist; file path, filename, code identifier, and location words; freshness at 90, 180, and 181 days; assigned issue; blocked label; archived and inactive repositories; score 70; missing and unknown prerequisites; all classification counts.

Run focused test. Expected: FAIL.

- [ ] **Step 3: Implement exact rules**

Create these exact versioned dictionaries and helpers:

~~~ts
export const RULESET_VERSION = "1.0.0";

const TERMS = {
  context: ["background", "context", "problem", "motivation", "背景", "上下文", "问题", "动机"],
  task: ["scope", "task", "steps", "implementation", "范围", "任务", "步骤", "实现"],
  acceptance: [
    "acceptance criteria",
    "definition of done",
    "done when",
    "expected result",
    "expected behavior",
    "验收标准",
    "完成标准",
    "预期结果",
    "预期行为"
  ],
  verification: [
    "test",
    "tests",
    "testing",
    "reproduce",
    "reproduction",
    "verify",
    "validation",
    "测试",
    "复现",
    "验证"
  ],
  location: ["file", "component", "module", "page", "文件", "组件", "模块", "页面"]
} as const;

const GENERIC_TITLES = new Set([
  "fix", "update", "help", "bug", "issue", "feature",
  "修复", "更新", "帮助", "问题", "功能"
]);
const BLOCKING_LABELS = new Set(["blocked", "on hold", "wontfix", "waiting"]);
const DAY_MS = 24 * 60 * 60 * 1000;

const containsTerm = (body: string, terms: readonly string[]) => {
  const normalized = body.toLowerCase().replace(/^#+\s*/gm, "");
  return terms.some((term) => normalized.includes(term));
};
const ageInDays = (date: Date, now: Date) =>
  Math.floor((now.getTime() - date.getTime()) / DAY_MS);
~~~

Implement evaluateSignals with exactly these pass conditions:

~~~ts
const visible = stripMarkdown(issue.body);
const normalizedTitle = issue.title
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, "")
  .trim();
const titlePass =
  issue.title.length >= 12 &&
  issue.title.length <= 120 &&
  !GENERIC_TITLES.has(normalizedTitle);
const contextPass =
  visible.length >= 120 || containsTerm(issue.body, TERMS.context);
const taskPass =
  containsTerm(issue.body, TERMS.task) ||
  /^\s*\d+[.)]\s+/m.test(issue.body) ||
  /^\s*[-*]\s+\[[ xX]\]\s+/m.test(issue.body);
const acceptancePass = containsTerm(issue.body, TERMS.acceptance);
const verificationPass = containsTerm(issue.body, TERMS.verification);
const locationPass =
  /(?:^|\s)[\w.-]+\/[\w./-]+/m.test(issue.body) ||
  /\b[\w-]+\.[A-Za-z0-9]{1,8}\b/.test(issue.body) ||
  /\x60[^\x60\n]+\x60/.test(issue.body) ||
  containsTerm(issue.body, TERMS.location);
const issueAge = ageInDays(issue.updatedAt, now);
const freshnessPoints = issueAge <= 90 ? 10 : issueAge <= 180 ? 5 : 0;
~~~

Return all eight SignalResult entries with points: title 10, context 15, bounded task 15, acceptance 20, verification 15, location 10, freshness 10 or 5, availability 5. A signal passes when it earns more than zero except availability, which passes only with zero assignees.

Classification precedence:

~~~ts
const stale =
  repository.archived ||
  ageInDays(issue.updatedAt, now) > 180 ||
  issue.labels.some((label) => BLOCKING_LABELS.has(label));

const ready =
  score >= 70 &&
  ageInDays(repository.pushedAt, now) <= 180 &&
  repository.readme === "present" &&
  repository.contributing === "present" &&
  repository.license === "present";

const classification = stale
  ? "possibly-stale"
  : ready
    ? "ready"
    : "needs-work";
~~~

Return warnings repository-archived, repository-inactive, and prerequisites-incomplete. analyzeRepository maps all candidates and initializes exact zero counts for all classifications before accumulation.

- [ ] **Step 4: Verify and commit**

Run focused tests, coverage, lint, format check, build. Commit:

~~~bash
git add src/features/analyzer/model.ts src/features/analyzer/rules.ts src/features/analyzer/rules.test.ts
git commit -m "feat: assess beginner issue readiness"
~~~

### Task 6: Orchestrate cache, cancellation, and state

**Files:**
- Create: src/features/analyzer/service.ts, service.test.ts
- Create: src/features/analyzer/use-repository-analysis.ts, use-repository-analysis.test.tsx

**Interfaces:**
- Produces: AnalysisPhase, AnalysisService, createAnalysisService, AnalysisState, useRepositoryAnalysis.

- [ ] **Step 1: Write failing service tests**

Assert first call emits validating, reading, assessing and then caches; second call emits validating, assessing without fetching; force true refetches; invalid input throws RepoUrlError; fixed time reaches classification; AbortSignal reaches fetch.

- [ ] **Step 2: Implement service**

~~~ts
import type { AnalysisInput, AnalysisReport, RepoRef, RepoSnapshot } from "./model";
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
        normalized = normalizeSnapshot(await deps.fetchSnapshot(ref, options.signal));
        saveCachedInput(deps.storage, ref, normalized, now.getTime());
      }
      options.onPhase?.("assessing");
      return analyzeRepository(normalized, now);
    }
  };
}
~~~

- [ ] **Step 3: Write failing hook tests**

With renderHook and deferred promises, assert idle to validating to reading to assessing to success; error state; earlier AbortSignal cancellation on second analyze; unmount cancellation; stale first result never replacing second.

- [ ] **Step 4: Implement hook**

~~~ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisReport } from "./model";
import type { AnalysisPhase, AnalysisService } from "./service";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; input: string; phase: AnalysisPhase }
  | { status: "success"; input: string; report: AnalysisReport }
  | { status: "error"; input: string; error: unknown };

export function useRepositoryAnalysis(service: AnalysisService) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);

  const analyze = useCallback(async (input: string, force = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const request = ++requestRef.current;
    setState({ status: "loading", input, phase: "validating" });
    try {
      const report = await service.analyze(input, {
        force,
        signal: controller.signal,
        onPhase: (phase) => {
          if (request === requestRef.current && !controller.signal.aborted) {
            setState({ status: "loading", input, phase });
          }
        }
      });
      if (request === requestRef.current && !controller.signal.aborted) {
        setState({ status: "success", input, report });
      }
    } catch (error) {
      if (
        request === requestRef.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) setState({ status: "error", input, error });
    }
  }, [service]);

  useEffect(() => () => controllerRef.current?.abort(), []);
  return { state, analyze };
}
~~~

- [ ] **Step 5: Verify and commit**

Run service and hook tests, full coverage, lint, format check, build. Commit:

~~~bash
git add src/features/analyzer/service.ts src/features/analyzer/service.test.ts src/features/analyzer/use-repository-analysis.ts src/features/analyzer/use-repository-analysis.test.tsx
git commit -m "feat: orchestrate cancellable repository analysis"
~~~

### Task 7: Build the bilingual visual foundation and landing flow

**Files:**
- Create: docs/ui-design-system.md
- Create: src/i18n.ts, src/i18n.test.ts
- Create: src/components/repo-form.tsx, repo-form.test.tsx
- Create: src/components/language-switcher.tsx, language-switcher.test.tsx
- Create: src/components/status-announcer.tsx
- Create: src/styles/tokens.css, global.css, app.css
- Modify: src/App.tsx, src/App.test.tsx, src/main.tsx

**Interfaces:**
- Consumes: Language, createAnalysisService, repoRefFromSearch, toShareSearch, useRepositoryAnalysis.
- Produces: Messages, RepoForm, LanguageSwitcher, StatusAnnouncer, responsive app shell.

- [ ] **Step 1: Apply required design skills**

Read both complete files before UI edits:

~~~bash
sed -n '1,9999p' /Users/jojo/.codex/skills/ui-ux-pro-max/SKILL.md
sed -n '1,9999p' /Users/jojo/.codex/skills/elevate-web-design/SKILL.md
~~~

Follow their referenced UI instructions and searches. Record the chosen product type, style, palette, typography, spacing, accessibility, and motion in docs/ui-design-system.md. Preserve these approved constraints:

- editorial developer-tool direction;
- paper #F6F5F0, ink #172033, cobalt #3159E8;
- ready #16794A, warning #A15C00, stale #B63636;
- system fonts and no remote assets;
- maximum content width 1120 px;
- 3 px focus ring;
- 160 ms maximum non-essential motion;
- complete prefers-reduced-motion override.

If a skill recommends a conflicting feature, the approved IssueReady specification wins.

- [ ] **Step 2: Write failing bilingual-copy tests**

Assert that every key of messages.en exists in messages.zh-CN, every classification and SignalKey has copy, both contain IssueReady, count functions return correct singular/plural Chinese and English output, and rate-limit functions include the supplied local time.

Use this exact Messages interface:

~~~ts
export interface Messages {
  brand: string;
  tagline: string;
  intro: string;
  languageLabel: string;
  english: string;
  chinese: string;
  formLabel: string;
  formPlaceholder: string;
  formHelp: string;
  submit: string;
  loading: Record<"validating" | "reading" | "assessing", string>;
  examples: string;
  privacy: string;
  methodology: string;
  refresh: string;
  openGitHub: string;
  copyChecklist: string;
  copied: string;
  copyFailed: string;
  all: string;
  scoreLabel: string;
  repositoryFiles: string;
  readme: string;
  contributing: string;
  license: string;
  classifications: Record<Classification, string>;
  signals: Record<SignalKey, string>;
  fileStates: Record<FileState, string>;
  warnings: Record<
    "repository-archived" | "repository-inactive" | "prerequisites-incomplete",
    string
  >;
  errors: Record<
    "invalid-url" | "not-found" | "rate-limit" | "network" | "api" | "unknown",
    string
  >;
  emptyTitle: string;
  emptyBody: string;
  searchedLabels: string;
  scopeNotice: string;
  resultCount: (count: number) => string;
  rateLimitReset: (time: string) => string;
}
~~~

Run focused tests. Expected: FAIL because i18n.ts is absent.

- [ ] **Step 3: Implement the complete copy matrix**

Use this complete static copy matrix:

| Key | English | Simplified Chinese |
| --- | --- | --- |
| brand | IssueReady | IssueReady |
| tagline | Are your beginner issues actually ready? | 你的新手任务真的准备好了吗？ |
| intro | Check clarity, scope, verification, freshness, and contributor prerequisites before someone starts. | 在贡献者开始之前，检查任务是否具备清晰背景、明确范围、验证方法、有效时效和参与条件。 |
| formLabel | Public GitHub repository | 公开 GitHub 仓库 |
| formPlaceholder | https://github.com/owner/repository | https://github.com/owner/repository |
| languageLabel | Language | 语言 |
| english | English | 英文 |
| chinese | Simplified Chinese | 简体中文 |
| formHelp | Paste the full URL of a public github.com repository. | 粘贴公开 github.com 仓库的完整地址。 |
| submit | Analyze repository | 分析仓库 |
| examples | Try an example | 查看示例 |
| privacy | Read-only. No login. Data stays between your browser and GitHub. | 只读、无需登录；数据仅在你的浏览器与 GitHub 之间传输。 |
| methodology | How scoring works | 评分方法 |
| refresh | Refresh public data | 刷新公开数据 |
| openGitHub | Open on GitHub | 在 GitHub 打开 |
| copyChecklist | Copy improvement checklist | 复制完善清单 |
| copied | Copied | 已复制 |
| copyFailed | Could not copy | 复制失败 |
| all | All issues | 全部任务 |
| scoreLabel | Readiness score | 准备度得分 |
| repositoryFiles | Contributor prerequisites | 参与前提 |
| readme | README | README |
| contributing | Contribution guide | 贡献指南 |
| license | License | 许可证 |
| emptyTitle | No beginner-labelled issues found | 未找到带新手标签的任务 |
| emptyBody | Add a supported label to a bounded issue, then run the check again. | 为范围明确的任务添加受支持标签，然后重新检查。 |
| searchedLabels | Labels checked | 已检查标签 |
| scopeNotice | IssueReady inspected only the 100 most recently updated open items returned by GitHub and removed pull requests locally. Older issues may be omitted. | IssueReady 仅检查 GitHub 返回的最近更新 100 个开放条目，并在本地排除拉取请求；更早的任务可能未包含。 |

Classification values: Ready / 可以开始; Needs work / 需要完善; Possibly stale / 可能已过期.

Signal values: Specific title / 标题明确; Context / 问题背景; Bounded task / 任务范围; Acceptance criteria / 验收标准; Verification / 验证方法; Location hint / 位置提示; Freshness / 更新时间; Available to claim / 可以领取.

File states: Present / 已提供; Missing / 缺失; Unavailable / 暂时无法读取.

Loading values: Validating repository / 正在验证仓库; Reading public GitHub data / 正在读取 GitHub 公开数据; Assessing beginner issues / 正在评估新手任务.

Warning values:

- repository-archived: Repository is archived / 仓库已归档
- repository-inactive: No repository push in more than 180 days / 仓库超过 180 天没有推送
- prerequisites-incomplete: Contributor prerequisites are incomplete or unavailable / 参与前提缺失或暂时无法读取

Error values:

- invalid-url: Enter a public GitHub repository URL such as https://github.com/ossf/scorecard / 请输入公开 GitHub 仓库地址，例如 https://github.com/ossf/scorecard
- not-found: GitHub could not find this public repository. It may be missing or private. / GitHub 找不到这个公开仓库；它可能不存在或属于私有仓库。
- rate-limit: GitHub request limit reached. / 已达到 GitHub 请求限制。
- network: GitHub could not be reached. Check your connection and retry. / 无法连接 GitHub，请检查网络后重试。
- api: GitHub returned an unexpected response. / GitHub 返回了意外响应。
- unknown: IssueReady could not complete the check. / IssueReady 无法完成检查。

Implement resultCount as count + issue/issues in English and count + 个任务 in Chinese. Implement rateLimitReset as Try again after + time and 请在 + time + 后重试.

- [ ] **Step 4: Write failing RepoForm tests**

Test associated label, submitted value, empty validation, firstcontributions/first-contributions example, ossf/scorecard example, loading disablement, and privacy text. In language-switcher.test.tsx, assert English and Simplified Chinese buttons, aria-pressed state, and onChange callback.

RepoForm props:

~~~ts
interface RepoFormProps {
  language: Language;
  loading: boolean;
  defaultValue?: string;
  onSubmit: (input: string) => void;
}
~~~

- [ ] **Step 5: Implement form, language switcher, and status**

Use a native form, controlled URL input, visible label, help text via aria-describedby, submit button, and two type=button examples. LanguageSwitcher accepts language and onChange, uses two native buttons with aria-pressed, and never relies on flags alone. StatusAnnouncer accepts AnalysisState and language and renders one aria-live polite region using state.phase; do not move focus while loading.

- [ ] **Step 6: Compose the app shell**

Create one module-level service. Initialize language from navigator.language beginning with zh, otherwise en. Render LanguageSwitcher and update document.documentElement.lang whenever the selection changes. Parse window.location.search once and auto-analyze a valid shared slug as a canonical GitHub URL. After successful manual submission, use history.replaceState with toShareSearch. Render minimal semantic success, empty, and error status sections until Tasks 8 and 9 replace those sections.

- [ ] **Step 7: Implement CSS tokens and layout**

tokens.css defines exact colors above; spacing 4, 8, 12, 16, 24, 32, 48, 64; radii 6, 12, 999; content width 1120; motion 160 ms. global.css defines box sizing, body defaults, inherited controls, 3 px focus-visible, word wrapping, and reduced motion. app.css uses one column by default and a 12-column grid at 800 px. Every interactive target is at least 44 px.

Import all style files from main.tsx.

- [ ] **Step 8: Verify and commit**

Run i18n, form, and App tests; coverage, lint, format check, build. Commit:

~~~bash
git add docs/ui-design-system.md src/i18n.ts src/i18n.test.ts src/components/repo-form.tsx src/components/repo-form.test.tsx src/components/language-switcher.tsx src/components/language-switcher.test.tsx src/components/status-announcer.tsx src/styles src/App.tsx src/App.test.tsx src/main.tsx
git commit -m "feat: add bilingual IssueReady landing experience"
~~~

### Task 8: Render transparent repository reports

**Files:**
- Create: src/components/repository-summary.tsx, repository-summary.test.tsx
- Create: src/components/issue-filters.tsx, issue-filters.test.tsx
- Create: src/components/issue-card.tsx, issue-card.test.tsx
- Create: src/components/report-view.tsx, report-view.test.tsx

**Interfaces:**
- Consumes: AnalysisReport, IssueAssessment, Classification, Language, Messages.
- Produces: RepositorySummary, IssueFilters, IssueCard, ReportView.

- [ ] **Step 1: Write failing repository-summary tests**

Assert repository link and description; archived and strict greater-than-180-day inactivity warnings; README, CONTRIBUTING, and license states; and unknown never appearing as missing.

- [ ] **Step 2: Implement summary and filters**

RepositorySummary accepts report, language, now. Render a definition list for the three prerequisite files. IssueFilters accepts:

~~~ts
interface IssueFiltersProps {
  counts: AnalysisReport["counts"];
  active: Classification | "all";
  language: Language;
  onChange: (value: Classification | "all") => void;
}
~~~

Use native buttons with aria-pressed and visible count text. Test mouse and keyboard activation.

- [ ] **Step 3: Write failing IssueCard tests**

Use one fixture with passed and failed signals. Assert original issue link, score out of 100, text status independent of color, all eight rows, missing-only checklist, warning explanations, escaped remote title, and rel=noopener noreferrer.

- [ ] **Step 4: Implement IssueCard**

Render an article with heading, labels, update date, assignee state, status, score, eight evidence rows, warnings, and missing checklist. Never render issue.body. React-escaped title, labels, and repository description are the only remote text shown.

- [ ] **Step 5: Write failing ReportView tests**

Assert all counts, default all filter, filtered cards, deterministic sort, scope disclosure, methodology link, and refresh callback.

Sort order is ready, needs-work, possibly-stale; then score descending; then issue number ascending.

- [ ] **Step 6: Implement ReportView**

ReportView owns only filter state and accepts report, language, onRefresh, and now. Pass now to RepositorySummary so its inactivity boundary is testable. Compose summary, filters, cards, refresh, the exact scope notice, and an in-page methodology summary with id methodology. Link to #methodology so the deployed static site never points at an unserved repository Markdown path. The summary lists the eight weights, classification precedence, and ruleset version; Task 12 publishes the longer repository document.

- [ ] **Step 7: Verify and commit**

Run report component tests, coverage, lint, format check, build. Commit:

~~~bash
git add src/components/repository-summary.tsx src/components/repository-summary.test.tsx src/components/issue-filters.tsx src/components/issue-filters.test.tsx src/components/issue-card.tsx src/components/issue-card.test.tsx src/components/report-view.tsx src/components/report-view.test.tsx
git commit -m "feat: render explainable issue readiness reports"
~~~

### Task 9: Complete empty, error, clipboard, and refresh flows

**Files:**
- Create: src/components/empty-state.tsx, empty-state.test.tsx
- Create: src/components/error-panel.tsx, error-panel.test.tsx
- Create: src/components/copy-button.tsx, copy-button.test.tsx
- Modify: src/App.tsx, App.test.tsx
- Modify: src/components/report-view.tsx
- Modify: src/components/issue-card.tsx, issue-card.test.tsx

**Interfaces:**
- Consumes: RepoUrlError, GitHubApiError, AnalysisState, report counts, Messages.
- Produces: every approved boundary state and force refresh.

- [ ] **Step 1: Write failing clipboard and empty-state tests**

Mock navigator.clipboard.writeText. Assert idle, copied, two-second reset, localized failure, exact searched labels, and deterministic templates.

English template:

~~~md
## Background

Explain why this change matters.

## Task

- [ ] Describe the bounded change.

## Acceptance criteria

- [ ] State the observable result.

## Verification

Explain how a contributor and reviewer can verify the change.
~~~

Create equivalent natural Simplified Chinese headings and instructions.

- [ ] **Step 2: Implement CopyButton, EmptyState, and issue checklist copying**

CopyButton accepts text, idleLabel, copiedLabel, errorLabel; uses aria-live; clears timeout on unmount. EmptyState shows normalized candidate labels and copies only the selected deterministic template. IssueCard uses CopyButton to copy a deterministic Markdown checklist containing only assessment.missingSignals in display order; it never copies or rewrites the remote issue body. Extend IssueCard tests to assert passed signals are absent from copied text.

- [ ] **Step 3: Write failing error tests**

Cover RepoUrlError, not-found without guessing private or deleted, rate-limit with selected-locale reset time, network retry, API status, and unknown error without stack leakage.

- [ ] **Step 4: Implement ErrorPanel**

Use instanceof checks. Offer retry except for invalid URL. Link rate limits to https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api.

- [ ] **Step 5: Replace interim App status sections**

Render ReportView for candidate results, EmptyState for zero candidates, ErrorPanel for errors. Force refresh calls analyze(previousInput, true). Update share query with history.replaceState only after success. Add focused App tests for every route.

- [ ] **Step 6: Verify and commit**

Run all UI tests, coverage, lint, format check, build. Commit:

~~~bash
git add src/App.tsx src/App.test.tsx src/components/empty-state.tsx src/components/empty-state.test.tsx src/components/error-panel.tsx src/components/error-panel.test.tsx src/components/copy-button.tsx src/components/copy-button.test.tsx src/components/report-view.tsx src/components/issue-card.tsx src/components/issue-card.test.tsx
git commit -m "feat: complete report boundary experiences"
~~~

### Task 10: Add browser accessibility and responsive verification

**Files:**
- Create: playwright.config.ts
- Create: e2e/fixtures/repository.json, community.json, issues.json
- Create: e2e/issueready.spec.ts

**Interfaces:**
- Consumes: final UI and GitHub response shapes.
- Produces: deterministic Chromium and axe verification.

- [ ] **Step 1: Configure Playwright**

~~~ts
import { defineConfig, devices } from "@playwright/test";

const localPnpm =
  "/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm";
const pnpm = process.env.CI ? "pnpm" : localPnpm;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }
  ],
  webServer: {
    command: pnpm + " build && " + pnpm + " preview --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI
  }
});
~~~

- [ ] **Step 2: Create exact stable fixtures**

repository.json: full_name issueready/example, archived false, pushed_at 2026-08-09T00:00:00Z, open_issues_count 3, and all model fields.

community.json: README, CONTRIBUTING, license all present.

issues.json: issue 1 is a recent ready good first issue with English context, checklist, acceptance, verification, src/app.ts, and no assignee; issue 2 is short help wanted and needs-work; item 3 contains pull_request and must disappear.

- [ ] **Step 3: Write failing end-to-end tests**

Use page.route for all three endpoints. Cover landing axe scan; paste and analyze; one ready plus one needs-work; keyboard-only form and filter; mobile width with no document overflow; shared query; 404; rate-limit; community partial failure; hostile remote text; force refresh issuing exactly three additional requests.

Axe assertion:

~~~ts
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  .analyze();

expect(
  results.violations.filter(
    (item) => item.impact === "serious" || item.impact === "critical"
  )
).toEqual([]);
~~~

Run test:e2e. Expected: initial integration or accessibility failures.

- [ ] **Step 4: Fix only evidence-backed failures**

Fix semantics, labels, focus order, contrast, wrapping, and target size. Never suppress axe rules. Add component regression tests for each fix.

- [ ] **Step 5: Verify and commit**

Install Chromium once if absent:

~~~bash
/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm exec playwright install chromium
~~~

Run test:e2e, coverage, lint, format check, build. Commit:

~~~bash
git add playwright.config.ts e2e package.json pnpm-lock.yaml src
git commit -m "test: verify accessible browser flows"
~~~

### Task 11: Enforce security, performance, CI, and Pages

**Files:**
- Create: scripts/check-bundle-size.mjs, check-bundle-size.test.mjs
- Create: lighthouserc.cjs
- Create: .github/workflows/ci.yml, deploy-pages.yml
- Create: .github/dependabot.yml
- Modify: package.json, pnpm-lock.yaml, vite.config.ts, .gitignore

**Interfaces:**
- Produces: 204800-byte compressed JS gate, four Lighthouse 0.95 gates, CSP, CI, Pages artifact.

- [ ] **Step 1: Write failing bundle-size tests**

Export gzipJavaScriptBytes(directory) and enforceBudget(bytes, limit). In a temporary assets directory create two JS files, assert their gzip sum, assert non-JS exclusion, and assert enforceBudget throws above 204800.

Run Node test. Expected: FAIL.

- [ ] **Step 2: Implement the size gate**

Use node:fs, node:path, node:zlib. Sum .js files only under dist/assets. Print measured bytes. Set exit code 1 above 204800. Add package scripts check:bundle and check:lighthouse. Add @lhci/cli 0.15.1, install, and add .lighthouseci to .gitignore.

- [ ] **Step 3: Inject a strict CSP into production only**

Add a small Vite Plugin to vite.config.ts. Development must omit the meta policy so Vite can inject HMR styles; production preview and GitHub Pages must contain it.

~~~ts
import type { Plugin } from "vite";

const cspContent =
  "default-src 'self'; " +
  "connect-src https://api.github.com; " +
  "img-src 'self' data:; " +
  "style-src 'self'; " +
  "script-src 'self'; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "upgrade-insecure-requests";

const productionCsp = (): Plugin => ({
  name: "issueready-production-csp",
  transformIndexHtml: {
    order: "post",
    handler(_html, context) {
      if (!context.bundle) return [];
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: cspContent
          },
          injectTo: "head"
        }
      ];
    }
  }
});
~~~

Add productionCsp() to plugins after react(). After pnpm build, assert dist/index.html contains Content-Security-Policy and does not contain unsafe-inline or unsafe-eval. Do not add inline scripts/styles, remote fonts, or remote images.

- [ ] **Step 4: Configure Lighthouse**

~~~js
module.exports = {
  ci: {
    collect: { staticDistDir: "./dist", numberOfRuns: 3 },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci"
    }
  }
};
~~~

Run build, size gate, and Lighthouse. Fix measured failures without weakening thresholds.

- [ ] **Step 5: Create CI workflow**

Create .github/workflows/ci.yml exactly around this job:

~~~yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: pnpm/action-setup@v6.0.10
        with:
          version: 11.16.0
      - uses: actions/setup-node@v7.0.0
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test:coverage
      - run: pnpm build
      - run: pnpm check:bundle
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e --project=desktop-chromium
      - run: pnpm check:lighthouse
~~~

- [ ] **Step 6: Create Pages workflow**

Create .github/workflows/deploy-pages.yml:

~~~yaml
name: Deploy Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: pnpm/action-setup@v6.0.10
        with:
          version: 11.16.0
      - uses: actions/setup-node@v7.0.0
        with:
          node-version: 24
          cache: pnpm
      - uses: actions/configure-pages@v6.0.0
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e --project=desktop-chromium
      - run: pnpm check:lighthouse
      - run: pnpm build
        env:
          ISSUEREADY_BASE_PATH: /${{ github.event.repository.name }}/
      - run: pnpm check:bundle
      - uses: actions/upload-pages-artifact@v5.0.0
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v5.0.0
~~~

- [ ] **Step 7: Configure Dependabot**

Create .github/dependabot.yml:

~~~yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
~~~

GitHub Dependabot names the pnpm-compatible JavaScript ecosystem npm; pnpm-lock.yaml remains the lockfile source.

- [ ] **Step 8: Verify and commit**

Run local commands in CI order plus git diff --check. Expected: all pass and compressed JS is at most 204800 bytes.

~~~bash
git add scripts lighthouserc.cjs .github package.json pnpm-lock.yaml vite.config.ts .gitignore
git commit -m "ci: enforce secure static release quality"
~~~

### Task 12: Add governance and publish v0.1.0

**Files:**
- Create: README.md, README.zh-CN.md
- Create: LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- Create: docs/methodology.md, docs/architecture.md
- Create: .github/ISSUE_TEMPLATE/bug-report.yml, feature-request.yml, config.yml
- Create: .github/PULL_REQUEST_TEMPLATE.md
- Create: src/repository-files.test.ts

**Interfaces:**
- Consumes: final behavior, RULESET_VERSION, architecture, scripts.
- Produces: MIT-licensed public repository and release.

- [ ] **Step 1: Write a failing repository-file test**

Use Vitest Node environment and node:fs. Assert every listed file exists; English README links Chinese and methodology; Chinese links English; methodology names 1.0.0 and all eight signals; SECURITY points to private vulnerability reporting and rejects public security issues.

Run focused test. Expected: FAIL.

- [ ] **Step 2: Write complete user documentation**

Both READMEs contain equivalent value proposition, usage, limits, privacy, local setup, exact pnpm commands, deployment, methodology, contribution, security, and MIT license sections.

methodology.md publishes candidate/blocking label normalization, dictionaries, generic titles, eight weights, prerequisites, precedence, 90/180-day boundaries, top-100 limit, rate limit, and ruleset 1.0.0.

architecture.md documents three URLs, module boundaries, cache TTL, no-backend flow, CSP, cancellation, and threat boundaries.

- [ ] **Step 3: Add governance**

Use full MIT text with year 2026 and IssueReady contributors. Use Contributor Covenant 2.1. SECURITY instructs Security tab then Report a vulnerability, never a public issue. CONTRIBUTING requires Node 24, pnpm 11, focused scope, full pnpm check, Playwright for UI, bilingual parity, and methodology updates for rule changes.

- [ ] **Step 4: Add structured templates**

bug-report fields: description, reproduction URL, expected, actual, browser, no-credentials confirmation.

feature-request fields: problem, outcome, user, scope fit, alternatives.

config disables blank issues and links security to the Security tab.

PR template requires summary, user impact, tests, bilingual copy review, methodology impact, UI accessibility evidence, and confirmation that no token, backend, analytics, or remote issue HTML was introduced.

- [ ] **Step 5: Verify and commit local release**

Run repository test, coverage, lint, format check, build, size, Playwright, Lighthouse, and git diff --check. Inspect git status. Expected: only the known unrelated DeepSeek spec remains untracked.

~~~bash
git add README.md README.zh-CN.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md docs/methodology.md docs/architecture.md .github/ISSUE_TEMPLATE .github/PULL_REQUEST_TEMPLATE.md src/repository-files.test.ts
git commit -m "docs: prepare IssueReady for open source"
~~~

- [ ] **Step 6: Gate remote writes on authentication**

~~~bash
gh auth status
~~~

Expected at plan creation: FAIL. Stop and ask the user to complete gh auth login. Do not automate browser login, read cookies, or create under an unknown account.

- [ ] **Step 7: Create and configure public repository after auth**

~~~bash
ISSUEREADY_OWNER="$(gh api user --jq .login)"
git remote get-url origin
~~~

If origin is absent:

~~~bash
gh repo create issueready --public --source=. --remote=origin --push --description "Check whether beginner-labelled GitHub issues are clear, current, and actionable."
gh repo edit "$ISSUEREADY_OWNER/issueready" --add-topic open-source --add-topic github --add-topic good-first-issue --add-topic maintainer-tools
gh api --method PUT "repos/$ISSUEREADY_OWNER/issueready/private-vulnerability-reporting"
~~~

If origin exists, verify it belongs to the authenticated owner; never replace an unrelated remote.

- [ ] **Step 8: Verify Pages, tag, and release**

~~~bash
ISSUEREADY_OWNER="$(gh api user --jq .login)"
gh run list --repo "$ISSUEREADY_OWNER/issueready" --limit 5
ISSUEREADY_PAGES_URL="https://$ISSUEREADY_OWNER.github.io/issueready/"
gh repo edit "$ISSUEREADY_OWNER/issueready" --homepage "$ISSUEREADY_PAGES_URL"
curl -fsS "$ISSUEREADY_PAGES_URL" >/dev/null
git tag -a v0.1.0 -m "IssueReady v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --repo "$ISSUEREADY_OWNER/issueready" --title "IssueReady v0.1.0" --notes "First public release: bilingual, read-only, deterministic readiness reports for beginner-labelled GitHub issues."
~~~

Do not create artificial good-first-issue tickets. Add them only when genuine bounded work is discovered.

- [ ] **Step 9: Final acceptance**

From a clean browser: open Pages; analyze IssueReady; verify no login/token; verify at most three GitHub requests; open shared query; switch languages; verify keyboard focus; verify license, contributing, code of conduct, security, passing workflows, Pages, and v0.1.0 release. Record actual Pages and release URLs in the handoff.
