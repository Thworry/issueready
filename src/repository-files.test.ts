// @vitest-environment node
/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

const requiredFiles = [
  "README.md",
  "README.zh-CN.md",
  "CHANGELOG.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "docs/methodology.md",
  "docs/architecture.md",
  "playwright.config.ts",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-pages.yml",
  ".github/ISSUE_TEMPLATE/bug-report.yml",
  ".github/ISSUE_TEMPLATE/feature-request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md"
] as const;

function repositoryFile(path: (typeof requiredFiles)[number]): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("public repository files", () => {
  it.each(requiredFiles)("includes %s", (path) => {
    expect(existsSync(resolve(root, path))).toBe(true);
  });

  it("cross-links the equivalent English and Chinese documentation", () => {
    expect(repositoryFile("README.md")).toContain("README.zh-CN.md");
    expect(repositoryFile("README.md")).toContain("docs/methodology.md");
    expect(repositoryFile("README.zh-CN.md")).toContain("README.md");
    expect(repositoryFile("README.zh-CN.md")).toContain("docs/methodology.md");
    expect(repositoryFile("README.md")).toContain("CHANGELOG.md");
    expect(repositoryFile("README.zh-CN.md")).toContain("CHANGELOG.md");
  });

  it("publishes the current package version in the changelog", () => {
    const packageManifest = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8")
    ) as { version?: unknown };
    const changelog = repositoryFile("CHANGELOG.md");

    expect(packageManifest.version).toBe("0.1.1");
    expect(changelog).toContain("## 0.1.1 - 2026-08-26");
  });

  it("publishes ruleset 1.0.0 and all eight scoring signals", () => {
    const methodology = repositoryFile("docs/methodology.md");

    expect(methodology).toContain("1.0.0");
    for (const signal of [
      "Specific title",
      "Context",
      "Bounded task",
      "Acceptance criteria",
      "Verification",
      "Location hint",
      "Freshness",
      "Available to claim"
    ]) {
      expect(methodology).toContain(signal);
    }
  });

  it("routes security reports to private vulnerability reporting only", () => {
    const security = repositoryFile("SECURITY.md");

    expect(security).toContain("Security");
    expect(security).toContain("Report a vulnerability");
    expect(security).toMatch(/do not (?:open|file|report).+public issue/i);
  });

  it("keeps Playwright portable and runs every browser project in automation", () => {
    const playwrightConfig = repositoryFile("playwright.config.ts");

    expect(playwrightConfig).not.toMatch(/\/Users\/|localPnpm/);
    expect(playwrightConfig).toContain(
      'command: "pnpm build && pnpm preview --host 127.0.0.1"'
    );

    for (const workflowPath of [
      ".github/workflows/ci.yml",
      ".github/workflows/deploy-pages.yml"
    ] as const) {
      const workflow = repositoryFile(workflowPath);

      expect(workflow).toMatch(/^\s*- run: pnpm test:e2e\s*$/m);
      expect(workflow).not.toContain("test:e2e --project=");
    }

    expect(repositoryFile(".github/workflows/ci.yml")).toMatch(
      /^\s*- run: pnpm test:scripts\s*$/m
    );

    const contributing = repositoryFile("CONTRIBUTING.md");
    expect(contributing).toContain("available on `PATH`");
    expect(contributing).toContain("desktop and mobile Chromium projects");
  });
});
